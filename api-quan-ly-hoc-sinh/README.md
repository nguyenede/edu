# Student Management Backend

Backend dùng chung cho **Web quản lý học sinh** và **App Android quản lý học sinh**.

## Vai Trò

Backend này là API trung tâm của hệ thống quản lý học sinh. Frontend web và app Android đều gọi chung các endpoint dưới `/api`.

## Cấu Trúc

```text
api-quan-ly-hoc-sinh/
├── src/
│   ├── controllers/
│   ├── middlewares/
│   ├── routes/
│   ├── config/
│   ├── utils/
│   └── server.js
├── database/
│   ├── schema.sql
│   ├── seed.sql
│   └── migration_hardening.sql
├── uploads/
├── package.json
└── .env.example
```

## Công Nghệ

- Node.js.
- Express.
- MySQL/MariaDB.
- JWT authentication.
- bcrypt password hashing.
- Helmet, CORS, rate limit.
- express-validator.
- Multer upload.

## Module API

- `/api/auth`: đăng nhập, thông tin tài khoản hiện tại, cập nhật hồ sơ, đổi mật khẩu, avatar.
- `/api/students`: học sinh, phụ huynh của học sinh, sức khỏe, hành vi, AI prediction.
- `/api/teachers`: giáo viên.
- `/api/parents`: phụ huynh.
- `/api/classes`: lớp học.
- `/api/subjects`: môn học.
- `/api/grades`: điểm.
- `/api/attendance`: chuyên cần.
- `/api/payments`: học phí/thanh toán.
- `/api/reports`: báo cáo.
- `/api/schedules`: thời khóa biểu.
- `/api/notifications`: thông báo.
- `/api/settings`: cấu hình.
- `/api/upload`: upload.
- `/api/audit`: nhật ký hệ thống.

## Chạy Local

```bash
copy .env.example .env
npm install
npm run dev
```

API mặc định:

```text
http://localhost:5000/api
```

## Database

1. Tạo database MySQL/MariaDB.
2. Import `database/schema.sql`.
3. Import `database/seed.sql`.
4. Nếu nâng cấp database cũ, chạy thêm `database/migration_hardening.sql`.

## Biến Môi Trường

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=student_management_system
JWT_SECRET=generate_a_unique_random_secret_of_at_least_32_characters
JWT_EXPIRES_IN=7d
```

Nếu có nhiều web client, `CLIENT_URL` có thể là danh sách cách nhau bằng dấu phẩy:

```env
CLIENT_URL=http://localhost:5173,https://your-domain.com
```

App Android không gửi browser `Origin` giống web, nên vẫn gọi được API khi dùng đúng base URL.

## Client Sử Dụng Backend Này

- `../web-quan-ly-hoc-sinh`: frontend web React/Vite.
- `../android-quan-ly-hoc-sinh`: app Android Kotlin/Jetpack Compose.

## Bảo Mật

- Không commit `.env` thật.
- Đổi toàn bộ mật khẩu mẫu trước khi deploy.
- Dùng `JWT_SECRET` dài và ngẫu nhiên.
- Bật HTTPS khi public API.
- Sao lưu database định kỳ.
