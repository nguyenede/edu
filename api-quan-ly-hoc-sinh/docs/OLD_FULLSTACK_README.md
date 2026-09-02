# StudentOS - Hệ thống quản lý học sinh

Ứng dụng quản lý học sinh, giáo viên, lớp học, môn học, phụ huynh, thời khóa biểu, điểm, chuyên cần, học phí, thông báo và báo cáo. Hệ thống có bốn vai trò: quản trị viên, giáo viên, học sinh và phụ huynh.

## Công nghệ

- Frontend: React 19, TypeScript, Vite 8, Tailwind CSS, Zustand, React Router, Axios và Recharts.
- Backend: Node.js, Express, MySQL/MariaDB, JWT, bcrypt và express-validator.
- Database: MySQL/MariaDB (tương thích XAMPP).

## Yêu cầu môi trường

- Node.js 20.19+ hoặc 22.12+.
- MySQL/MariaDB đang chạy.
- XAMPP là lựa chọn thuận tiện khi chạy trên Windows.

## Thiết lập cơ sở dữ liệu

Với cài đặt mới:

1. Tạo database `student_management_system` với charset `utf8mb4`.
2. Import [database/schema.sql](database/schema.sql).
3. Import [database/seed.sql](database/seed.sql).

Với database cũ, hãy sao lưu trước rồi chạy [database/migration_hardening.sql](database/migration_hardening.sql). Migration bổ sung các bảng/cột còn thiếu, chỉ mục và ràng buộc chống trùng điểm.

## Chạy local

Backend:

```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

Frontend (mở terminal khác):

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

Mặc định frontend chạy tại `http://localhost:5173`, backend tại `http://localhost:5000`.

## Kiểm tra trước khi triển khai

```bash
cd frontend
npm run lint -- --quiet
npm run build
npm run test:visual

cd ../backend
npm audit
```

`test:visual` cần Google Chrome hoặc Microsoft Edge và cần cả frontend/backend đang chạy.

## Tài khoản dữ liệu mẫu

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Admin | admin@school.com | 123456 |
| Giáo viên | teacher@school.com | 123456 |
| Học sinh | student@school.com | 123456 |
| Phụ huynh | parent@school.com | 123456 |

Các tài khoản trên chỉ dành cho môi trường phát triển. Trước khi đưa lên production:

- đổi toàn bộ mật khẩu mẫu;
- tạo `JWT_SECRET` ngẫu nhiên dài ít nhất 32 ký tự;
- đặt `NODE_ENV=production`;
- cấu hình đúng `CLIENT_URL` và `VITE_API_URL`;
- giữ `VITE_ENABLE_DEMO_LOGIN=false`;
- thiết lập quy trình sao lưu MySQL và HTTPS ở reverse proxy.

## Cấu trúc chính

```text
webquanlyhocsinh/
├── backend/       # Express API, phân quyền, validation, upload
├── frontend/      # React SPA và kiểm thử giao diện
├── database/      # Schema, seed và migration
└── README.md
```
