import mammoth from 'mammoth';
import JSZip from 'jszip';
import {
  replaceOmmlInDocumentXml,
  extractTextFromPdf,
  arrayBufferToBase64,
  getMimeTypeFromPath,
  convertWordTableToMarkdown,
  escapeXmlText,
} from './examStructureParser';
import { parseMtefBinaryToLatex, cleanLeakedOleGarbage } from './mtefParser';

export interface ExtractedFileResult {
  type: 'text' | 'image';
  text?: string;
  imageBase64?: string;
  fileName: string;
  fileExt: string;
}

/**
 * Trích xuất nội dung văn bản từ file Excel (.xlsx) thông qua cấu trúc ZIP XML
 */
async function extractXlsxText(file: File): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(file);
    let extractedLines: string[] = [];

    // 1. Đọc sharedStrings.xml chứa chuỗi văn bản của Excel
    const sharedStringsFile = zip.file('xl/sharedStrings.xml');
    if (sharedStringsFile) {
      const xmlText = await sharedStringsFile.async('text');
      // Trích xuất các nội dung trong thẻ <t>...</t>
      const matches = xmlText.match(/<t[^>]*>([\s\S]*?)<\/t>/gi);
      if (matches) {
        matches.forEach((m) => {
          const clean = m.replace(/<[^>]+>/g, '').trim();
          if (clean) extractedLines.push(clean);
        });
      }
    }

    if (extractedLines.length > 0) {
      return extractedLines.join('\n');
    }
  } catch (err) {
    console.warn('Could not parse xlsx via JSZip:', err);
  }
  return '';
}

/**
 * Trích xuất nội dung văn bản từ file ZIP (.zip)
 */
async function extractZipText(file: File): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(file);
    const textPieces: string[] = [];

    for (const relativePath of Object.keys(zip.files)) {
      const zipEntry = zip.files[relativePath];
      if (zipEntry.dir) continue;

      const lowerName = relativePath.toLowerCase();
      if (lowerName.endsWith('.docx')) {
        const buf = await zipEntry.async('arraybuffer');
        const res = await mammoth.extractRawText({ arrayBuffer: buf });
        if (res.value) textPieces.push(`--- File trong zip: ${relativePath} ---\n${res.value}`);
      } else if (lowerName.endsWith('.txt') || lowerName.endsWith('.tex') || lowerName.endsWith('.azt')) {
        const text = await zipEntry.async('text');
        if (text) textPieces.push(`--- File trong zip: ${relativePath} ---\n${text}`);
      } else if (lowerName.endsWith('.xlsx')) {
        const buf = await zipEntry.async('arraybuffer');
        const innerFile = new File([buf], relativePath);
        const xlsxText = await extractXlsxText(innerFile);
        if (xlsxText) textPieces.push(`--- File Excel: ${relativePath} ---\n${xlsxText}`);
      }
    }

    return textPieces.join('\n\n');
  } catch (err) {
    console.warn('Error reading ZIP file:', err);
    return '';
  }
}

/**
 * Trích xuất text cơ bản từ file PDF
 */
async function extractPdfText(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let str = '';
    // Đọc các chuỗi ký tự ASCII / UTF-8 có thể đọc được từ file PDF
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      if (b >= 32 && b <= 126) {
        str += String.fromCharCode(b);
      } else if (b === 10 || b === 13) {
        str += '\n';
      }
    }

    // Lọc các khối văn bản (text blocks giữa BT và ET hoặc các ngoặc đơn trong PDF)
    const matches = str.match(/\(([^()]{3,})\)/g);
    if (matches && matches.length > 5) {
      const texts = matches.map((m) => m.slice(1, -1).trim()).filter((t) => t.length > 1);
      return texts.join(' ');
    }
  } catch (err) {
    console.warn('Could not extract PDF text directly:', err);
  }
  return '';
}

/**
 * Hàm tổng hợp xử lý mọi loại file (.pdf, .docx, .xlsx, .azt, .tex, .zip, Ảnh) để gửi cho AI
 */
