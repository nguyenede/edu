import JSZip from 'jszip';
import { convertOmmlToLatex } from '../examStructureParser';
import { parseMtefBinaryToLatex, cleanLeakedOleGarbage } from '../mtefParser';
import { replaceHomoglyphs } from './patterns';

export interface DocxPreprocessResult {
  text: string;
  images: Map<string, string>; // rId / imageKey -> base64 Data URL
  mathCount: number;
  tableCount: number;
}

export class DocxPreprocessor {
  /**
   * Chuẩn hóa văn bản Unicode, loại bỏ các ký tự ẩn, chuyển ký tự đồng dạng (Homoglyphs),
   * làm sạch các anchor tag từ Word export và chuẩn hóa khoảng trắng
   */
  public static normalizeText(text: string): string {
    if (!text) return '';
    let result = text
      .normalize('NFC')
      .replace(/<a id="[^"]+"><\/a>/g, '') // Bỏ anchor tags tự sinh từ Word
      .replace(/\u00A0/g, ' ') // Non-breaking space
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[\u201C\u201D]/g, '"') // Smart double quotes
      .replace(/[\u2018\u2019]/g, "'") // Smart single quotes
      .replace(/[\u2013\u2014]/g, '-'); // En-dash & Em-dash

    // Chuyển ký tự đồng dạng và xóa zero-width characters (TVCN_CHAR)
    result = replaceHomoglyphs(result);

