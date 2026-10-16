/**
 * MathType MTEF (MathType Equation Format) Binary Parser
 * Giải mã các đối tượng nhị phân OLE (Equation.DSMT4 / oleObject.bin)
 * từ file Word (.docx) trực tiếp sang mã LaTeX chuẩn ($...$).
 * 100% thuật toán cục bộ, chạy trên RAM (0ms, không tốn AI).
 */

// Bảng ánh xạ ký tự Symbol font / Unicode thông dụng trong MathType sang LaTeX
const MTEF_SYMBOL_MAP: Record<number, string> = {
  0x2264: '\\le ',
  0x2265: '\\ge ',
  0x2260: '\\ne ',
  0x2212: '-', // Unicode minus sign
  0x2013: '-', // En dash
  0x2014: '-', // Em dash
  0x00b1: '\\pm ',
  0x221e: '\\infty ',
  0x2208: '\\in ',
  0x2209: '\\notin ',
  0x2282: '\\subset ',
  0x2283: '\\supset ',
  0x222a: '\\cup ',
  0x2229: '\\cap ',
  0x2205: '\\emptyset ',
  0x2192: '\\to ',
  0x21d2: '\\Rightarrow ',
  0x21d4: '\\Leftrightarrow ',
  0x00d7: '\\times ',
  0x00f7: '\\div ',
  0x221a: '\\sqrt{}',
  0x2248: '\\approx ',
  0x2261: '\\equiv ',
  0x223c: '\\sim ',
  0x22a5: '\\perp ',
  0x2225: '\\parallel ',
  0x2220: '\\angle ',
  0x25b3: '\\Delta ',
  0x03c0: '\\pi ',
  0x03b1: '\\alpha ',
  0x03b2: '\\beta ',
  0x03b3: '\\gamma ',
  0x03b8: '\\theta ',
  0x03bb: '\\lambda ',
  0x03c3: '\\sigma ',
  0x03c9: '\\omega ',
  0x0394: '\\Delta ',
  0x03a9: '\\Omega ',
};

// MathType custom Symbol font encoding offsets (0xF000 range)
const SYMBOL_FONT_OFFSET = 0xf000;
const SYMBOL_CHAR_MAP: Record<number, string> = {
  0xa3: '\\le ', // ≤ in Symbol font
  0xb3: '\\ge ', // ≥ in Symbol font
  0xb9: '\\ne ', // ≠ in Symbol font
  0xa5: '\\infty ', // ∞ in Symbol font
  0xb1: '\\pm ', // ± in Symbol font
  0xb4: '\\times ', // × in Symbol font
  0xb8: '\\div ', // ÷ in Symbol font
  0xce: '\\in ', // ∈ in Symbol font
  0xcf: '\\notin ', // ∉ in Symbol font
  0xc0: '\\aleph ',
  0xc1: '\\Im ',
  0xc2: '\\Re ',
  0xa9: '\\subset ',
  0xaa: '\\supset ',
  0xc8: '\\cup ',
  0xc7: '\\cap ',
  0xae: '\\to ',
  0xde: '\\Rightarrow ',
  0xdb: '\\Leftrightarrow ',
  0xbb: '\\approx ',
  0xba: '\\equiv ',
  0x5e: '\\perp ',
  0xd0: '\\angle ',
  0x70: '\\pi ',
  0x61: '\\alpha ',
  0x62: '\\beta ',
  0x67: '\\gamma ',
  0x71: '\\theta ',
  0x6c: '\\lambda ',
  0x73: '\\sigma ',
  0x77: '\\omega ',
  0x44: '\\Delta ',
};

/**
 * Làm sạch triệt để các chuỗi rác nhị phân OLE / MathType header
 * (ví dụ: RootEntryFOleCompObjObjInfoF7.0Equation...TimesNewRomanSymbolCourierNew)
 */
