# Android Quản Lý Học Sinh

App Android dành cho học sinh và phụ huynh trong hệ sinh thái KiyoEdu. Ứng dụng giúp theo dõi học tập, điểm số, lịch học, thông báo và các dịch vụ nhà trường trên thiết bị di động.

## Công nghệ

- Kotlin.
- Jetpack Compose.
- Material 3.
- Navigation Compose.
- Android Gradle Plugin 8.5.2.
- Compile SDK 34, Min SDK 26, Target SDK 34.
- Java/Kotlin target 17.

## Tính năng

- Đăng nhập và luồng khởi động app.
- Trang chủ tổng quan học tập.
- Xem điểm, chi tiết môn học và tiến độ học tập.
- Xem thời khóa biểu, lịch học và lịch thi.
- Hồ sơ học sinh và thông tin phụ huynh.
- Chuyên cần, khen thưởng, tin nhắn, báo cáo, dịch vụ nhà trường.
- Cài đặt, quyền riêng tư, điều khoản, trợ giúp, liên hệ trường và quản lý thiết bị.
- Component UI dùng chung cho form, tab, card, dialog, bottom sheet và trạng thái loading/error.

## Cấu trúc chính

```text
android-quan-ly-hoc-sinh/
├── app/
│   └── src/main/java/com/app/quanlyhocsinh/
│       ├── core/          # Theme, token thiết kế, tiện ích
│       ├── data/          # Model và dữ liệu mock
│       ├── features/      # Các màn hình theo nghiệp vụ
│       ├── shared/        # Component dùng chung
│       └── state/         # ViewModel/state
├── gradle/
├── build.gradle.kts
├── settings.gradle.kts
└── gradlew.bat
```

## Chạy bằng Android Studio

1. Mở thư mục này bằng Android Studio.
2. Đợi Gradle sync xong.
3. Chọn emulator hoặc máy Android thật.
4. Run module `app`.

## Build APK debug

```bash
gradlew.bat assembleDebug
```

APK debug sẽ nằm trong:

```text
app/build/outputs/apk/debug/
```

## Lưu ý

- File `local.properties`, APK/AAB và keystore không được commit lên GitHub.
- Nếu sau này app kết nối API thật, nên đặt base URL/API key qua cấu hình build hoặc file local không commit.
