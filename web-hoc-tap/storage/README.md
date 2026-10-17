# HỆ THỐNG LƯU TRỮ VẬT LÝ & TƯƠNG THÍCH S3 (STORAGE ARCHITECTURE)

Thư mục này là nơi lưu trữ toàn bộ tệp vật lý cục bộ trên máy tính của bạn trước khi kết nối S3 cloud.

## Cấu trúc thư mục:

- `exams/`:
  Chứa toàn bộ các tệp đề thi thực tế dưới định dạng chuẩn **`.json`**. 
  Ví dụ: `exams/file_1740000000.json`.
  Mỗi file JSON chứa trọn vẹn thông tin đề thi: tiêu đề, thời gian làm bài, danh sách câu hỏi, các phương án A-B-C-D, đáp án đúng và lời giải chi tiết.

- `images/`:
  Chứa toàn bộ hình ảnh đính kèm trong câu hỏi, đề thi hoặc avatar.

- `documents/`:
  Chứa các tệp tài liệu gốc tải lên (PDF, DOCX, TXT...).

- `db/documents_metadata.json`:
  Cơ sở dữ liệu metadata của tài liệu.
  **LƯU Ý QUAN TRỌNG:** Cơ sở dữ liệu này **TUYỆT ĐỐI CHỈ LƯU ĐƯỜNG DẪN TỆP (`filePath`, `storageKey`), TÊN, KÍCH THƯỚC VÀ THỜI GIAN TẠO**. Hoàn toàn KHÔNG lưu nội dung JSON câu hỏi trong DB.

## Sẵn sàng chuyển giao sang S3 Cloud (S3-Compatible Storage):
Khi bạn cấu hình các biến môi trường sau vào `.env`:
```env
S3_ENDPOINT=https://s3.ap-southeast-1.amazonaws.com # hoặc Cloudflare R2, MinIO, Wasabi
S3_REGION=ap-southeast-1
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET=appbaitap-exams
S3_FORCE_PATH_STYLE=false
```
Hệ thống `UnifiedStorageService` sẽ tự động chuyển từ chế độ ổ đĩa cục bộ sang Cloud S3 mà **không cần thay đổi bất kỳ dòng code nào**!