export function cleanLeakedOleGarbage(str: string): string {
  if (!str || typeof str !== 'string') return '';
  let res = str;

  // 1. Khớp và thay thế chuỗi OLE rác bắt đầu từ prefix toán đến hết tên font / ký tự kết thúc
  res = res.replace(
    /(?:\$?\s*(?:[±\+\-\*\/><=]|\\pm|\\ge|\\le|\d+[,.]\d+)*\s*(?:>|=|<)*\s*)?RootEntry[\s\S]*?(?:CourierNew|CourierN|TimesNewRoman|BasicCodePages)[^\s]*\s*!?\$?/gi,
    ' '
  );

  // 2. Fallback dọn sạch các từ khóa nhị phân OLE nếu còn sót
  res = res.replace(/\$?[^\s$]*RootEntry[^\s$]*\$?/gi, ' ');
  res = res.replace(/\$?[^\s$]*FOleCompObj[^\s$]*\$?/gi, ' ');
  res = res.replace(/\$?[^\s$]*ObjInfoF[^\s$]*\$?/gi, ' ');
  res = res.replace(/\$?[^\s$]*Equation\.qoKDW[^\s$]*\$?/gi, ' ');
  res = res.replace(/\$?[^\s$]*TimesNewRomanSymbol[^\s$]*\$?/gi, ' ');

  // 3. Dọn sạch rác KDWin / MTExtra font descriptor và toán tử bị nhân đôi từ OLE
  res = res.replace(/o[0-9a-zA-Z]?KDWinAllMTExtra[A-Za-z0-9+/=_-]*/gi, '');
  res = res.replace(/MTExtra[A-Za-z0-9+/=_-]*/gi, '');
  res = res.replace(/[A-Za-z0-9+/]{16,}={0,2}/g, '');
  res = res.replace(/<<+/g, ' < ');
  res = res.replace(/>>+/g, ' > ');
  res = res.replace(/==+/g, ' = ');
  res = res.replace(/\+\++/g, ' + ');
  res = res.replace(/--+/g, ' - ');

  // 4. Dọn sạch dấu $ rỗng do chuỗi rác để lại
  res = res.replace(/\$\s*\$/g, '');

  return res.replace(/[ \t]+/g, ' ').trim();
}

function readUInt32LE(b: Uint8Array, offset: number): number {
  return (b[offset] | (b[offset + 1] << 8) | (b[offset + 2] << 16) | (b[offset + 3] << 24)) >>> 0;
}

function decodeUtf16Le(bytes: Uint8Array, start: number, len: number): string {
  let str = '';
  for (let i = 0; i < len; i += 2) {
    const code = bytes[start + i] | (bytes[start + i + 1] << 8);
    if (code === 0) break;
    str += String.fromCharCode(code);
  }
  return str;
}

/**
 * Trích xuất stream nhị phân "Equation Native" từ file OLE Compound File (oleObject.bin)
 */