export async function extractFileForAi(file: File): Promise<ExtractedFileResult> {
  const fileName = file.name;
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();

  // 1. File Ảnh (.png, .jpg, .jpeg, .webp, .bmp)
  if (['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif'].includes(ext) || file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          type: 'image',
          imageBase64: reader.result as string,
          fileName,
          fileExt: ext,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // 2. File Word (.docx, .doc)
  if (ext === '.docx' || ext === '.doc') {
    const arrayBuffer = await file.arrayBuffer();
    try {
      const zip = await JSZip.loadAsync(arrayBuffer);
      const oleLatexMap = new Map<string, string>();
      const oleIndexMap = new Map<number, string>();
      const imageRelMap = new Map<string, string>();
      const imageIndexMap = new Map<number, string>();

      // Đọc bảng quan hệ trong word/_rels/document.xml.rels để liên kết rId -> oleObject.bin và rId -> media/image*.png
      const relsEntry = zip.file('word/_rels/document.xml.rels');
      if (relsEntry) {
        const relsXml = await relsEntry.async('text');
        const relRegex = /<Relationship\b[^>]*Id=["']([^"']+)["'][^>]*Target=["']([^"']+)["'][^>]*\/>/g;
        let rm: RegExpExecArray | null;
        while ((rm = relRegex.exec(relsXml)) !== null) {
          const rId = rm[1];
          const target = rm[2];

          // 1. MathType OLE
          if (/embeddings\/|oleObject/i.test(target)) {
            const normalized = target.startsWith('embeddings/')
              ? `word/${target}`
              : target.startsWith('word/embeddings/')
              ? target
              : `word/embeddings/${target.replace(/^.*[\\/]/, '')}`;
            const oleF = zip.file(normalized) || zip.file(`word/${target}`);
            if (oleF) {
              const oleBuf = await oleF.async('arraybuffer');
              const latex = parseMtefBinaryToLatex(oleBuf);
              if (latex) oleLatexMap.set(rId, latex);
            }
          }

          // 2. Hình ảnh
          if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(target) || target.includes('media/')) {
            const normalized = target.startsWith('media/')
              ? `word/${target}`
              : target.startsWith('word/media/')
              ? target
              : `word/media/${target.replace(/^.*[\\/]/, '')}`;
            const imgF = zip.file(normalized) || zip.file(`word/${target}`);
            if (imgF) {
              const imgBuf = await imgF.async('arraybuffer');
              const mime = getMimeTypeFromPath(target);
              const b64 = arrayBufferToBase64(imgBuf);
              imageRelMap.set(rId, `data:${mime};base64,${b64}`);
            }
          }
        }
      }

      // Đọc các file oleObject*.bin theo thứ tự
      const binEntries = Object.keys(zip.files).filter((k) => /embeddings\/oleobject\d+\.bin/i.test(k));
      binEntries.sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
        const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
        return numA - numB;
      });

      for (let bi = 0; bi < binEntries.length; bi++) {
        const binF = zip.file(binEntries[bi]);
        if (binF) {
          const buf = await binF.async('arraybuffer');
          const latex = parseMtefBinaryToLatex(buf);
          if (latex) oleIndexMap.set(bi + 1, latex);
        }
      }

      // Đọc các file ảnh trong word/media/ theo thứ tự nếu rId không khớp
      const mediaEntries = Object.keys(zip.files).filter((k) =>
        /^word\/media\/.*\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(k)
      );
      mediaEntries.sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
        const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
        return numA - numB;
      });
      for (let mi = 0; mi < mediaEntries.length; mi++) {
        const imgF = zip.file(mediaEntries[mi]);
        if (imgF) {
          const buf = await imgF.async('arraybuffer');
          const mime = getMimeTypeFromPath(mediaEntries[mi]);
          const b64 = arrayBufferToBase64(buf);
          imageIndexMap.set(mi + 1, `data:${mime};base64,${b64}`);
        }
      }

      const docXmlEntry = zip.file('word/document.xml');
      if (docXmlEntry) {
        let docXml = await docXmlEntry.async('text');

        // Chuyển đổi bảng <w:tbl> sang Markdown table
        docXml = docXml.replace(/<w:tbl\b[\s\S]*?<\/w:tbl>/g, (tblXml) => {
          const mdTable = convertWordTableToMarkdown(tblXml);
          if (mdTable) {
            const safeMd = escapeXmlText(`\n\n${mdTable}\n\n`);
            return `<w:p><w:r><w:t xml:space="preserve">${safeMd}</w:t></w:r></w:p>`;
          }
          return tblXml;
        });

        const convertedDocXml = replaceOmmlInDocumentXml(docXml, oleLatexMap, oleIndexMap, imageRelMap, imageIndexMap);
        zip.file('word/document.xml', convertedDocXml);
        const modifiedBuffer = await zip.generateAsync({ type: 'arraybuffer' });
        const result = await mammoth.extractRawText({ arrayBuffer: modifiedBuffer });
        return {
          type: 'text',
          text: cleanLeakedOleGarbage(result.value || ''),
          fileName,
          fileExt: ext,
        };
      }
    } catch (docxErr) {
      console.warn('Word file math preprocessing error in extractFileForAi:', docxErr);
    }

    const result = await mammoth.extractRawText({ arrayBuffer });
    return {
      type: 'text',
      text: cleanLeakedOleGarbage(result.value || ''),
      fileName,
      fileExt: ext,
    };
  }

  // 3. File Excel (.xlsx)
  if (ext === '.xlsx') {
    const xlsxText = await extractXlsxText(file);
    return {
      type: 'text',
      text: xlsxText,
      fileName,
      fileExt: ext,
    };
  }

  // 4. File ZIP (.zip)
  if (ext === '.zip') {
    const zipText = await extractZipText(file);
    return {
      type: 'text',
      text: zipText,
      fileName,
      fileExt: ext,
    };
  }

  // 5. File PDF (.pdf)
  if (ext === '.pdf') {
    const pdfText = await extractTextFromPdf(file);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          type: pdfText && pdfText.trim().length > 30 ? 'text' : 'image',
          text: pdfText || undefined,
          imageBase64: reader.result as string,
          fileName,
          fileExt: ext,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // 6. File Text, LaTeX (.tex), .azt, .txt
  const text = await file.text().catch(() => '');
  return {
    type: 'text',
    text,
    fileName,
    fileExt: ext,
  };
}
