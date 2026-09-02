# Web Học Tập

Nền tảng học tập, bài tập và quiz realtime cho giáo viên, học sinh và quản trị viên. Project gồm backend NestJS, frontend Next.js, PostgreSQL/Prisma và Redis cho realtime.

## Thành phần

- `backend`: NestJS API, xác thực, lớp học, bài tập, quiz, realtime, AI chat, tài liệu và quản trị.
- `frontend`: Next.js UI cho admin, giáo viên và học sinh.
- `nginx`: cấu hình reverse proxy khi deploy Docker.
- `docker-compose.yml`: PostgreSQL và Redis local.
- `docker-compose.prod.yml`: cấu hình production mẫu cho full stack.

## Công nghệ

- Backend: NestJS 10, Prisma, PostgreSQL, JWT, Passport, Socket.IO, Redis.
- Frontend: Next.js 14, React 18, TypeScript, Tailwind CSS, Zustand, React Query.
- Realtime: Socket.IO + Redis.
- Database: PostgreSQL qua Prisma migrations.

## Tính năng

- Đăng ký, đăng nhập và phân quyền `ADMIN`, `TEACHER`, `STUDENT`.
- Admin dashboard, quản lý người dùng và thống kê hệ thống.
- Giáo viên tạo lớp học, bài tập, quiz và ngân hàng câu hỏi.
- Học sinh tham gia lớp, làm bài, nộp bài và xem kết quả.
- Quiz realtime/live game room.
- Kho tài liệu, thư mục tài liệu và liên kết tài liệu với bài tập.
- AI chat hỗ trợ tạo nội dung học tập, câu hỏi và lớp học.
- Thông báo, audit log và realtime gateway.

## Chạy local

Khởi động PostgreSQL và Redis:

```bash
docker compose up -d postgres redis
```

Backend:

```bash
cd backend
npm install
copy .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Biến môi trường backend

Tạo `backend/.env` theo mẫu:

```env
DATABASE_URL=postgresql://appuser:change_me@localhost:5499/appdb?schema=public
JWT_SECRET=change_me_long_random_secret
JWT_EXPIRES_IN=7d
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=change_me
CORS_ORIGIN=http://localhost:3000
```

## Prisma

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
```

## Deploy Docker

Trước khi dùng file production, tạo biến môi trường thật cho database, Redis và JWT:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## Bảo mật

- Không commit `.env` thật.
- Không dùng `change_me` hoặc secret mẫu khi deploy.
- Đổi `JWT_SECRET`, `POSTGRES_PASSWORD`, `REDIS_PASSWORD` trước khi chạy production.
