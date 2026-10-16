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
  public static async preprocessDocx(fileOrBuffer: File | ArrayBuffer): Promise<DocxPreprocessResult> {
    const zip = await JSZip.loadAsync(fileOrBuffer);
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

    // 2. Trích xuất tất cả hình ảnh từ word/media/
    const filePaths = Object.keys(zip.files);
    for (let f = 0; f < filePaths.length; f++) {
      const path = filePaths[f];
      if (path.startsWith('word/media/')) {
        const fileEntry = zip.file(path);
        if (fileEntry) {
          const lower = path.toLowerCase();
          let mime = 'image/png';
          if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mime = 'image/jpeg';
          else if (lower.endsWith('.gif')) mime = 'image/gif';
          else if (lower.endsWith('.svg')) mime = 'image/svg+xml';
          else if (lower.endsWith('.webp')) mime = 'image/webp';

          try {
            const base64 = await fileEntry.async('base64');
            const dataUri = `data:${mime};base64,${base64}`;
            const relKey = path.replace('word/', '');
            images.set(relKey, dataUri);

            // Gán mapping theo rId
            relsMap.forEach((target, rId) => {
              if (target.endsWith(relKey) || target === relKey) {
                images.set(rId, dataUri);
              }
            });
          } catch (e) {
            console.warn('Could not extract image from docx:', path, e);
          }
        }
      }
    }

    // 3. Đọc nội dung chính word/document.xml
    const docFile = zip.file('word/document.xml');
    if (!docFile) {
      return { text: '', images, mathCount, tableCount };
    }

    let docXml = await docFile.async('text');

    // 4. Tiền xử lý OLE Objects (MathType Equation binaries)
    for (let f = 0; f < filePaths.length; f++) {
      const path = filePaths[f];
      if (path.startsWith('word/embeddings/') && (path.endsWith('.bin') || path.endsWith('.ole'))) {
        try {
          const oleFile = zip.file(path);
          if (oleFile) {
            const buf = await oleFile.async('arraybuffer');
            const latex = parseMtefBinaryToLatex(buf);
            if (latex && latex.trim().length > 0) {
              mathCount++;
              const embedKey = path.replace('word/', '');
              relsMap.forEach((target, rId) => {
                if (target.endsWith(embedKey) || target === embedKey) {
                  // Thay thế OLE object bằng token LaTeX
                  const oleRegex = new RegExp(`<w:object\\b[\\s\\S]*?r:id=["']${rId}["'][\\s\\S]*?<\\/w:object>`, 'g');
                  docXml = docXml.replace(oleRegex, `[!m:${latex}]`);
                }
              });
            }
          }
        } catch (e) {
          console.warn('MathType OLE parsing error:', path, e);
        }
      }
    }

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
      const rMatches = Array.from(pXml.matchAll(/<w:r\b[\s\S]*?<\/w:r>/g));
      let pText = '';

      for (let rIdx = 0; rIdx < rMatches.length; rIdx++) {
        const r = rMatches[rIdx];
        const rXml = r[0];

        // Kiểm tra thuộc tính in đậm (<w:b/>), gạch chân (<w:u/>), hoặc màu sắc (<w:color/>)
        const isBold = /<w:b\b(?![^>]*w:val="(?:0|false|none)")/i.test(rXml);
        const isUnderlined = /<w:u\b(?![^>]*w:val="(?:none|0)")/i.test(rXml);
        const colorMatch = rXml.match(/<w:color\b[^>]*w:val="([0-9a-fA-F]{6})"/i);
        const color = colorMatch ? colorMatch[1].toUpperCase() : null;

        // Bóc tách text trong <w:t>
        const tMatches = Array.from(rXml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)).map((m: RegExpMatchArray) => m[1]);
        let runText = tMatches.join('');

        // Giữ lại placeholder ảnh và công thức nếu có
        const placeholders = Array.from(rXml.matchAll(/(\[!m:[^\]]+\]|\[!img:[^\]]+\]|\[!\*[\s\S]*?\*!\])/g)).map((m: RegExpMatchArray) => m[1]);
        if (placeholders.length > 0) {
          runText += placeholders.join(' ');
        }

        if (!runText) continue;

        // Nếu run này là nhãn đáp án A, B, C, D và ĐƯỢC IN ĐẬM / GẠCH CHÂN / TÔ MÀU ĐẶC BIỆT (như màu đỏ FF0000)
        // -> Đánh dấu dấu sao * phía trước để biểu thị đáp án đúng tự động (Azota convention)
        if (isUnderlined || (color && ['FF0000', '008000', '0000FF'].includes(color))) {
          runText = runText.replace(/^(\s*)([A-Ha-h])([.)])/g, '$1*$2$3');
        }

        pText += runText;
      }

      // Xử lý các thẻ text rơi ra ngoài w:r nếu có
      if (!pText) {
        const directT = Array.from(pXml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)).map((m: RegExpMatchArray) => m[1]).join('');
        pText = directT;
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
}