export function extractEquationNativeFromCfbf(buffer: ArrayBuffer | Uint8Array): Uint8Array | null {
  try {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (!bytes || bytes.length < 512) return null;

    // Kiểm tra magic number CFBF: D0 CF 11 E0 A1 B1 1A E1
    const isCfbf =
      bytes[0] === 0xd0 &&
      bytes[1] === 0xcf &&
      bytes[2] === 0x11 &&
      bytes[3] === 0xe0 &&
      bytes[4] === 0xa1 &&
      bytes[5] === 0xb1 &&
      bytes[6] === 0x1a &&
      bytes[7] === 0xe1;

    if (!isCfbf) return null;

    const sectorShift = bytes[30] | (bytes[31] << 8);
    const miniSectorShift = bytes[32] | (bytes[33] << 8);
    const sectorSize = 1 << (sectorShift || 9);
    const miniSectorSize = 1 << (miniSectorShift || 6);

    const firstDirSector = readUInt32LE(bytes, 48);
    const miniCutoff = readUInt32LE(bytes, 56) || 4096;
    const firstMiniFatSector = readUInt32LE(bytes, 60);

    // 1. Đọc các sector FAT từ header
    const fat: number[] = [];
    const numFatSectors = readUInt32LE(bytes, 44);
    for (let i = 0; i < 109 && i < (numFatSectors || 109); i++) {
      const secId = readUInt32LE(bytes, 76 + i * 4);
      if (secId >= 0xfffffffa) break;

      const secOffset = (secId + 1) * sectorSize;
      if (secOffset + sectorSize <= bytes.length) {
        for (let j = 0; j < sectorSize; j += 4) {
          fat.push(readUInt32LE(bytes, secOffset + j));
        }
      }
    }

    const followChain = (startSec: number, fatTable: number[]): number[] => {
      const chain: number[] = [];
      let curr = startSec;
      const visited = new Set<number>();
      while (curr < 0xfffffffa && !visited.has(curr) && chain.length < 2048) {
        visited.add(curr);
        chain.push(curr);
        if (curr >= fatTable.length) break;
        curr = fatTable[curr];
      }
      return chain;
    };

    // 2. Đọc toàn bộ Directory Stream
    const dirChain = followChain(firstDirSector, fat);
    const dirBytesList: number[] = [];
    for (const secId of dirChain) {
      const off = (secId + 1) * sectorSize;
      if (off + sectorSize <= bytes.length) {
        for (let b = 0; b < sectorSize; b++) dirBytesList.push(bytes[off + b]);
      }
    }
    const dirBytes = new Uint8Array(dirBytesList);

    // Entry 0 là Root Entry (chứa Mini-Stream)
    if (dirBytes.length < 128) return null;
    const rootStartSec = readUInt32LE(dirBytes, 116);
    const rootSize = readUInt32LE(dirBytes, 120);

    // Đọc Mini-Stream data
    const rootChain = followChain(rootStartSec, fat);
    const miniStreamList: number[] = [];
    for (const secId of rootChain) {
      const off = (secId + 1) * sectorSize;
      if (off + sectorSize <= bytes.length) {
        for (let b = 0; b < sectorSize; b++) miniStreamList.push(bytes[off + b]);
      }
    }
    const miniStream = new Uint8Array(miniStreamList).subarray(0, rootSize);

    // 3. Đọc Mini FAT
    const miniFatChain = followChain(firstMiniFatSector, fat);
    const miniFat: number[] = [];
    for (const secId of miniFatChain) {
      const off = (secId + 1) * sectorSize;
      if (off + sectorSize <= bytes.length) {
        for (let j = 0; j < sectorSize; j += 4) {
          miniFat.push(readUInt32LE(bytes, off + j));
        }
      }
    }

    // 4. Quét tìm Directory Entry cho "Equation Native"
    const totalEntries = Math.floor(dirBytes.length / 128);
    for (let eIdx = 1; eIdx < totalEntries; eIdx++) {
      const eOffset = eIdx * 128;
      const nameLen = dirBytes[eOffset + 64] | (dirBytes[eOffset + 65] << 8);
      const name = decodeUtf16Le(dirBytes, eOffset, Math.min(64, nameLen));
      const cleanName = name.replace(/[\x00-\x1F]/g, '').trim();

      if (/Equation\s*Native/i.test(cleanName) || cleanName.toLowerCase().includes('equation')) {
        const streamStart = readUInt32LE(dirBytes, eOffset + 116);
        const streamSize = readUInt32LE(dirBytes, eOffset + 120);
        if (streamSize === 0) continue;

        if (streamSize < miniCutoff && miniStream.length > 0) {
          // Lấy từ Mini-Stream
          const miniChain = followChain(streamStart, miniFat);
          const out = new Uint8Array(streamSize);
          let written = 0;
          for (const mId of miniChain) {
            const mOff = mId * miniSectorSize;
            const take = Math.min(miniSectorSize, streamSize - written);
            if (mOff + take <= miniStream.length && take > 0) {
              out.set(miniStream.subarray(mOff, mOff + take), written);
              written += take;
            }
            if (written >= streamSize) break;
          }
          if (written > 0) return out.subarray(0, written);
        } else {
          // Lấy từ Regular FAT
          const regChain = followChain(streamStart, fat);
          const out = new Uint8Array(streamSize);
          let written = 0;
          for (const sId of regChain) {
            const sOff = (sId + 1) * sectorSize;
            const take = Math.min(sectorSize, streamSize - written);
            if (sOff + take <= bytes.length && take > 0) {
              out.set(bytes.subarray(sOff, sOff + take), written);
              written += take;
            }
            if (written >= streamSize) break;
          }
          if (written > 0) return out.subarray(0, written);
        }
      }
    }

    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Trích xuất chuỗi LaTeX từ một mảng byte nhị phân của đối tượng OLE MathType
 */
export function parseMtefBinaryToLatex(buffer: ArrayBuffer | Uint8Array): string {
  try {
    let bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (!bytes || bytes.length < 8) return '';

    // 1. Nếu là CFBF container (oleObject.bin), giải mã để lấy Equation Native stream thực tế
    const extractedStream = extractEquationNativeFromCfbf(bytes);
    if (extractedStream && extractedStream.length >= 8) {
      bytes = extractedStream;
    } else if (
      bytes[0] === 0xd0 &&
      bytes[1] === 0xcf &&
      bytes[2] === 0x11 &&
      bytes[3] === 0xe0
    ) {
      // Là CFBF nhưng không tìm thấy stream Equation Native: Tuyệt đối không parse container thô!
      return '';
    }

    // 2. Tìm vị trí MTEF Header trong stream
    let mtefPos = -1;

    // A. Kiểm tra sau 28 byte OLE Equation Native header (chuẩn nhất)
    if (bytes.length > 32 && (bytes[28] === 0x05 || bytes[28] === 0x03) && bytes[29] <= 0x02 && bytes[30] <= 0x02) {
      mtefPos = 28;
    }
    // B. Kiểm tra ngay tại byte 0
    else if ((bytes[0] === 0x05 || bytes[0] === 0x03) && bytes[1] <= 0x02 && bytes[2] <= 0x02) {
      mtefPos = 0;
    }
    // C. Tìm kiếm trong các byte đầu tiên (tối đa 128 byte đầu)
    else {
      const searchLimit = Math.min(bytes.length - 5, 128);
      for (let i = 0; i < searchLimit; i++) {
        if (
          (bytes[i] === 0x05 || bytes[i] === 0x03) &&
          bytes[i + 1] <= 0x02 &&
          bytes[i + 2] <= 0x02 &&
          bytes[i + 3] <= 0x10
        ) {
          mtefPos = i;
          break;
        }
      }
    }

    if (mtefPos === -1) {
      // Fallback: Tìm các chuỗi ký tự toán học có nghĩa trong stream
      return extractHeuristicMathFromBytes(bytes);
    }

    // 2. Tìm điểm bắt đầu thực sự của biểu thức toán học (Record 1: LINE)
    // Trong MathType 5/6/7, sau MTEF Header và bảng Font (kết thúc bằng "MT Extra\0" hoặc danh sách font),
    // biểu thức bắt đầu bằng record LINE [1, 0, ...]
    let pos = mtefPos + 5;
    const str = Buffer.from(bytes).toString('binary');
    const mtExtraIdx = str.indexOf('MT Extra\0');
    const searchFrom = mtExtraIdx !== -1 ? mtExtraIdx + 9 : mtefPos + 5;

    for (let j = searchFrom; j < bytes.length - 3; j++) {
      if (bytes[j] === 1 && bytes[j + 1] === 0 && (bytes[j + 2] === 2 || bytes[j + 2] === 3 || bytes[j + 2] === 1 || bytes[j + 2] === 10)) {
        pos = j;
        break;
      }
    }

    const parseContainer = (depth = 0): string => {
      let text = '';
      if (depth > 25) return text; // Tránh đệ quy vô hạn

      while (pos < bytes.length) {
        const tag = bytes[pos++];
        if (tag === 0) {
          // Record 0: END of container
          break;
        } else if (tag === 1) {
          // Record 1: LINE
          if (pos < bytes.length) pos++; // Bỏ qua line options (0)
          const lineContent = parseContainer(depth + 1);
          text += lineContent;
        } else if (tag === 2) {
          // Record 2: CHAR
          if (pos >= bytes.length) break;
          const options = bytes[pos++];

          // Bỏ qua typeface byte (luôn xuất hiện trong MTEF 5)
          if (pos < bytes.length) {
            pos++;
          }

          if (pos + 1 < bytes.length) {
            let charCode = bytes[pos] | (bytes[pos + 1] << 8);
            pos += 2;

            // Bỏ qua embellishment byte nếu options có cờ 0x04
            if (options & 4 && pos < bytes.length) {
              pos++;
            }

            // Xử lý charCode sang LaTeX
            text += formatMtefCharCode(charCode);
          }
        } else if (tag === 3) {
          // Record 3: TMPL (Template: Phân số, Căn thức, Lũy thừa, Chỉ số dưới...)
          if (pos + 3 >= bytes.length) break;
          const _options = bytes[pos++];
          const selector = bytes[pos++];
          const _variation = bytes[pos++] | (bytes[pos++] << 8);

          text += formatMtefTemplate(selector, _variation, depth + 1);
        } else if (tag === 4 || tag === 5) {
          // Record 4: PILE hoặc Record 5: MATRIX
          pos += 2;
          text += parseContainer(depth + 1);
        } else if (tag === 6) {
          // Record 6: EMBELLISHMENT (dấu gạch ngang, vector, dấu phẩy...)
          if (pos < bytes.length) {
            const embelType = bytes[pos++];
            if (embelType === 1) text += "'"; // Đạo hàm '
            else if (embelType === 2) text += "''"; // Đạo hàm ''
            else if (embelType === 3) text += '\\vec'; // Vector
            else if (embelType === 4) text += '\\overline'; // Gạch đầu
          }
        } else if (tag === 7) {
          // Record 7: RULER
          if (pos < bytes.length) {
            const nStops = bytes[pos++];
            pos += nStops * 3;
          }
        } else if (tag === 8) {
          // Record 8: FONT (Định nghĩa font chữ)
          if (pos < bytes.length) {
            pos++;
            while (pos < bytes.length && bytes[pos] !== 0) {
              pos++;
            }
            pos++;
          }
        } else if (tag === 9) {
          // Record 9: SIZE
          pos += 2;
        } else if (tag >= 10 && tag <= 14) {
          // Record 10-14: SIZE records (FULL, SUB, SUB2, SYM, SUBSYM) có độ dài 0 byte
        } else {
          pos++;
        }
      }
      return text;
    };

    const parseOneSlot = (depth: number): string => {
      while (pos < bytes.length) {
        const tag = bytes[pos++];
        if (tag === 0) break;
        if (tag >= 10 && tag <= 14) continue;
        if (tag === 1) {
          if (pos < bytes.length) pos++;
          return parseContainer(depth);
        }
        pos--;
        return parseContainer(depth);
      }
      return '';
    };

    const formatMtefTemplate = (selector: number, _variation: number, depth: number): string => {
      // Bóc tách cấu trúc theo template selector với từng slot độc lập
      if (selector === 28 || selector === 8) {
        // SỐ MŨ / LŨY THỪA: ^{...}
        const sup = parseOneSlot(depth);
        return `^{${sup.trim()}}`;
      } else if (selector === 29 || selector === 9) {
        // CHỈ SỐ DƯỚI: _{...}
        const sub = parseOneSlot(depth);
        return `_{${sub.trim()}}`;
      } else if (selector === 30 || selector === 10) {
        // CHỈ SỐ TRÊN VÀ DƯỚI: _{...}^{...}
        const sub = parseOneSlot(depth);
        const sup = parseOneSlot(depth);
        return `_{${sub.trim()}}^{${sup.trim()}}`;
      } else if (selector === 4) {
        // CĂN BẬC HAI: \sqrt{...}
        const inner = parseOneSlot(depth);
        return `\\sqrt{${inner.trim()}}`;
      } else if (selector === 5 || selector === 6 || selector === 7) {
        // PHÂN SỐ: \frac{tử}{mẫu}
        const num = parseOneSlot(depth);
        const den = parseOneSlot(depth);
        return `\\frac{${num.trim()}}{${den.trim()}}`;
      } else if (selector === 0) {
        // DẤU NGOẶC ĐƠN: (...)
        const inner = parseOneSlot(depth);
        return inner.trim() ? `(${inner.trim()})` : '';
      } else if (selector === 1) {
        // DẤU NGOẶC VUÔNG: [...]
        const inner = parseOneSlot(depth);
        return inner.trim() ? `[${inner.trim()}]` : '';
      } else if (selector === 2) {
        // DẤU NGOẶC NHỌN: \{...\}
        const inner = parseOneSlot(depth);
        return inner.trim() ? `\\{${inner.trim()}\\}` : '';
      } else if (selector === 3) {
        // DẤU GIÁ TRỊ TUYỆT ĐỐI: |...|
        const inner = parseOneSlot(depth);
        return inner.trim() ? `|${inner.trim()}|` : '';
      } else if (selector === 11) {
        // TÍCH PHÂN: \int
        const lower = parseOneSlot(depth);
        const upper = parseOneSlot(depth);
        const integrand = parseOneSlot(depth);
        return `\\int_{${lower.trim()}}^{${upper.trim()}} ${integrand.trim()}`;
      } else if (selector === 12) {
        // TỔNG SIGMA: \sum
        const lower = parseOneSlot(depth);
        const upper = parseOneSlot(depth);
        const expr = parseOneSlot(depth);
        return `\\sum_{${lower.trim()}}^{${upper.trim()}} ${expr.trim()}`;
      }

      return parseOneSlot(depth);
    };

    const parsedLatex = parseContainer(0).trim();
    if (parsedLatex && parsedLatex.length > 0) {
      return sanitizeExtractedLatex(parsedLatex);
    }

    // Nếu parse cấu trúc không ra chuỗi hợp lệ, fallback sang trích xuất heuritic
    return extractHeuristicMathFromBytes(bytes);
  } catch (err) {
    console.warn('Lỗi parse MTEF binary:', err);
    return '';
  }
}

/**
 * Chuyển đổi mã ký tự MTEF charCode sang LaTeX
 */
function formatMtefCharCode(charCode: number): string {
  // 1. Ký tự trong bảng ký hiệu toán học
  if (MTEF_SYMBOL_MAP[charCode]) {
    return MTEF_SYMBOL_MAP[charCode];
  }

  // 2. Ký tự Symbol font đặc biệt (0xF000..0xF0FF)
  if (charCode >= SYMBOL_FONT_OFFSET && charCode <= SYMBOL_FONT_OFFSET + 0xff) {
    const symByte = charCode - SYMBOL_FONT_OFFSET;
    if (SYMBOL_CHAR_MAP[symByte]) {
      return SYMBOL_CHAR_MAP[symByte];
    }
  }

  // 3. Ký tự ASCII thông thường (32 đến 126)
  if (charCode >= 32 && charCode <= 126) {
    const ch = String.fromCharCode(charCode);
    if (ch === '<') return ' < ';
    if (ch === '>') return ' > ';
    if (ch === '=') return ' = ';
    if (ch === '+') return ' + ';
    if (ch === '-') return ' - ';
    return ch;
  }

  // 4. Ký tự Hy Lạp Unicode
  if (charCode >= 0x0391 && charCode <= 0x03c9) {
    return String.fromCharCode(charCode);
  }

  return '';
}

/**
 * Thuật toán Heuristic phục hồi công thức toán từ byte thô
 * khi cấu trúc AST MTEF bị nén hoặc phiên bản không tương thích
 */
function extractHeuristicMathFromBytes(bytes: Uint8Array): string {
  // 1. Tuyệt đối không trích xuất heuristic từ container CFBF thô (tránh lọt tên stream/font)
  if (bytes.length >= 8 && bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
    return '';
  }

  const parts: string[] = [];

  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];

    // ASCII có thể đọc được
    if (
      (b >= 48 && b <= 57) || // 0-9
      (b >= 65 && b <= 90) || // A-Z
      (b >= 97 && b <= 122) || // a-z
      b === 43 || // +
      b === 45 || // -
      b === 61 || // =
      b === 60 || // <
      b === 62 || // >
      b === 40 || // (
      b === 41 || // )
      b === 91 || // [
      b === 93 || // ]
      b === 44 || // ,
      b === 46 // .
    ) {
      parts.push(String.fromCharCode(b));
    } else if (b === 0xa3) {
      parts.push(' \\le ');
    } else if (b === 0xb3) {
      parts.push(' \\ge ');
    } else if (b === 0xb9) {
      parts.push(' \\ne ');
    } else if (b === 0xb1) {
      parts.push(' \\pm ');
    } else if (b === 0xb4) {
      parts.push(' \\times ');
    }
  }

  const raw = parts.join('').trim();

  // 2. Lọc bỏ toàn bộ tên font và siêu dữ liệu container OLE, giữ nguyên ký hiệu toán & biến số
  let cleaned = raw
    .replace(/RootEntry|CompObj|ObjInfo|BasicCodePages/gi, '')
    .replace(/TimesNewRoman|CourierNew|Symbol|Arial|Calibri/gi, '')
    .replace(/DSMT\d+/gi, '')
    .replace(/MathType/gi, '')
    .replace(/Microsoft/gi, '')
    .replace(/Equation/gi, '')
    .replace(/o[0-9a-zA-Z]?KDWinAllMTExtra[A-Za-z0-9+/=_-]*/gi, '')
    .replace(/MTExtra[A-Za-z0-9+/=_-]*/gi, '')
    .replace(/[A-Za-z0-9+/]{14,}={0,2}/g, '')
    .replace(/<<+/g, ' < ')
    .replace(/>>+/g, ' > ')
    .replace(/==+/g, ' = ')
    .replace(/\+\++/g, ' + ')
    .replace(/--+/g, ' - ')
    .replace(/[\x00-\x1F]/g, '')
    .trim();

  // 3. Phải có độ dài hợp lý và chứa ký tự toán học hoặc biến số
  if (cleaned.length < 1 || !/[a-zA-Z0-9+\-*/=<>()[\]\\]/.test(cleaned)) {
    return '';
  }

  return sanitizeExtractedLatex(cleaned);
}

/**
 * Làm sạch và chuẩn hóa biểu thức LaTeX đầu ra
 */
function sanitizeExtractedLatex(expr: string): string {
  if (!expr || expr.length === 0) return '';

  let cleaned = expr
    .replace(/\s{2,}/g, ' ')
    .replace(/(?<!\\)<=|≤/g, ' \\le ')
    .replace(/(?<!\\)>=|≥/g, ' \\ge ')
    .replace(/(?<!\\)!=|≠/g, ' \\ne ')
    .replace(/\[\s*\]|\(\s*\)/g, '')
    .trim();

  // Đóng gói công thức trong dấu $...$ nếu có ký hiệu toán
  if (/[+\-*/=<>\\^_]/.test(cleaned) || /[a-zA-Z]\d+/.test(cleaned)) {
    return `$${cleaned.replace(/^\$+|\$+$/g, '')}$`;
  }

  return cleaned;
}
