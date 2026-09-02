# KiyoEdu

KiyoEdu là repository tổng hợp các sản phẩm giáo dục của `0kiyo`. Repo này gồm 3 phần độc lập nhưng cùng phục vụ hệ sinh thái trường học: web quản lý học sinh, app Android cho học sinh/phụ huynh và web học tập/bài tập.

## Cấu trúc repo

```text
kiyoedu/
├── web-quan-ly-hoc-sinh/       # Web quản lý học sinh cho nhà trường, giáo viên, học sinh, phụ huynh
├── android-quan-ly-hoc-sinh/   # App Android cho học sinh và phụ huynh
├── web-hoc-tap/                # Web học tập, bài tập, quiz, lớp học và realtime game
├── .gitignore
└── README.md
```

## 1. Web quản lý học sinh

Thư mục: `web-quan-ly-hoc-sinh`

Đây là hệ thống quản lý học sinh dành cho nhà trường. Ứng dụng có đầy đủ các vai trò chính:

- **Nhà trường/Admin**: quản lý tổng thể hệ thống, tài khoản, lớp học, giáo viên, học sinh, phụ huynh, báo cáo và cấu hình.
- **Giáo viên**: theo dõi lớp, điểm, chuyên cần, thời khóa biểu, học sinh và thông báo liên quan.
- **Học sinh**: xem thông tin học tập, điểm số, lịch học, thông báo và hồ sơ cá nhân.
- **Phụ huynh**: theo dõi tình hình học tập, chuyên cần, điểm số, thông báo và thông tin của con.

### Công nghệ

- Frontend: React, TypeScript, Vite, Tailwind CSS, Zustand, React Router, Axios, Recharts.
- Backend: Node.js, Express, MySQL/MariaDB, JWT, bcrypt, Helmet, CORS, express-validator, Multer.
- Database: MySQL/MariaDB, có schema/seed/migration trong thư mục `database`.

### Tính năng chính

- Đăng nhập và phân quyền theo vai trò.
- Quản lý học sinh, giáo viên, phụ huynh, lớp học và môn học.
- Quản lý điểm số, chuyên cần, học phí, thời khóa biểu và thông báo.
- Dashboard thống kê, báo cáo và biểu đồ.
- Upload/tệp phục vụ nghiệp vụ quản lý.
- Dữ liệu mẫu để test nhanh trong môi trường local.

### Chạy local

Backend:

```bash
cd web-quan-ly-hoc-sinh/backend
copy .env.example .env
npm install
npm run dev
```

Frontend:

```bash
cd web-quan-ly-hoc-sinh/frontend
copy .env.example .env
npm install
npm run dev
```

Database:

```text
web-quan-ly-hoc-sinh/database/schema.sql
web-quan-ly-hoc-sinh/database/seed.sql
web-quan-ly-hoc-sinh/database/migration_hardening.sql
```

Xem thêm README riêng tại `web-quan-ly-hoc-sinh/README.md`.

## 2. App Android quản lý học sinh

Thư mục: `android-quan-ly-hoc-sinh`

Đây là app Android dành cho **học sinh** và **phụ huynh**, tập trung vào trải nghiệm mobile để theo dõi tình hình học tập và thông tin nhà trường.

### Công nghệ

- Kotlin.
- Android Gradle Plugin 8.5.2.
- Jetpack Compose + Material 3.
- Navigation Compose.
- Min SDK 26, Target SDK 34.
- Java/Kotlin target 17.

### Tính năng chính

- Màn hình đăng nhập/khởi động.
- Trang chủ tổng quan học tập.
- Xem điểm, chi tiết môn học và cập nhật điểm.
- Xem thời khóa biểu và lịch thi.
- Hồ sơ học sinh, thông tin phụ huynh, thông tin sức khỏe và liên hệ khẩn cấp.
- Chuyên cần, khen thưởng, tin nhắn, báo cáo, dịch vụ nhà trường.
- Cài đặt, điều khoản, quyền riêng tư, trợ giúp, thông tin liên hệ trường học và quản lý thiết bị.
- UI mobile theo Jetpack Compose với các component dùng chung.

### Chạy bằng Android Studio

1. Mở thư mục `android-quan-ly-hoc-sinh` bằng Android Studio.
2. Đợi Gradle sync.
3. Chọn device/emulator Android.
4. Run module `app`.

### Build APK

```bash
cd android-quan-ly-hoc-sinh
gradlew.bat assembleDebug
```

File APK sinh ra trong `app/build/outputs/apk/` và không được commit lên Git.

## 3. Web học tập

Thư mục: `web-hoc-tap`

Đây là nền tảng học tập/bài tập dành cho giáo viên và học sinh. Hệ thống có lớp học, bài tập, ngân hàng câu hỏi, quiz, phòng chơi realtime và AI chat hỗ trợ học tập.

### Vai trò

- **Admin**: quản lý người dùng, thống kê hệ thống và dữ liệu nền tảng.
- **Giáo viên**: tạo lớp, tạo bài tập, tạo đề/quiz, quản lý ngân hàng câu hỏi, chấm bài và xem kết quả.
- **Học sinh**: tham gia lớp, làm bài tập, chơi quiz realtime, xem kết quả và nhận thông báo.

### Công nghệ

- Frontend: Next.js 14, React 18, TypeScript, Tailwind CSS, Zustand, React Query, Socket.IO client.
- Backend: NestJS 10, Prisma, PostgreSQL, JWT, Passport, Socket.IO, Redis.
- Hạ tầng: Docker Compose cho PostgreSQL, Redis, backend, frontend và Nginx.

### Tính năng chính

- Xác thực người dùng và phân quyền theo `ADMIN`, `TEACHER`, `STUDENT`.
- Quản lý lớp học và thành viên lớp.
- Tạo bài tập, nộp bài, chấm điểm và phản hồi.
- Ngân hàng câu hỏi, quiz, kết quả học tập.
- Realtime game room, chế độ chơi quiz/live.
- Kho tài liệu, thư mục tài liệu, đồng bộ đề/bài tập từ tài liệu.
- AI chat, action widgets và công cụ hỗ trợ tạo nội dung học tập.
- Thông báo, audit log và dashboard quản trị.

### Chạy local

Backend:

```bash
cd web-hoc-tap/backend
npm install
copy .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

Frontend:

```bash
cd web-hoc-tap/frontend
npm install
npm run dev
```

Docker database/redis:

```bash
cd web-hoc-tap
docker compose up -d postgres redis
```

## Biến môi trường

Không commit `.env` thật lên GitHub. Các biến thường cần:

```env
DATABASE_URL=postgresql://user:password@localhost:5499/appdb?schema=public
JWT_SECRET=change_me_long_random_secret
JWT_EXPIRES_IN=7d
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=change_me
CORS_ORIGIN=http://localhost:3000
```

## Những file không đưa lên GitHub

Repo đã ignore các file/thư mục sinh ra khi chạy hoặc có thể chứa secret:

- `node_modules/`
- `.env`, `.env.*` trừ `.env.example`
- `local.properties`, keystore, APK/AAB
- `dist/`, `build/`, `.next/`, `.gradle/`, `.idea/`, `.kotlin/`, cache
- `uploads/`, `tmp/`, `logs/`

## Repository

GitHub: https://github.com/0kiyo/kiyoedu
