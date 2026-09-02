# KiyoEdu

KiyoEdu là repository tổng hợp hệ sinh thái giáo dục của `0kiyo`. Cấu trúc đã được chia lại để phần **quản lý học sinh** dùng một backend chung cho cả Web và App Android. Phần **Web học tập** được giữ nguyên.

## Cấu trúc repo

```text
kiyoedu/
├── student-management-backend/ # Backend chung cho Web quản lý học sinh và App Android
├── web-quan-ly-hoc-sinh/       # Frontend Web quản lý học sinh
├── android-quan-ly-hoc-sinh/   # App Android học sinh/phụ huynh
├── web-hoc-tap/                # Web học tập, giữ nguyên
├── .gitignore
└── README.md
```

## 1. Backend Quản Lý Học Sinh

Thư mục: `student-management-backend`

Đây là API trung tâm của module quản lý học sinh. Cả web và Android đều dùng chung backend này.

Vai trò hỗ trợ:

- **Nhà trường/Admin**: quản lý tài khoản, lớp học, giáo viên, học sinh, phụ huynh, báo cáo và cấu hình.
- **Giáo viên**: quản lý lớp, điểm, chuyên cần, thời khóa biểu và thông báo.
- **Học sinh**: xem hồ sơ, điểm, lịch học, thông báo và dữ liệu học tập của bản thân.
- **Phụ huynh**: theo dõi điểm, chuyên cần, thông báo và thông tin của con.

Công nghệ:

- Node.js + Express.
- MySQL/MariaDB.
- JWT, bcrypt.
- Helmet, CORS, rate limit.
- express-validator.
- Multer upload.

Chạy local:

```bash
cd student-management-backend
copy .env.example .env
npm install
npm run dev
```

API mặc định:

```text
http://localhost:5000/api
```

Database nằm trong:

```text
student-management-backend/database/schema.sql
student-management-backend/database/seed.sql
student-management-backend/database/migration_hardening.sql
```

## 2. Web Quản Lý Học Sinh

Thư mục: `web-quan-ly-hoc-sinh`

Đây là frontend web cho nhà trường, giáo viên, học sinh và phụ huynh. Web gọi API từ `student-management-backend`.

Công nghệ:

- React.
- TypeScript.
- Vite.
- Tailwind CSS.
- Zustand.
- React Router.
- Axios.
- Recharts.

Chạy local:

```bash
cd web-quan-ly-hoc-sinh
copy .env.example .env
npm install
npm run dev
```

`.env` của web:

```env
VITE_API_URL=http://localhost:5000/api
VITE_ENABLE_DEMO_LOGIN=false
```

## 3. App Android Quản Lý Học Sinh

Thư mục: `android-quan-ly-hoc-sinh`

Đây là app Android cho học sinh và phụ huynh. App đã có API client để đăng nhập qua backend chung.

Công nghệ:

- Kotlin.
- Jetpack Compose + Material 3.
- Navigation Compose.
- Android Gradle Plugin 8.5.2.
- Min SDK 26, Target SDK 34.

Chạy bằng Android Studio:

1. Mở thư mục `android-quan-ly-hoc-sinh`.
2. Đợi Gradle sync.
3. Chạy backend `student-management-backend`.
4. Run module `app`.

URL backend mặc định cho Android Emulator:

```text
http://10.0.2.2:5000/api
```

URL này nằm trong `android-quan-ly-hoc-sinh/app/build.gradle.kts` tại `STUDENT_MANAGEMENT_API_URL`.

## 4. Web Học Tập

Thư mục: `web-hoc-tap`

Phần này giữ nguyên theo yêu cầu. Đây là nền tảng học tập/bài tập gồm lớp học, bài tập, ngân hàng câu hỏi, quiz realtime, phòng chơi và AI chat.

Công nghệ:

- Frontend: Next.js 14, React 18, TypeScript, Tailwind CSS, Zustand, React Query.
- Backend: NestJS 10, Prisma, PostgreSQL, JWT, Passport, Socket.IO, Redis.
- Hạ tầng: Docker Compose, PostgreSQL, Redis, Nginx.

Chạy local:

```bash
cd web-hoc-tap
docker compose up -d postgres redis
```

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

## File Không Đưa Lên GitHub

Repo đã ignore:

- `node_modules/`
- `.env`, `.env.*` trừ `.env.example`
- `local.properties`, keystore, APK/AAB
- `dist/`, `build/`, `.next/`, `.gradle/`, `.idea/`, `.kotlin/`
- `uploads/`, `tmp/`, `logs/`

## Repository

GitHub: https://github.com/0kiyo/kiyoedu