    return result;
  }

  /**
   * Trích xuất và tiền xử lý toàn diện file Word (.docx) sang văn bản Azota chuẩn hóa
   * Chuyển đổi công thức OMML/MathType sang LaTeX, trích xuất ảnh và bảng
   */
  public static async preprocessDocx(fileOrBuffer: File | Blob | ArrayBuffer | Uint8Array): Promise<DocxPreprocessResult> {
    let buffer: ArrayBuffer;
    if (fileOrBuffer instanceof ArrayBuffer) {
      buffer = fileOrBuffer;
    } else if (fileOrBuffer instanceof Uint8Array) {
      buffer = fileOrBuffer.buffer.slice(fileOrBuffer.byteOffset, fileOrBuffer.byteOffset + fileOrBuffer.byteLength) as ArrayBuffer;
    } else if (typeof (fileOrBuffer as any).arrayBuffer === 'function') {
      buffer = await (fileOrBuffer as any).arrayBuffer();
    } else {
      buffer = (fileOrBuffer as unknown) as ArrayBuffer;
    }

    const zip = await JSZip.loadAsync(buffer);
    const images = new Map<string, string>();
    let mathCount = 0;
    let tableCount = 0;

    // 1. Đọc và trích xuất quan hệ tài liệu (word/_rels/document.xml.rels)
    const relsFile = zip.file('word/_rels/document.xml.rels');
    const relsMap = new Map<string, string>();
    if (relsFile) {
      const relsXml = await relsFile.async('text');
      const relMatches = Array.from(relsXml.matchAll(/<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g));
      relMatches.forEach((m: RegExpMatchArray) => {
        relsMap.set(m[1], m[2]);
      });
    }

    // 2. Đọc nội dung chính word/document.xml
    const docFile = zip.file('word/document.xml');
    if (!docFile) {
      return { text: '', images, mathCount, tableCount };
    }

    let docXml = await docFile.async('text');

    // 3. Trích xuất chỉ những hình ảnh thực sự được nhúng trong tài liệu (qua <a:blip r:embed="..."/>)
    const referencedImgRIds = new Set<string>();
    const blipMatches = Array.from(docXml.matchAll(/<a:blip\b[^>]*r:embed="([^"]+)"/g));
    blipMatches.forEach((m) => {
      referencedImgRIds.add(m[1]);
    });

    const imgIdList = Array.from(referencedImgRIds);
    for (let i = 0; i < imgIdList.length; i++) {
      const rId = imgIdList[i];
      const target = relsMap.get(rId);
      if (target) {
        const zipPath = target.startsWith('word/') ? target : `word/${target}`;
        const fileEntry = zip.file(zipPath);
        if (fileEntry) {
          const lower = zipPath.toLowerCase();
          let mime = 'image/png';
          if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mime = 'image/jpeg';
          else if (lower.endsWith('.gif')) mime = 'image/gif';
          else if (lower.endsWith('.svg')) mime = 'image/svg+xml';
          else if (lower.endsWith('.webp')) mime = 'image/webp';

          try {
            const base64 = await fileEntry.async('base64');
            const dataUri = `data:${mime};base64,${base64}`;
            images.set(rId, dataUri);
          } catch (e) {
            console.warn('Could not extract image from docx:', zipPath, e);
          }
        }
      }
    }

    // 4. Tiền xử lý OLE Objects (MathType Equation binaries)
    const oleLatexMap = new Map<string, string>();
    const relsEntries = Array.from(relsMap.entries());
    for (let e = 0; e < relsEntries.length; e++) {
      const [rId, target] = relsEntries[e];
      const zipPath = target.startsWith('word/') ? target : `word/${target}`;
      const oleFile = zip.file(zipPath);
      if (oleFile) {
        try {
          const oleBuf = await oleFile.async('arraybuffer');
          const latex = parseMtefBinaryToLatex(oleBuf);
          if (latex && latex.trim().length > 0) {
            oleLatexMap.set(rId, latex.trim());
          }
        } catch (err) {
          console.warn('MathType OLE parsing error:', zipPath, err);
        }
      }
    }

    // Thay thế toàn bộ <w:object> chính xác theo từng thẻ đối tượng (tránh regex nuốt hàng loạt XML)
    docXml = docXml.replace(/<w:object\b[\s\S]*?<\/w:object>/g, (objXml) => {
      const oleMatch = objXml.match(/<o:OLEObject\b[^>]*\br:id=["']([^"']+)["']/);
      if (oleMatch) {
        const rId = oleMatch[1];
        const latex = oleLatexMap.get(rId);
        if (latex) {
          mathCount++;
          return ` [!m:${latex}] `;
        }
      }
      return '';
    });

    // 5. Chuyển đổi công thức OMML (<m:oMath> hoặc <m:oMathPara>) sang [!m:latex]
    docXml = docXml.replace(/<m:oMathPara\b[\s\S]*?<\/m:oMathPara>/g, (omml) => {
      mathCount++;
      const latex = convertOmmlToLatex(omml).replace(/^\$|\$$/g, '');
      return ` [!m:${latex}] `;
    });

    docXml = docXml.replace(/<m:oMath\b[\s\S]*?<\/m:oMath>/g, (omml) => {
      mathCount++;
      const latex = convertOmmlToLatex(omml).replace(/^\$|\$$/g, '');
      return ` [!m:${latex}] `;
    });

    // 6. Xử lý ảnh nhúng qua <a:blip r:embed="rId..."/>
    docXml = docXml.replace(/<a:blip\b[^>]*r:embed="([^"]+)"[^>]*>/g, (match, rId) => {
      const imgUri = images.get(rId);
      if (imgUri) {
        return ` [!img:${imgUri}] `;
      }
      return match;
    });

    // 7. Chuyển đổi bảng <w:tbl> sang Markdown table [!* ... *!]
    docXml = docXml.replace(/<w:tbl\b[\s\S]*?<\/w:tbl>/g, (tbl) => {
      tableCount++;
      const rowMatches = Array.from(tbl.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g));
      const rows: string[][] = [];

      for (let rIdx = 0; rIdx < rowMatches.length; rIdx++) {
        const r = rowMatches[rIdx];
        const cellMatches = Array.from(r[0].matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g));
        const cells: string[] = [];
        for (let cIdx = 0; cIdx < cellMatches.length; cIdx++) {
          const c = cellMatches[cIdx];
          const textMatches = Array.from(c[0].matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)).map((t: RegExpMatchArray) => t[1]);
          cells.push(textMatches.join('').trim());
        }
        if (cells.length > 0) {
          rows.push(cells);
        }
      }

      if (rows.length === 0) return '';

      const maxCols = Math.max(...rows.map((r) => r.length));
      const mdLines: string[] = [];
      const headerRow = rows[0];
      mdLines.push(`| ${headerRow.concat(Array(maxCols - headerRow.length).fill('')).join(' | ')} |`);
      mdLines.push(`| ${Array(maxCols).fill('---').join(' | ')} |`);

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        mdLines.push(`| ${row.concat(Array(maxCols - row.length).fill('')).join(' | ')} |`);
      }

      return `\n[!*\n${mdLines.join('\n')}\n*!]\n`;
    });

    // 8. Bóc tách từng đoạn văn bản (<w:p>) và phân tích thuộc tính định dạng (In đậm / Gạch chân / Màu sắc)
    const pMatches = Array.from(docXml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g));
    const parsedParagraphs: string[] = [];

    for (let pIdx = 0; pIdx < pMatches.length; pIdx++) {
      const p = pMatches[pIdx];
      const pXml = p[0];
      let pText = '';
      // Bóc tách text, runs và placeholders theo đúng thứ tự xuất hiện trong <w:p>
      const tokenRegex = /(<w:r\b[\s\S]*?<\/w:r>|\[!m:[^\]]+\]|\[!img:[^\]]+\]|\[!\*[\s\S]*?\*!\]|<w:t\b[^>]*>([\s\S]*?)<\/w:t>)/g;
      let mToken: RegExpExecArray | null;
      while ((mToken = tokenRegex.exec(pXml)) !== null) {
        const token = mToken[1];
        if (token.startsWith('[!m:') || token.startsWith('[!img:') || token.startsWith('[!*')) {
          pText += ' ' + token + ' ';
        } else if (token.startsWith('<w:t')) {
          pText += mToken[2] || '';
        } else {
          // Token là <w:r>...</w:r>
          const rXml = token;
          const isUnderlined = /<w:u\b(?![^>]*w:val="(?:none|0)")/i.test(rXml);
          const colorMatch = rXml.match(/<w:color\b[^>]*w:val="([0-9a-fA-F]{6})"/i);
          const color = colorMatch ? colorMatch[1].toUpperCase() : null;

          const tMatches = Array.from(rXml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)).map((m: RegExpMatchArray) => m[1]);
          let runText = tMatches.join('');

          const placeholders = Array.from(rXml.matchAll(/(\[!m:[^\]]+\]|\[!img:[^\]]+\]|\[!\*[\s\S]*?\*!\])/g)).map((m: RegExpMatchArray) => m[1]);
          if (placeholders.length > 0) {
            runText += ' ' + placeholders.join(' ') + ' ';
          }

          if (!runText) continue;

          // Nếu run này là nhãn đáp án A, B, C, D và ĐƯỢC IN ĐẬM / GẠCH CHÂN / TÔ MÀU ĐẶC BIỆT (như màu đỏ FF0000)
          // -> Đánh dấu dấu sao * phía trước để biểu thị đáp án đúng tự động (Azota convention)
          if (isUnderlined || (color && ['FF0000', '008000', '0000FF'].includes(color))) {
            runText = runText.replace(/^(\s*)([A-Ha-h])([.)])/g, '$1*$2$3');
          }

          pText += runText;
        }
      }

      if (pText.trim()) {
        parsedParagraphs.push(pText.trim());
      }
    }

    const fullNormalized = this.normalizeText(parsedParagraphs.join('\n'));
    return {
      text: cleanLeakedOleGarbage(fullNormalized),
      images,
      mathCount,
      tableCount,
    };
  }

  /**
   * Chuyển đổi mã nguồn đề thi định dạng LaTeX (gói ex_test, exam chuẩn Việt Nam)
   * tương đương module LatexUtils trong Azota Production
   */
  public static preprocessLatex(latexContent: string): string {
    if (!latexContent) return '';
    let text = latexContent;

    // 1. Tiền xử lý ngắt dòng và dọn dẹp comment LaTeX
    text = text.replace(/\\\\\\n/g, '\n');
    text = text.replace(/\r\n/g, '\n');
    text = text.replace(/\r/g, '\n');
    text = text.replace(/(^|[^\\])%.*$/gm, '$1');

    // 2. Chuyển đổi bộ đếm câu hỏi \\setcounter{ex}{...} và \\begin{ex}
    let qIdx = 1;
    text = text.replace(/\\setcounter\{ex\}\{([0-9]+)\}/g, (_, num) => {
      qIdx = parseInt(num, 10);
      return '';
    });
    text = text.replace(/\\begin\{ex\}/g, () => `\nCâu ${qIdx++}: `);
    text = text.replace(/\\end\{ex\}/g, '\n');

    // 3. Chuyển đổi câu hỏi trả lời ngắn: \\shortans{...}
    text = text.replace(/\\shortans\{\s*\$(.*?)\$\s*\}/g, 'Đáp số: $1');
    text = text.replace(/\\shortans\{(.*?)\}/g, 'Đáp số: $1');

    // 4. Chuyển đổi lời giải: \\loigiai{...}
    text = text.replace(/\\loigiai\{/g, '\nLời giải: ');

    // 5. Chuyển đổi các gói lựa chọn phương án: \\choice và \\choiceTF
    text = text.replace(/\\choiceTF\b/g, '\n');
    text = text.replace(/\\choice\b/g, '\n');

    // 6. Dọn dẹp các lệnh định dạng phông chữ LaTeX phổ biến
    text = text.replace(/\\textbf\{([^}]+)\}/g, '$1');
    text = text.replace(/\\textit\{([^}]+)\}/g, '$1');
    text = text.replace(/\\underline\{([^}]+)\}/g, '$1');
    text = text.replace(/\\centerline\{([^}]+)\}/g, '$1');
    text = text.replace(/\\noindent/g, '');

    return this.normalizeText(text);
  }
}
