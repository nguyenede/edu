import JSZip from 'jszip';

/**
 * Tạo và tải xuống file đề mẫu chuẩn cấu trúc cho giáo viên
 */
export async function downloadSampleTemplate(type: 'docx' | 'excel' | 'tex' | 'pdf' | 'zip') {
  if (type === 'tex') {
    const texContent = `% ĐỀ THI MẪU CHUẨN LATEX (.tex)
\\documentclass{article}
\\usepackage[utf8]{vietnam}
\\usepackage{amsmath,amssymb}

\\begin{document}

\\title{ĐỀ KIỂM TRA MẪU CHUẨN MÔN TOÁN}
\\date{}
\\maketitle

\\begin{ex}
Cho hàm số $y = x^3 - 3x^2 + 2$. Điểm cực đại của đồ thị hàm số là:
\\choice
{\\True $A(0; 2)$}
{$B(2; -2)$}
{$C(1; 0)$}
{$D(0; -2)$}
\\loigiai{Ta có $y' = 3x^2 - 6x = 0 \\Leftrightarrow x = 0$ hoặc $x = 2$. Với $x = 0 \\Rightarrow y = 2$, hàm số đạt cực đại tại $A(0; 2)$.}
\\end{ex}

\\begin{ex}
Tập xác định của hàm số $y = \\log_2(x - 3)$ là:
\\choice
{$[3; +\\infty)$}
{\\True $(3; +\\infty)$}
{$(-\\infty; 3)$}
{$\\mathbb{R} \\setminus \\{3\\}$}
\\loigiai{Điều kiện xác định: $x - 3 > 0 \\Leftrightarrow x > 3$. Do đó $D = (3; +\\infty)$.}
\\end{ex}

\\begin{ex}
Trong không gian $Oxyz$, mặt phẳng $(P): 2x - y + 3z - 5 = 0$ có một vectơ pháp tuyến là:
\\choice
{\\True $\\vec{n} = (2; -1; 3)$}
{$\\vec{n} = (2; 1; 3)$}
{$\\vec{n} = (2; -1; -5)$}
{$\\vec{n} = (-2; -1; 3)$}
\\loigiai{Vectơ pháp tuyến của mặt phẳng $Ax + By + Cz + D = 0$ là $\\vec{n} = (A; B; C) = (2; -1; 3)$.}
\\end{ex}

\\end{document}
`;
    const blob = new Blob([texContent], { type: 'text/plain;charset=utf-8' });
    triggerDownload(blob, 'de_thi_mau_chuan.tex');
    return;
  }

  if (type === 'excel') {
    // Tạo file XLSX bằng JSZip
    const zip = new JSZip();

    // 1. [Content_Types].xml
    zip.file(
      '[Content_Types].xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedString+xml"/>
</Types>`
    );

    // 2. _rels/.rels
    zip.file(
      '_rels/.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
    );

    // 3. xl/_rels/workbook.xml.rels
    zip.file(
      'xl/_rels/workbook.xml.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`
    );

    // 4. xl/workbook.xml
    zip.file(
      'xl/workbook.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`
    );

    const strings = [
      'STT',
      'Câu hỏi',
      'Đáp án A',
      'Đáp án B',
      'Đáp án C',
      'Đáp án D',
      'Đáp án đúng',
      'Lời giải chi tiết',
      'Một vật dao động điều hòa với phương trình x = 5cos(4pi t) cm. Biên độ dao động của vật là:',
      '5 cm',
      '10 cm',
      '4 cm',
      '20 cm',
      'A',
      'Biên độ dao động là A = 5 cm.',
      'Sóng cơ học không truyền được trong môi trường nào sau đây?',
      'Chất rắn',
      'Chất lỏng',
      'Chân không',
      'Chất khí',
      'C',
      'Sóng cơ không truyền được trong chân không.',
      'Hạt nhân nguyên tử cấu tạo từ các hạt nào?',
      'Proton và electron',
      'Proton và neutron',
      'Electron và neutron',
      'Chỉ gồm proton',
      'B',
      'Hạt nhân cấu tạo từ các nucleon gồm proton và neutron.',
    ];

    let sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">`;
    strings.forEach((s) => {
      sharedStringsXml += `<si><t>${s}</t></si>`;
    });
    sharedStringsXml += '</sst>';
    zip.file('xl/sharedStrings.xml', sharedStringsXml);

    const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="s"><v>0</v></c>
      <c r="B1" t="s"><v>1</v></c>
      <c r="C1" t="s"><v>2</v></c>
      <c r="D1" t="s"><v>3</v></c>
      <c r="E1" t="s"><v>4</v></c>
      <c r="F1" t="s"><v>5</v></c>
      <c r="G1" t="s"><v>6</v></c>
      <c r="H1" t="s"><v>7</v></c>
    </row>
    <row r="2">
      <c r="A2"><v>1</v></c>
      <c r="B2" t="s"><v>8</v></c>
      <c r="C2" t="s"><v>9</v></c>
      <c r="D2" t="s"><v>10</v></c>
      <c r="E2" t="s"><v>11</v></c>
      <c r="F2" t="s"><v>12</v></c>
      <c r="G2" t="s"><v>13</v></c>
      <c r="H2" t="s"><v>14</v></c>
    </row>
    <row r="3">
      <c r="A3"><v>2</v></c>
      <c r="B3" t="s"><v>15</v></c>
      <c r="C3" t="s"><v>16</v></c>
      <c r="D3" t="s"><v>17</v></c>
      <c r="E3" t="s"><v>18</v></c>
      <c r="F3" t="s"><v>19</v></c>
      <c r="G3" t="s"><v>20</v></c>
      <c r="H3" t="s"><v>21</v></c>
    </row>
    <row r="4">
      <c r="A4"><v>3</v></c>
      <c r="B4" t="s"><v>22</v></c>
      <c r="C4" t="s"><v>23</v></c>
      <c r="D4" t="s"><v>24</v></c>
      <c r="E4" t="s"><v>25</v></c>
      <c r="F4" t="s"><v>26</v></c>
      <c r="G4" t="s"><v>27</v></c>
      <c r="H4" t="s"><v>28</v></c>
    </row>
  </sheetData>
</worksheet>`;
    zip.file('xl/worksheets/sheet1.xml', sheetXml);

    const content = await zip.generateAsync({ type: 'blob' });
    triggerDownload(content, 'bang_dap_an_mau.xlsx');
    return;
  }

  if (type === 'docx') {
    const zip = new JSZip();

    zip.file(
      '[Content_Types].xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
    );

    zip.file(
      '_rels/.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
    );

    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>ĐỀ KIỂM TRA MẪU CHUẨN TIẾNG ANH THPT</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Môn: Tiếng Anh - Khối 12 - Thời gian: 45 phút</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Câu 1: </w:t></w:r>
      <w:r><w:t>She _______ to the cinema yesterday evening.</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:b/><w:u w:val="single"/></w:rPr><w:t>A. went</w:t></w:r>
      <w:r><w:t>    B. goes    C. has gone    D. was going</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Lời giải: Dấu hiệu thời gian "yesterday evening" nên chia thì quá khứ đơn (went).</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Câu 2: </w:t></w:r>
      <w:r><w:t>If I had a lot of money, I _______ a new car.</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>A. will buy    </w:t></w:r>
      <w:r><w:rPr><w:b/><w:u w:val="single"/></w:rPr><w:t>B. would buy</w:t></w:r>
      <w:r><w:t>    C. bought    D. buy</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Lời giải: Câu điều kiện loại 2 (If + S + V2/ed, S + would + V-inf).</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Câu 3: </w:t></w:r>
      <w:r><w:t>The man _______ lives next door is a doctor.</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>A. which    </w:t></w:r>
      <w:r><w:rPr><w:b/><w:u w:val="single"/></w:rPr><w:t>B. who</w:t></w:r>
      <w:r><w:t>    C. whom    D. whose</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Lời giải: Đại từ quan hệ chỉ người làm chủ ngữ là "who".</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>BẢNG ĐÁP ÁN:</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>1.A    2.B    3.B</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;
    zip.file('word/document.xml', docXml);

    const content = await zip.generateAsync({ type: 'blob' });
    triggerDownload(content, 'de_thi_mau_chuan.docx');
    return;
  }

  if (type === 'zip') {
    const zip = new JSZip();
    zip.file(
      'huong_dan_dinh_dang.txt',
      `HƯỚNG DẪN ĐỊNH DẠNG ĐỀ THI CHUẨN:
1. Mỗi câu hỏi bắt đầu bằng "Câu 1:", "Câu 2:", hoặc "\\begin{ex}".
2. Các phương án A. B. C. D. có thể nằm trên từng dòng hoặc cùng dòng.
3. Đáp án đúng có thể đánh dấu bằng gạch chân, in đậm, dấu sao (*A.), hoặc Bảng đáp án ở cuối đề.
4. Lời giải bắt đầu bằng "Lời giải:" hoặc "\\loigiai{...}".`
    );
    const content = await zip.generateAsync({ type: 'blob' });
    triggerDownload(content, 'bo_de_mau_chuan.zip');
    return;
  }

  if (type === 'pdf') {
    const textContent = `ĐỀ KIỂM TRA MẪU CHUẨN MÔN TOÁN 12
Thời gian làm bài: 45 phút

Câu 1: Cho hàm số y = f(x) có bảng biến thiên như hình vẽ. Hàm số đồng biến trên khoảng nào?
A. (-infinity; 0)
*B. (0; 2)
C. (2; +infinity)
D. (-1; 1)
Lời giải: Dựa vào bảng biến thiên, f'(x) > 0 trên khoảng (0; 2). Chọn B.

Câu 2: Thể tích khối lập phương cạnh bằng 3a là:
A. 9a^3
B. 3a^3
*C. 27a^3
D. 18a^3
Lời giải: V = (3a)^3 = 27a^3. Chọn C.

BẢNG ĐÁP ÁN:
1.B   2.C
`;
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    triggerDownload(blob, 'de_thi_mau_chuan.txt');
    return;
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
