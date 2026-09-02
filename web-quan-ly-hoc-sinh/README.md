# Web Quản Lý Học Sinh

Frontend web cho hệ thống quản lý học sinh. Web này dùng backend chung tại `../api-quan-ly-hoc-sinh`.

## Vai Trò Sử Dụng

- Nhà trường/Admin.
- Giáo viên.
- Học sinh.
- Phụ huynh.

## Công Nghệ

- React.
- TypeScript.
- Vite.
- Tailwind CSS.
- Zustand.
- React Router.
- Axios.
- Recharts.

## Tính Năng

- Dashboard quản lý.
- Đăng nhập và phân quyền theo token từ backend.
- Quản lý học sinh, giáo viên, phụ huynh, lớp học và môn học.
- Quản lý điểm, chuyên cần, thời khóa biểu, học phí, thông báo và báo cáo.
- Hồ sơ cá nhân và đổi mật khẩu.
- AI advisor và thống kê.

## Chạy Local

Chạy backend trước:

```bash
cd ../api-quan-ly-hoc-sinh
copy .env.example .env
npm install
npm run dev
```

Chạy web:

```bash
copy .env.example .env
npm install
npm run dev
```

`.env` của web:

```env
VITE_API_URL=http://localhost:5000/api
VITE_ENABLE_DEMO_LOGIN=false
```

## Build

```bash
npm run build
```

## Bảo Mật

- Không commit `.env` thật.
- Không lưu token cố định trong source.
- Backend production cần chạy HTTPS và cấu hình `CLIENT_URL` đúng domain frontend.
