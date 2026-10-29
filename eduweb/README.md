# KiyoEdu - Viện Nghệ Thuật Điện Ảnh & Quang Học 35mm

Trang web Scrollytelling điện ảnh với đồ họa WebGPU chuyên sâu kết hợp cùng WebGL2 & Canvas2D fallback, thiết kế theo phong cách Chaptered Editorial chuẩn mực điện ảnh (Ivory & Carbon).

## ✨ Tính năng nổi bật

- **Kiến trúc Scrollytelling WebGPU Native**: Canvas nền cố định (`#scrolly-canvas`) vẽ vòng chia độ quang học, thấu kính 35mm và vạch khẩu cơ học theo thời gian thực dựa trên tiến trình cuộn trang.
- **Cuộn tự nhiên 100% (Continuous Flow)**: Không ghim đứng (`no sticky lock`), tốc độ con lăn chuột mượt mà, phản hồi ngay lập tức.
- **6 Phân cảnh Điện ảnh chuyên biệt**:
  - `00. Khởi Nguồn`: Tiêu đề khổ lớn, đồng hồ SMPTE 24fps chạy trực tiếp, 4 thẻ điều hướng ảnh chụp thực tế.
  - `01. Quang Học`: Thấu kính Cooke Panchro T1.4, cấu trúc thấu kính và thước đo độ sâu trường ảnh (DoF meter) động.
  - `02. Ánh Sáng`: Bố cục Chiaroscuro tương phản ngà - đen với dải phim 35mm đục lỗ chuẩn Kodak Vision3 500T.
  - `03. Dàn Cảnh`: Sơ đồ nguyên lý trục $180^\circ$ và bộ 3 góc máy điện ảnh (Master, OTS, Close-Up).
  - `04. Khí Tài`: Dàn máy quay ARRI Alexa 35, ống kính Cooke và bộ chuyển đổi tỉ lệ khung hình (1.33:1, 1.85:1, 2.39:1).
  - `05. Tuyển Sinh`: 4 tiêu chuẩn tuyển sinh khắt khe và biểu mẫu đăng ký hồ sơ tác giả.

## 🚀 Cài đặt & Chạy dự án

```bash
# 1. Cài đặt dependencies
npm install

# 2. Khởi chạy môi trường phát triển (Development Server)
npm run dev

# 3. Đóng gói sản phẩm (Production Build)
npm run build

# 4. Xem trước bản build
npm run preview
```

## 🛠 Công nghệ sử dụng

- **Frontend Core**: Vanilla Modern JavaScript (ES Modules), Semantic HTML5, CSS Variables.
- **Visual Engine**: WebGPU API, WebGL2 Shaders & 2D Context fallback.
- **Bundler & Tooling**: Vite 5.x, Playwright Core (automated visual inspection).
