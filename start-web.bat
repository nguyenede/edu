@echo off
chcp 65001 >nul
echo ===================================================
echo   KiyoEdu - Tự động cập nhật và khởi chạy Web
echo ===================================================

echo [1/3] Đang kéo code mới nhất từ GitHub...
git pull origin main

echo [2/3] Đang khởi động Backend API (Port 5000)...
start "API Quan Ly Hoc Sinh (Port 5000)" cmd /k "cd /d api-quan-ly-hoc-sinh && npm start"

echo [3/3] Đang khởi động Frontend Web...
start "Web Quan Ly Hoc Sinh (Port 5173)" cmd /k "cd /d web-quan-ly-hoc-sinh && npx vite --host"
start "Web Hoc Tap (Port 3000)" cmd /k "cd /d web-hoc-tap\frontend && npm run dev"

echo Đang mở trình duyệt...
timeout /t 3 >nul
start http://localhost:5173
start http://localhost:3000

echo Hoàn tất! Web đã được khởi chạy.
pause
