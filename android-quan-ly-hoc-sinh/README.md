# Android Quản Lý Học Sinh

App Android dành cho học sinh và phụ huynh trong hệ sinh thái KiyoEdu. App dùng backend chung tại `../student-management-backend`.

## Công Nghệ

- Kotlin.
- Jetpack Compose.
- Material 3.
- Navigation Compose.
- Android Gradle Plugin 8.5.2.
- Compile SDK 34, Min SDK 26, Target SDK 34.
- Java/Kotlin target 17.

## Tính Năng

- Đăng nhập qua API chung `/api/auth/login`.
- Trang chủ tổng quan học tập.
- Xem điểm, chi tiết môn học và tiến độ học tập.
- Xem thời khóa biểu, lịch học và lịch thi.
- Hồ sơ học sinh và thông tin phụ huynh.
- Chuyên cần, khen thưởng, tin nhắn, báo cáo, dịch vụ nhà trường.
- Cài đặt, quyền riêng tư, điều khoản, trợ giúp, liên hệ trường và quản lý thiết bị.
- Component UI dùng chung cho form, tab, card, dialog, bottom sheet và trạng thái loading/error.

## Cấu Trúc Chính

```text
android-quan-ly-hoc-sinh/
├── app/
│   └── src/main/java/com/app/quanlyhocsinh/
│       ├── core/          # Theme, token thiết kế, tiện ích
│       ├── data/
│       │   ├── mock/      # Dữ liệu mock cho màn hình chưa nối API
│       │   ├── models/    # Model học sinh/phụ huynh/lịch/điểm
│       │   ├── remote/    # API client gọi student-management-backend
│       │   └── repository/
│       ├── features/      # Các màn hình theo nghiệp vụ
│       ├── shared/        # Component dùng chung
│       └── state/         # ViewModel/state
├── gradle/
├── build.gradle.kts
├── settings.gradle.kts
└── gradlew.bat
```

## Kết Nối Backend Chung

Chạy backend:

```bash
cd ../student-management-backend
copy .env.example .env
npm install
npm run dev
```

API mặc định cho Android Emulator:

```text
http://10.0.2.2:5000/api
```

URL này nằm trong `app/build.gradle.kts`:

```kotlin
buildConfigField("String", "STUDENT_MANAGEMENT_API_URL", "\"http://10.0.2.2:5000/api\"")
```

Khi chạy trên điện thoại thật, đổi URL thành IP LAN của máy đang chạy backend, ví dụ:

```text
http://192.168.1.10:5000/api
```

## Chạy Bằng Android Studio

1. Mở thư mục này bằng Android Studio.
2. Đợi Gradle sync xong.
3. Chạy `student-management-backend`.
4. Chọn emulator hoặc máy Android thật.
5. Run module `app`.

## Build APK Debug

```bash
gradlew.bat assembleDebug
```

APK debug sẽ nằm trong:

```text
app/build/outputs/apk/debug/
```

## Lưu Ý

- File `local.properties`, APK/AAB và keystore không được commit lên GitHub.
- Không hard-code API key, token hoặc secret vào source Android.
- Hiện app đã login qua backend chung; các màn hình dữ liệu còn lại vẫn có thể tiếp tục được nối API dần theo endpoint trong `StudentManagementApi.kt`.
