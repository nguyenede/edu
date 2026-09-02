Bạn là một AI Senior Fullstack Developer + UI/UX Engineer + Database Architect.

Nhiệm vụ của bạn là CODE HOÀN CHỈNH một dự án WEB quản lý học sinh/sinh viên lớn tên là:

"Student Management System"

KHÔNG viết app mobile.
KHÔNG viết web giới thiệu sản phẩm.
KHÔNG dùng Docker.
KHÔNG dùng Next.js.
KHÔNG dùng Laravel.
KHÔNG dùng MongoDB.
KHÔNG dùng PostgreSQL.
CHỈ CODE WEB quản lý chạy được trên local với XAMPP + MySQL.

==================================================
1. CÔNG NGHỆ BẮT BUỘC
==================================================

Dự án phải dùng đúng công nghệ sau:

{
  "project": "Student Management System",
  "description": "Web app quản lý học sinh, sinh viên lớn, chạy trực tiếp trên XAMPP",
  "tech_stack": {
    "frontend": "React + TypeScript",
    "backend": "Node.js + Express",
    "database": "MySQL trên XAMPP",
    "cache": "Redis là tuỳ chọn, không bắt buộc, có thể bỏ qua khi chạy local",
    "authentication": "JWT",
    "storage": "Local file upload, có thể mở rộng AWS S3 sau"
  }
}

Frontend:
- React 18+
- TypeScript
- Vite
- React Router DOM
- Axios
- Zustand hoặc Redux Toolkit để quản lý state
- React Hook Form
- Zod hoặc Yup để validate form
- TanStack Table hoặc tự code table nếu phù hợp
- CSS Modules hoặc SCSS hoặc Tailwind CSS
- Không dùng UI library nặng như Ant Design, MUI nếu không cần
- Giao diện phải tự thiết kế theo DESIGN.md

Backend:
- Node.js
- Express.js
- TypeScript hoặc JavaScript rõ ràng
- MySQL2
- JWT authentication
- bcrypt để hash password
- multer để upload file local
- cors
- dotenv
- express-validator hoặc zod server-side validation
- helmet
- morgan
- cookie-parser nếu cần

Database:
- MySQL chạy trong XAMPP
- Database name: student_management_system
- Charset: utf8mb4
- Collation: utf8mb4_unicode_ci

Local environment:
- Frontend chạy ở: http://localhost:5173
- Backend chạy ở: http://localhost:5000
- MySQL chạy qua XAMPP: localhost:3306
- User mặc định: root
- Password mặc định: rỗng hoặc cấu hình qua .env

==================================================
2. MỤC TIÊU DỰ ÁN
==================================================

Code một hệ thống web quản lý học sinh/sinh viên lớn, chuyên nghiệp, hiện đại, có thể dùng cho trường học, trung tâm giáo dục, cao đẳng, đại học hoặc hệ thống nhiều lớp học.

Hệ thống cần có các nhóm người dùng chính:

1. Admin
- Toàn quyền hệ thống
- Quản lý học sinh/sinh viên
- Quản lý giáo viên
- Quản lý lớp học
- Quản lý môn học
- Quản lý điểm
- Quản lý chuyên cần
- Quản lý thông báo
- Quản lý học phí
- Quản lý tài khoản
- Quản lý phân quyền
- Xem báo cáo thống kê
- Upload file, avatar, tài liệu

2. Teacher
- Xem danh sách lớp được phân công
- Xem học sinh trong lớp
- Nhập điểm
- Cập nhật chuyên cần
- Gửi thông báo cho lớp
- Xem lịch dạy
- Cập nhật nhận xét học sinh

3. Student
- Xem thông tin cá nhân
- Xem điểm
- Xem lịch học
- Xem học phí
- Xem thông báo
- Cập nhật avatar cá nhân nếu được phép

4. Parent
- Xem thông tin con
- Xem điểm
- Xem chuyên cần
- Xem học phí
- Xem thông báo từ trường
- Xem nhận xét giáo viên

Hệ thống phải có phân quyền rõ ràng theo role.

==================================================
3. YÊU CẦU GIAO DIỆN TỔNG THỂ
==================================================

Giao diện phải giống 100% mô tả trong file DESIGN.md.

Phong cách giao diện:
- Sạch
- Đẹp
- Tối giản
- Cao cấp
- Rộng rãi
- Nhiều khoảng trắng
- Cảm giác giống Apple
- Không màu mè
- Không gradient lòe loẹt
- Không shadow nặng
- Không bo góc quá nhiều
- Không dùng quá nhiều màu
- Tập trung vào nội dung, typography, spacing, clarity

Cảm giác visual:
- Premium
- Calm
- Professional
- Clean
- Modern
- Smooth
- Fast
- Polished

Màu sắc bắt buộc:

Primary Action Blue:
- #0071E3

Primary Blue Hover:
- #006EDB

Primary Blue Press:
- #0076DF

Interactive Blue Deep:
- #0077ED

Text Dominant:
- #1D1D1F

Text Secondary:
- #333336

Text Tertiary:
- #6E6E73

Text Inverse:
- #000000

Background chính:
- #FFFFFF

Surface Light:
- #EDEDF2

Navigation Surface:
- rgba(255, 255, 255, 0.8)

Border Implicit:
- rgba(0, 0, 0, 0.56)

Overlay Soft:
- rgba(0, 0, 0, 0.8)

Dark Medium:
- #272729

Dark Deep:
- #18181A

Không được tự thêm màu accent khác nếu không cần.
Tất cả primary button, active tab, link quan trọng, trạng thái selected phải dùng #0071E3.

==================================================
4. FONT VÀ TYPOGRAPHY
==================================================

Dùng font stack:

font-family:
"SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

Headline font:
"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

Quy tắc typography:

Display Hero:
- font-family: SF Pro Display
- font-size: 40px
- font-weight: 600
- line-height: 44px
- letter-spacing: 0px
- color: #1D1D1F

Heading Large:
- font-family: SF Pro Display
- font-size: 28px
- font-weight: 400
- line-height: 32px
- color: #1D1D1F

Heading Primary:
- font-family: SF Pro Display
- font-size: 24px
- font-weight: 600
- line-height: 28px
- color: #1D1D1F

Heading Secondary:
- font-family: SF Pro Text
- font-size: 34px
- font-weight: 600
- line-height: 50px
- color: #1D1D1F

Body Default:
- font-family: SF Pro Text
- font-size: 17px
- font-weight: 400
- line-height: 25px
- color: #1D1D1F

Body Compact:
- font-family: SF Pro Text
- font-size: 17px
- font-weight: 400
- line-height: 21px

Small Label:
- font-size: 12px
- font-weight: 400
- line-height: 16px
- color: #6E6E73

Eyebrow:
- font-size: 12px
- font-weight: 400
- line-height: 16px
- color: #6E6E73

Button:
- font-size: 17px
- font-weight: 400
- line-height: 25px

Link:
- font-size: 17px
- font-weight: 600
- line-height: 21px
- color: #0071E3

Không dùng quá nhiều font-size trong cùng một màn hình.
Ưu tiên tạo phân cấp bằng font-weight, spacing, layout thay vì màu sắc quá nhiều.

==================================================
5. LAYOUT SYSTEM
==================================================

Base spacing unit:
- 4px

Spacing scale:
- 8px: khoảng cách nhỏ
- 12px: margin nhỏ giữa component liên quan
- 16px: padding chuẩn
- 20px: margin section nhỏ
- 24px: padding thoải mái cho card
- 28px: khoảng cách section phụ
- 32px: padding card lớn
- 40px: section spacing lớn
- 44px: chiều cao tối thiểu cho touch target
- 48px: padding hero
- 52px: gap lớn
- 56px: section spacing tối đa

Container:
- max-width: 1262px
- margin-left/right: auto
- padding-left/right desktop: 24px
- padding-left/right tablet: 24px
- padding-left/right mobile: 16px

Desktop:
- width >= 1024px
- sidebar cố định bên trái
- content nằm bên phải
- grid 3 cột cho dashboard card
- max-width content: 1262px

Tablet:
- 768px đến 1023px
- grid 2 cột
- sidebar có thể thu nhỏ
- padding giảm còn 24px - 32px

Mobile:
- 320px đến 767px
- 1 cột
- sidebar chuyển thành drawer
- top nav có hamburger
- mọi button cao tối thiểu 44px
- bảng có horizontal scroll
- form full width
- modal gần full screen

==================================================
6. COMPONENT STYLE BẮT BUỘC
==================================================

6.1 Primary Button

Style:
- background: #0071E3
- color: #FFFFFF
- font-family: SF Pro Text
- font-size: 17px
- font-weight: 400
- line-height: 25px
- padding: 12px 24px
- min-height: 44px
- border-radius: 999px hoặc 50%
- border: none
- box-shadow: none
- display: inline-flex
- align-items: center
- justify-content: center
- gap: 8px
- transition: background-color 180ms ease, transform 180ms ease, opacity 180ms ease

Hover:
- background: #006EDB
- cursor: pointer
- transform: translateY(-1px)

Active:
- background: #0076DF
- transform: translateY(0px) scale(0.99)

Disabled:
- opacity: 0.45
- cursor: not-allowed
- transform: none

6.2 Secondary Button

Style:
- background: transparent
- color: #0071E3
- border: 2px solid #0071E3
- padding: 12px 24px
- min-height: 44px
- border-radius: 999px
- font-size: 17px
- font-weight: 400
- transition: all 180ms ease

Hover:
- background: rgba(0, 113, 227, 0.05)
- border-color: #006EDB
- color: #006EDB

Active:
- border-color: #0076DF
- color: #0076DF
- transform: scale(0.99)

6.3 Ghost Button

Style:
- background: transparent
- color: #1D1D1F
- padding: 12px 8px
- min-height: 44px
- border: none
- border-radius: 0px

Hover:
- background: rgba(0, 0, 0, 0.05)

Active:
- background: rgba(0, 0, 0, 0.08)

6.4 Input

Style:
- height: 44px
- background: #FFFFFF
- color: #1D1D1F
- placeholder-color: #6E6E73
- font-size: 17px
- font-weight: 400
- line-height: 25px
- padding: 12px 16px
- border-radius: 8px
- border: 1px solid #D5D5D7
- outline: none
- transition: border-color 180ms ease, box-shadow 180ms ease

Focus:
- border-color: #0071E3
- box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.1)

Error:
- border-color: #D70015
- box-shadow: 0 0 0 3px rgba(215, 0, 21, 0.08)

6.5 Label

Style:
- font-size: 12px
- font-weight: 600
- line-height: 16px
- color: #1D1D1F
- margin-bottom: 8px
- display: block

6.6 Card

Feature Card:
- background: #FFFFFF hoặc transparent tùy context
- border: 1px solid #EDEDF2
- border-radius: 0px
- padding: 32px 40px
- box-shadow: none
- transition: border-color 180ms ease, transform 180ms ease

Hover:
- border-color: rgba(0, 113, 227, 0.25)
- transform: translateY(-1px)

Dashboard Stat Card:
- background: #FFFFFF
- border: 1px solid #EDEDF2
- border-radius: 0px
- padding: 32px
- min-height: 160px
- display: flex
- flex-direction: column
- justify-content: space-between
- box-shadow: none

6.7 Modal

Style:
- width desktop: 640px
- max-width: calc(100vw - 32px)
- background: #FFFFFF
- border: 1px solid #EDEDF2
- border-radius: 0px
- box-shadow: 0 12px 32px rgba(0, 0, 0, 0.16)
- padding: 0
- animation: modalFadeScaleIn 180ms ease

Modal overlay:
- position fixed
- inset 0
- background: rgba(0, 0, 0, 0.35)
- backdrop-filter: blur(8px)
- display flex
- align-items center
- justify-content center
- z-index 1000

Modal header:
- height: 72px
- padding: 0 32px
- border-bottom: 1px solid #EDEDF2
- display flex
- align-items center
- justify-content space-between

Modal body:
- padding: 32px
- max-height: calc(100vh - 220px)
- overflow-y: auto

Modal footer:
- min-height: 76px
- padding: 16px 32px
- border-top: 1px solid #EDEDF2
- display flex
- justify-content flex-end
- gap: 12px

6.8 Toast

Vị trí:
- top: 24px
- right: 24px
- z-index: 2000

Toast success:
- background: #FFFFFF
- border-left: 4px solid #0071E3
- color: #1D1D1F
- box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15)

Toast error:
- background: #FFFFFF
- border-left: 4px solid #D70015
- color: #1D1D1F

Toast style:
- width: 360px
- min-height: 64px
- padding: 16px
- border: 1px solid #EDEDF2
- border-radius: 0px
- animation: toastSlideIn 220ms ease
- auto close sau 3000ms

6.9 Table

Table container:
- width: 100%
- background: #FFFFFF
- border: 1px solid #EDEDF2
- border-radius: 0px
- overflow: hidden

Table header:
- height: 52px
- background: #FFFFFF
- border-bottom: 1px solid #EDEDF2

TH:
- padding: 0 16px
- font-size: 12px
- font-weight: 600
- line-height: 16px
- color: #6E6E73
- text-align: left
- text-transform: uppercase
- letter-spacing: 0.02em

Row:
- height: 56px
- border-bottom: 1px solid #EDEDF2
- transition: background-color 160ms ease

Row hover:
- background: rgba(0, 113, 227, 0.035)

TD:
- padding: 0 16px
- font-size: 15px hoặc 17px
- color: #1D1D1F

Action cell:
- display flex
- gap 8px
- justify-content flex-end

6.10 Badge

Role badge:
- height: 28px
- padding: 0 10px
- border-radius: 999px
- font-size: 12px
- font-weight: 600
- display inline-flex
- align-items center
- justify-content center

Admin:
- background: rgba(0, 113, 227, 0.1)
- color: #0071E3

Teacher:
- background: rgba(29, 29, 31, 0.08)
- color: #1D1D1F

Student:
- background: rgba(110, 110, 115, 0.12)
- color: #333336

Parent:
- background: rgba(0, 0, 0, 0.06)
- color: #333336

==================================================
7. HIỆU ỨNG VÀ ANIMATION
==================================================

Tất cả hiệu ứng phải mượt, nhẹ, tinh tế, không phô trương.

Transition mặc định:
- 160ms đến 220ms
- easing: cubic-bezier(0.2, 0, 0, 1)

Page transition:
- opacity từ 0 đến 1
- transform translateY(8px) về 0
- duration 220ms

Button hover:
- translateY(-1px)
- background đổi nhẹ

Button active:
- scale(0.99)

Card hover:
- translateY(-1px)
- border đổi nhẹ sang rgba(0, 113, 227, 0.25)

Modal:
- fade in
- scale từ 0.98 đến 1
- duration 180ms

Dropdown:
- fade + slide down 6px
- duration 160ms

Sidebar item:
- hover background rgba(0, 0, 0, 0.05)
- active text #0071E3
- active background rgba(0, 113, 227, 0.08)

Không dùng animation quá mạnh.
Không dùng bounce.
Không dùng neon.
Không dùng shadow đậm.

==================================================
8. CẤU TRÚC THƯ MỤC
==================================================

Tạo project dạng monorepo đơn giản:

student-management-system/
  frontend/
    src/
      app/
        App.tsx
        router.tsx
      assets/
      components/
        ui/
          Button.tsx
          Input.tsx
          Select.tsx
          Modal.tsx
          Toast.tsx
          Table.tsx
          Badge.tsx
          Avatar.tsx
          Dropdown.tsx
          Pagination.tsx
          EmptyState.tsx
          LoadingSpinner.tsx
          ConfirmDialog.tsx
        layout/
          AuthLayout.tsx
          DashboardLayout.tsx
          TopBar.tsx
          Sidebar.tsx
          MobileDrawer.tsx
          Breadcrumb.tsx
      features/
        auth/
        dashboard/
        students/
        teachers/
        classes/
        subjects/
        grades/
        attendance/
        payments/
        notifications/
        reports/
        settings/
      hooks/
      lib/
        api.ts
        auth.ts
        validators.ts
        constants.ts
        formatters.ts
      store/
      styles/
        globals.css
        design-tokens.css
      types/
      main.tsx
    package.json
    vite.config.ts
    tsconfig.json

  backend/
    src/
      config/
        database.js
        env.js
      controllers/
        auth.controller.js
        user.controller.js
        student.controller.js
        teacher.controller.js
        class.controller.js
        subject.controller.js
        grade.controller.js
        attendance.controller.js
        payment.controller.js
        notification.controller.js
        report.controller.js
        upload.controller.js
      middlewares/
        auth.middleware.js
        role.middleware.js
        error.middleware.js
        upload.middleware.js
        validate.middleware.js
      routes/
        auth.routes.js
        user.routes.js
        student.routes.js
        teacher.routes.js
        class.routes.js
        subject.routes.js
        grade.routes.js
        attendance.routes.js
        payment.routes.js
        notification.routes.js
        report.routes.js
        upload.routes.js
      services/
      utils/
        jwt.js
        password.js
        response.js
        pagination.js
      uploads/
        avatars/
        documents/
      server.js
    package.json
    .env.example

  database/
    schema.sql
    seed.sql

  README.md

==================================================
9. ROUTES FRONTEND
==================================================

Public routes:
- /login
- /forgot-password
- /reset-password

Protected routes:
- /
- /dashboard
- /students
- /students/create
- /students/:id
- /students/:id/edit
- /teachers
- /teachers/create
- /teachers/:id
- /classes
- /classes/create
- /classes/:id
- /subjects
- /grades
- /attendance
- /payments
- /notifications
- /reports
- /settings
- /profile

Redirect:
- / chuyển về /dashboard nếu đã login
- / chuyển về /login nếu chưa login

Role guard:
- Admin truy cập tất cả
- Teacher truy cập dashboard, students read, classes assigned, grades, attendance, notifications
- Student truy cập dashboard cá nhân, profile, grades, attendance, payments, notifications
- Parent truy cập dashboard phụ huynh, children, grades, attendance, payments, notifications

==================================================
10. MÀN HÌNH LOGIN
==================================================

URL:
- /login

Layout:
- Full screen
- Background #FFFFFF
- Chia 2 cột desktop

Desktop:
- Left panel width: 50%
- Right panel width: 50%
- Container max width: 1262px
- Center theo chiều ngang và dọc

Left panel:
- Padding: 48px
- Hiển thị headline lớn:
  "Quản lý học sinh, sinh viên thông minh hơn."
- Font: SF Pro Display
- Size: 40px
- Weight: 600
- Line-height: 44px
- Color: #1D1D1F
- Max-width: 520px

Sub text:
- "Một hệ thống web sạch, nhanh và bảo mật để quản lý học sinh, lớp học, điểm số, chuyên cần và học phí."
- Font-size: 17px
- Line-height: 25px
- Color: #333336
- Margin-top: 20px
- Max-width: 520px

Feature list:
- margin-top: 40px
- item height: 44px
- icon 20px
- text 17px
- gap 12px
- items:
  - Quản lý học sinh tập trung
  - Theo dõi điểm và chuyên cần
  - Phân quyền Admin, Teacher, Student, Parent
  - Báo cáo rõ ràng theo thời gian thực

Right panel:
- display flex
- align-items center
- justify-content center
- padding 48px

Login card:
- width: 420px
- background: #FFFFFF
- border: 1px solid #EDEDF2
- border-radius: 0px
- padding: 40px
- box-shadow: none

Card title:
- "Đăng nhập"
- font-size: 28px
- font-weight: 600
- line-height: 32px
- color: #1D1D1F

Card subtitle:
- "Nhập tài khoản của bạn để tiếp tục."
- font-size: 17px
- line-height: 25px
- color: #6E6E73
- margin-top: 8px

Form:
- margin-top: 32px
- display flex column
- gap 20px

Email input:
- label: "Email"
- type: email
- placeholder: "admin@school.com"
- height 44px

Password input:
- label: "Mật khẩu"
- type password
- placeholder: "Nhập mật khẩu"

Remember row:
- display flex
- justify-content space-between
- align-items center
- margin-top 4px

Login button:
- full width
- height 44px
- text "Đăng nhập"
- background #0071E3
- border-radius 999px

Error:
- Nếu sai tài khoản:
  - hiện toast error
  - text: "Email hoặc mật khẩu không đúng."
  - input border đỏ nếu cần

Responsive:
- Tablet: giữ 2 cột nhưng padding 32px
- Mobile:
  - 1 cột
  - ẩn hoặc đưa left panel lên trên
  - login card full width
  - padding 24px
  - headline giảm còn 32px

Demo accounts seed:
- admin@school.com / 123456
- teacher@school.com / 123456
- student@school.com / 123456
- parent@school.com / 123456

==================================================
11. DASHBOARD LAYOUT
==================================================

DashboardLayout gồm:
- Sidebar bên trái
- TopBar phía trên content
- Main content
- Mobile drawer

Desktop sidebar:
- width: 260px
- height: 100vh
- position fixed
- left 0
- top 0
- background #FFFFFF
- border-right 1px solid #EDEDF2
- padding: 20px 16px

Logo area:
- height: 44px
- display flex
- align-items center
- padding 0 8px
- margin-bottom 28px

Logo:
- text "StudentOS"
- font-size 24px
- font-weight 600
- color #1D1D1F

Nav list:
- display flex column
- gap 4px

Nav item:
- height 44px
- padding 0 12px
- display flex
- align-items center
- gap 12px
- color #333336
- font-size 17px
- font-weight 400
- border-radius 0px
- text-decoration none
- transition all 160ms ease

Nav item hover:
- background rgba(0, 0, 0, 0.05)
- color #0071E3

Nav item active:
- background rgba(0, 113, 227, 0.08)
- color #0071E3
- font-weight 600

Sidebar footer:
- position absolute
- bottom 20px
- left 16px
- right 16px

User mini profile:
- height 56px
- display flex
- align-items center
- gap 12px
- border-top 1px solid #EDEDF2
- padding-top 16px

Avatar:
- width 36px
- height 36px
- border-radius 50%
- object-fit cover

Main wrapper desktop:
- margin-left 260px
- min-height 100vh
- background #FFFFFF

TopBar:
- height 64px
- position sticky
- top 0
- z-index 50
- background rgba(255, 255, 255, 0.8)
- backdrop-filter blur(20px)
- border-bottom 1px solid rgba(0, 0, 0, 0.1)
- padding 0 32px
- display flex
- align-items center
- justify-content space-between

TopBar left:
- breadcrumb
- current page title

TopBar right:
- search button
- notification bell
- user dropdown

Content:
- padding 40px 32px 56px
- max-width 1262px
- margin 0 auto

Mobile:
- sidebar hidden
- topbar height 56px
- hamburger button visible
- content padding 24px 16px 40px
- drawer width 300px
- overlay blur

==================================================
12. DASHBOARD PAGE
==================================================

URL:
- /dashboard

Header:
- Eyebrow: "Tổng quan"
- Title: "Xin chào, {user.name}"
- Subtitle: "Đây là tình hình hoạt động mới nhất của hệ thống hôm nay."
- Spacing:
  - margin-bottom 40px

Title:
- font-size 40px desktop
- font-weight 600
- line-height 44px
- color #1D1D1F

Stats grid:
- desktop: 4 cột
- tablet: 2 cột
- mobile: 1 cột
- gap 20px

Stat cards:
1. Tổng học sinh
2. Tổng giáo viên
3. Lớp đang hoạt động
4. Khoản học phí chờ thanh toán

Card size:
- min-height 160px
- padding 32px
- border 1px solid #EDEDF2

Card label:
- font-size 12px
- color #6E6E73
- text-transform uppercase
- font-weight 600

Card value:
- font-size 34px
- font-weight 600
- line-height 50px
- color #1D1D1F
- margin-top 16px

Card meta:
- font-size 17px
- color #333336
- margin-top 8px

Below grid:
- Two columns desktop:
  - left width 2fr
  - right width 1fr
- gap 20px
- margin-top 20px

Recent students table:
- title "Học sinh mới"
- hiển thị 5 học sinh mới nhất
- columns:
  - Học sinh
  - Lớp
  - Trạng thái
  - Ngày tạo

Activity feed:
- title "Hoạt động gần đây"
- item height auto
- gap 16px
- có timeline dot màu #0071E3
- text 15px
- timestamp 12px #6E6E73

Chart section:
- margin-top 20px
- card full width
- title "Tăng trưởng học sinh"
- chart đơn giản theo tháng
- không dùng màu nhiều, chỉ dùng blue #0071E3 và gray #EDEDF2

Loading state:
- skeleton cards
- shimmer rất nhẹ
- background #F5F5F7

Empty state:
- icon line đơn giản
- title
- description
- primary action

==================================================
13. STUDENT MANAGEMENT PAGE
==================================================

URL:
- /students

Mục tiêu:
Quản lý toàn bộ học sinh/sinh viên.

Header:
- Eyebrow: "Quản lý"
- Title: "Học sinh"
- Subtitle: "Tìm kiếm, thêm mới, chỉnh sửa và quản lý hồ sơ học sinh."
- Right action: Button "Thêm học sinh"

Header layout:
- desktop flex justify-between align-end
- mobile column gap 20px

Toolbar:
- margin-top 32px
- height auto
- display flex
- justify-content space-between
- gap 12px
- flex-wrap wrap

Search input:
- width desktop 360px
- mobile 100%
- height 44px
- placeholder "Tìm theo tên, mã học sinh, email..."

Filter group:
- Class dropdown width 180px
- Status dropdown width 160px
- Gender dropdown width 160px
- Reset filter ghost button

Table:
Columns:
1. Checkbox
   - width 48px

2. Mã học sinh
   - width 140px
   - text dạng STU000001
   - font-weight 600

3. Học sinh
   - width 280px
   - avatar 36x36
   - name font-size 15/17, weight 600
   - email font-size 12, color #6E6E73

4. Lớp
   - width 120px

5. Giới tính
   - width 100px

6. Ngày sinh
   - width 140px

7. Số điện thoại
   - width 150px

8. Trạng thái
   - width 130px
   - badge active/inactive

9. Hành động
   - width 160px
   - view/edit/delete

Row height:
- 64px

Actions:
- View icon button
- Edit icon button
- Delete icon button

Delete:
- mở confirm modal
- title: "Xóa học sinh?"
- description: "Hành động này không thể hoàn tác. Hồ sơ học sinh sẽ bị xóa khỏi hệ thống."
- Cancel button secondary
- Delete button primary nhưng có thể dùng màu đỏ chỉ cho destructive nếu cần
- Sau khi xóa thành công: toast "Đã xóa học sinh."

Pagination:
- bottom table
- height 64px
- left: "Hiển thị 1-10 trong 120 học sinh"
- right: Previous / page numbers / Next
- button height 44px
- active page màu #0071E3

Bulk action:
- nếu chọn checkbox:
  - hiện bar phía trên table
  - text: "Đã chọn X học sinh"
  - button: Xóa, Xuất Excel

==================================================
14. ADD / EDIT STUDENT FORM
==================================================

URL:
- /students/create
- /students/:id/edit

Form layout:
- max-width 960px
- background #FFFFFF
- border 1px solid #EDEDF2
- padding 40px
- border-radius 0px

Sections:
1. Thông tin cơ bản
2. Thông tin liên hệ
3. Thông tin học tập
4. Phụ huynh
5. Ghi chú và hồ sơ

Section title:
- font-size 24px
- font-weight 600
- margin-bottom 24px

Grid:
- desktop 2 columns
- gap 20px
- mobile 1 column

Fields:

Thông tin cơ bản:
- Avatar upload
  - preview 96x96
  - border-radius 50%
  - upload button height 44px
- Full name
  - required
  - min 2
  - max 100
- Student code
  - auto generate nếu create
  - readonly nếu edit
- Gender
  - select: male, female, other
- Date of birth
  - date input
- National ID nếu có
- Status
  - active, inactive, graduated, suspended

Thông tin liên hệ:
- Email
- Phone
- Address
- City/Province
- Ward/District

Thông tin học tập:
- Class
  - select từ database
- Admission date
- Academic year
- Student type
  - regular, transfer, scholarship

Phụ huynh:
- Parent name
- Parent phone
- Parent email
- Relationship
  - father, mother, guardian

Ghi chú:
- textarea
- min-height 120px
- placeholder "Nhập ghi chú nội bộ..."

Validation:
- Full name required
- Email đúng format
- Phone 10-11 số
- Date of birth không được ở tương lai
- Class required
- Parent phone required nếu parent name có nhập

Submit:
- Button "Lưu học sinh"
- Loading state: spinner + text "Đang lưu..."
- Success:
  - toast "Đã lưu học sinh."
  - redirect về /students hoặc giữ lại tùy context
- Error:
  - hiển thị lỗi dưới từng input
  - toast lỗi tổng quát

==================================================
15. STUDENT DETAIL PAGE
==================================================

URL:
- /students/:id

Layout:
- header profile
- tabs
- content theo tab

Profile header:
- card border 1px #EDEDF2
- padding 40px
- display flex
- gap 24px
- align center
- mobile column

Avatar:
- 112px x 112px
- border-radius 50%

Name:
- font-size 34px
- font-weight 600
- line-height 50px

Meta:
- student code
- class
- status badge
- email
- phone

Actions:
- Edit
- Print profile
- Delete

Tabs:
- Tổng quan
- Điểm số
- Chuyên cần
- Học phí
- Phụ huynh
- Tài liệu
- Lịch sử

Tab style:
- height 44px
- padding 0 16px
- color #333336
- active color #0071E3
- active border-bottom 2px solid #0071E3

Overview tab:
- grid 2 columns
- personal info card
- academic info card
- parent info card
- notes card

Grades tab:
- table điểm theo môn
- columns:
  - Môn
  - Điểm miệng
  - 15 phút
  - 1 tiết
  - Thi
  - Trung bình
  - Xếp loại

Attendance tab:
- calendar-like monthly view
- list absent/late records
- status badges:
  - present
  - absent
  - late
  - excused

Payments tab:
- invoices
- status paid/unpaid/overdue
- amount
- due date

Documents tab:
- upload document
- list files
- download/delete

History tab:
- timeline thay đổi dữ liệu
- ai audit logs

==================================================
16. TEACHER MANAGEMENT PAGE
==================================================

URL:
- /teachers

Giao diện tương tự students nhưng phù hợp giáo viên.

Fields:
- teacher_code
- full_name
- email
- phone
- gender
- date_of_birth
- specialization
- degree
- status
- avatar
- hire_date

Teacher detail:
- Profile
- Classes assigned
- Subjects
- Timetable
- Students
- Notes

Teacher table columns:
- Giáo viên
- Mã GV
- Chuyên môn
- Số lớp
- Số môn
- Trạng thái
- Hành động

==================================================
17. CLASS MANAGEMENT PAGE
==================================================

URL:
- /classes

Class list:
- Grid cards hoặc table
- Desktop grid 3 columns
- Tablet 2
- Mobile 1

Class card:
- padding 32px
- border 1px solid #EDEDF2
- title 24px weight 600
- teacher name
- student count
- academic year
- status
- actions

Class detail:
- /classes/:id

Tabs:
- Tổng quan
- Học sinh
- Môn học
- Giáo viên
- Lịch học
- Điểm
- Chuyên cần

Create class fields:
- class_name
- class_code
- grade_level
- academic_year
- homeroom_teacher_id
- room
- max_students
- status

==================================================
18. SUBJECT MANAGEMENT PAGE
==================================================

URL:
- /subjects

Subject table:
- subject_code
- subject_name
- description
- credit hoặc periods_per_week
- status
- actions

Subject form:
- name required
- code unique
- description textarea
- periods_per_week number

==================================================
19. GRADES PAGE
==================================================

URL:
- /grades

Mục tiêu:
- Admin/Teacher nhập điểm
- Student/Parent xem điểm

Filters:
- Class
- Subject
- Semester
- Academic year
- Search student

Grade table:
Columns:
- Student
- Class
- Oral score
- 15-min score
- 45-min score
- Midterm
- Final
- Average
- Grade letter
- Actions

Input mode:
- Teacher có thể click vào cell điểm để chỉnh inline
- Khi blur hoặc Enter:
  - validate điểm 0-10
  - save API
  - hiển thị loading nhỏ
  - success toast hoặc icon check

Validation:
- Score min 0
- Score max 10
- Cho phép số thập phân 1 chữ số
- Nếu invalid hiển thị border đỏ

Average logic:
- average = oral * 0.1 + quiz * 0.15 + test * 0.2 + midterm * 0.25 + final * 0.3
- Làm tròn 1 chữ số

Grade letter:
- >= 8.5: A
- >= 7.0: B
- >= 5.5: C
- >= 4.0: D
- < 4.0: F

==================================================
20. ATTENDANCE PAGE
==================================================

URL:
- /attendance

Filters:
- Date
- Class
- Status
- Search student

Attendance table:
- Student
- Class
- Date
- Status
- Check-in time
- Note
- Actions

Status:
- present
- absent
- late
- excused

Teacher marking mode:
- chọn lớp
- chọn ngày
- danh sách học sinh hiện ra
- mỗi row có segmented control:
  - Có mặt
  - Vắng
  - Trễ
  - Có phép
- note input
- save all button

UI:
- segmented control height 36px
- active dùng #0071E3
- inactive background #FFFFFF border #EDEDF2

Success:
- toast "Đã lưu điểm danh."

==================================================
21. PAYMENTS PAGE
==================================================

URL:
- /payments

Admin:
- tạo khoản thu
- xem trạng thái thanh toán
- cập nhật đã thanh toán
- xuất báo cáo

Student/Parent:
- xem khoản cần đóng
- xem lịch sử thanh toán

Payment table columns:
- Invoice code
- Student
- Class
- Payment type
- Amount
- Due date
- Status
- Paid date
- Actions

Status:
- unpaid
- paid
- overdue
- cancelled

Amount format:
- VND
- ví dụ: 1.500.000 ₫

Create payment form:
- student_id hoặc class_id
- payment_type
- amount
- due_date
- description

Payment types:
- tuition
- insurance
- service
- uniform
- books
- meal
- other

==================================================
22. NOTIFICATIONS PAGE
==================================================

URL:
- /notifications

Admin/Teacher:
- tạo thông báo
- gửi theo:
  - toàn trường
  - lớp
  - học sinh cụ thể
  - phụ huynh cụ thể
  - giáo viên
- xem lịch sử thông báo

Notification list:
- title
- audience
- sender
- created_at
- read_count
- status
- actions

Create notification:
- title input
- content rich textarea hoặc textarea thường
- audience select
- class select nếu gửi theo lớp
- priority:
  - normal
  - important
  - urgent
- schedule_send_at optional

Notification item UI:
- unread có dot #0071E3
- priority urgent có border-left nhưng vẫn tinh tế

==================================================
23. REPORTS PAGE
==================================================

URL:
- /reports

Các report:
1. Tổng quan học sinh
2. Tỷ lệ chuyên cần
3. Điểm trung bình theo lớp
4. Học phí đã thu/chưa thu
5. Học sinh có nguy cơ học tập thấp
6. Báo cáo giáo viên
7. Báo cáo theo năm học

UI:
- filter panel trên cùng
- cards thống kê
- charts
- table chi tiết

Charts:
- dùng Recharts hoặc Chart.js
- màu chính #0071E3
- grid color #EDEDF2
- text #6E6E73
- không dùng quá nhiều màu

Export:
- CSV
- PDF optional
- Excel optional

==================================================
24. SETTINGS PAGE
==================================================

URL:
- /settings

Tabs:
- Hồ sơ trường
- Tài khoản
- Vai trò & phân quyền
- Bảo mật
- Cấu hình hệ thống

School profile:
- school_name
- address
- phone
- email
- logo upload
- academic_year_current

Account settings:
- user info
- change password

Roles:
- list roles
- permissions matrix

Security:
- JWT expiration
- password policy
- login audit logs

==================================================
25. PROFILE PAGE
==================================================

URL:
- /profile

User profile:
- avatar
- full name
- email
- phone
- role
- status
- change password

Avatar upload:
- local file
- max size 2MB
- allow jpg/png/webp
- preview before upload

==================================================
26. DATABASE SCHEMA
==================================================

Tạo file database/schema.sql đầy đủ.

Bảng users:
- id BIGINT AUTO_INCREMENT PRIMARY KEY
- full_name VARCHAR(100) NOT NULL
- email VARCHAR(120) NOT NULL UNIQUE
- password_hash VARCHAR(255) NOT NULL
- phone VARCHAR(20)
- avatar_url VARCHAR(255)
- role ENUM('admin','teacher','student','parent') NOT NULL
- status ENUM('active','inactive','blocked') DEFAULT 'active'
- last_login_at DATETIME NULL
- created_at DATETIME DEFAULT CURRENT_TIMESTAMP
- updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

Bảng students:
- id BIGINT AUTO_INCREMENT PRIMARY KEY
- user_id BIGINT NULL
- student_code VARCHAR(30) NOT NULL UNIQUE
- full_name VARCHAR(100) NOT NULL
- email VARCHAR(120)
- phone VARCHAR(20)
- gender ENUM('male','female','other')
- date_of_birth DATE
- address TEXT
- avatar_url VARCHAR(255)
- class_id BIGINT NULL
- admission_date DATE
- academic_year VARCHAR(20)
- status ENUM('active','inactive','graduated','suspended') DEFAULT 'active'
- note TEXT
- created_at DATETIME DEFAULT CURRENT_TIMESTAMP
- updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
- FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
- INDEX idx_student_code(student_code)
- INDEX idx_student_name(full_name)
- INDEX idx_student_class(class_id)

Bảng parents:
- id BIGINT AUTO_INCREMENT PRIMARY KEY
- user_id BIGINT NULL
- full_name VARCHAR(100) NOT NULL
- email VARCHAR(120)
- phone VARCHAR(20)
- relationship ENUM('father','mother','guardian','other')
- address TEXT
- created_at DATETIME DEFAULT CURRENT_TIMESTAMP
- updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL

Bảng student_parents:
- id BIGINT AUTO_INCREMENT PRIMARY KEY
- student_id BIGINT NOT NULL
- parent_id BIGINT NOT NULL
- is_primary BOOLEAN DEFAULT FALSE
- created_at DATETIME DEFAULT CURRENT_TIMESTAMP
- FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
- FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE
- UNIQUE(student_id, parent_id)

Bảng teachers:
- id BIGINT AUTO_INCREMENT PRIMARY KEY
- user_id BIGINT NULL
- teacher_code VARCHAR(30) NOT NULL UNIQUE
- full_name VARCHAR(100) NOT NULL
- email VARCHAR(120)
- phone VARCHAR(20)
- gender ENUM('male','female','other')
- date_of_birth DATE
- specialization VARCHAR(100)
- degree VARCHAR(100)
- hire_date DATE
- avatar_url VARCHAR(255)
- status ENUM('active','inactive','retired') DEFAULT 'active'
- created_at DATETIME DEFAULT CURRENT_TIMESTAMP
- updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL

Bảng classes:
- id BIGINT AUTO_INCREMENT PRIMARY KEY
- class_code VARCHAR(30) NOT NULL UNIQUE
- class_name VARCHAR(100) NOT NULL
- grade_level VARCHAR(20)
- academic_year VARCHAR(20) NOT NULL
- homeroom_teacher_id BIGINT NULL
- room VARCHAR(50)
- max_students INT DEFAULT 40
- status ENUM('active','inactive','archived') DEFAULT 'active'
- created_at DATETIME DEFAULT CURRENT_TIMESTAMP
- updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- FOREIGN KEY (homeroom_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL

Bảng subjects:
- id BIGINT AUTO_INCREMENT PRIMARY KEY
- subject_code VARCHAR(30) NOT NULL UNIQUE
- subject_name VARCHAR(100) NOT NULL
- description TEXT
- periods_per_week INT DEFAULT 0
- status ENUM('active','inactive') DEFAULT 'active'
- created_at DATETIME DEFAULT CURRENT_TIMESTAMP
- updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

Bảng class_subjects:
- id BIGINT AUTO_INCREMENT PRIMARY KEY
- class_id BIGINT NOT NULL
- subject_id BIGINT NOT NULL
- teacher_id BIGINT NULL
- semester VARCHAR(20)
- academic_year VARCHAR(20)
- FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
- FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
- FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
- UNIQUE(class_id, subject_id, semester, academic_year)

Bảng grades:
- id BIGINT AUTO_INCREMENT PRIMARY KEY
- student_id BIGINT NOT NULL
- class_id BIGINT NOT NULL
- subject_id BIGINT NOT NULL
- teacher_id BIGINT NULL
- semester VARCHAR(20) NOT NULL
- academic_year VARCHAR(20) NOT NULL
- oral_score DECIMAL(4,1) NULL
- quiz_score DECIMAL(4,1) NULL
- test_score DECIMAL(4,1) NULL
- midterm_score DECIMAL(4,1) NULL
- final_score DECIMAL(4,1) NULL
- average_score DECIMAL(4,1) NULL
- grade_letter VARCHAR(2) NULL
- note TEXT
- created_at DATETIME DEFAULT CURRENT_TIMESTAMP
- updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
- FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
- FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
- FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
- INDEX idx_grade_student(student_id)
- INDEX idx_grade_class(class_id)
- INDEX idx_grade_subject(subject_id)

Bảng attendance:
- id BIGINT AUTO_INCREMENT PRIMARY KEY
- student_id BIGINT NOT NULL
- class_id BIGINT NOT NULL
- date DATE NOT NULL
- status ENUM('present','absent','late','excused') NOT NULL
- check_in_time TIME NULL
- note TEXT
- created_by BIGINT NULL
- created_at DATETIME DEFAULT CURRENT_TIMESTAMP
- updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
- FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
- FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
- UNIQUE(student_id, date)
- INDEX idx_attendance_date(date)
- INDEX idx_attendance_class(class_id)

Bảng payments:
- id BIGINT AUTO_INCREMENT PRIMARY KEY
- invoice_code VARCHAR(40) NOT NULL UNIQUE
- student_id BIGINT NOT NULL
- payment_type ENUM('tuition','insurance','service','uniform','books','meal','other') NOT NULL
- amount DECIMAL(12,2) NOT NULL
- due_date DATE NOT NULL
- paid_date DATE NULL
- status ENUM('unpaid','paid','overdue','cancelled') DEFAULT 'unpaid'
- description TEXT
- created_at DATETIME DEFAULT CURRENT_TIMESTAMP
- updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
- INDEX idx_payment_student(student_id)
- INDEX idx_payment_status(status)

Bảng notifications:
- id BIGINT AUTO_INCREMENT PRIMARY KEY
- title VARCHAR(200) NOT NULL
- content TEXT NOT NULL
- sender_id BIGINT NULL
- audience_type ENUM('all','role','class','student','parent','teacher') NOT NULL
- audience_value VARCHAR(100) NULL
- priority ENUM('normal','important','urgent') DEFAULT 'normal'
- status ENUM('draft','sent','scheduled') DEFAULT 'sent'
- scheduled_at DATETIME NULL
- created_at DATETIME DEFAULT CURRENT_TIMESTAMP
- updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL

Bảng notification_reads:
- id BIGINT AUTO_INCREMENT PRIMARY KEY
- notification_id BIGINT NOT NULL
- user_id BIGINT NOT NULL
- read_at DATETIME DEFAULT CURRENT_TIMESTAMP
- FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
- UNIQUE(notification_id, user_id)

Bảng files:
- id BIGINT AUTO_INCREMENT PRIMARY KEY
- owner_type ENUM('student','teacher','user','class') NOT NULL
- owner_id BIGINT NOT NULL
- file_name VARCHAR(255) NOT NULL
- file_path VARCHAR(255) NOT NULL
- file_type VARCHAR(100)
- file_size BIGINT
- uploaded_by BIGINT NULL
- created_at DATETIME DEFAULT CURRENT_TIMESTAMP
- FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL

Bảng audit_logs:
- id BIGINT AUTO_INCREMENT PRIMARY KEY
- user_id BIGINT NULL
- action VARCHAR(100) NOT NULL
- entity_type VARCHAR(100) NOT NULL
- entity_id BIGINT NULL
- old_value JSON NULL
- new_value JSON NULL
- ip_address VARCHAR(45)
- user_agent TEXT
- created_at DATETIME DEFAULT CURRENT_TIMESTAMP
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL

==================================================
27. SEED DATA
==================================================

Tạo file database/seed.sql gồm:
- 1 admin
- 3 teachers
- 10 students
- 5 parents
- 4 classes
- 8 subjects
- sample grades
- sample attendance
- sample payments
- sample notifications

Password tất cả demo account:
- 123456
- phải được hash bcrypt trong seed hoặc backend có script tạo hash

Demo account:
- admin@school.com
- teacher@school.com
- student@school.com
- parent@school.com

==================================================
28. API ENDPOINTS
==================================================

Base URL:
- http://localhost:5000/api

Auth:
POST /api/auth/login
Body:
{
  "email": "admin@school.com",
  "password": "123456"
}
Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "full_name": "Admin",
      "email": "admin@school.com",
      "role": "admin"
    },
    "token": "jwt_token"
  }
}

GET /api/auth/me
Header:
Authorization: Bearer token

POST /api/auth/logout

POST /api/auth/change-password

Students:
GET /api/students
Query:
- page
- limit
- search
- class_id
- status
- gender

GET /api/students/:id
POST /api/students
PUT /api/students/:id
DELETE /api/students/:id
POST /api/students/:id/avatar

Teachers:
GET /api/teachers
GET /api/teachers/:id
POST /api/teachers
PUT /api/teachers/:id
DELETE /api/teachers/:id

Classes:
GET /api/classes
GET /api/classes/:id
POST /api/classes
PUT /api/classes/:id
DELETE /api/classes/:id
GET /api/classes/:id/students

Subjects:
GET /api/subjects
GET /api/subjects/:id
POST /api/subjects
PUT /api/subjects/:id
DELETE /api/subjects/:id

Grades:
GET /api/grades
POST /api/grades
PUT /api/grades/:id
DELETE /api/grades/:id
POST /api/grades/bulk-update

Attendance:
GET /api/attendance
POST /api/attendance
POST /api/attendance/bulk-mark
PUT /api/attendance/:id
DELETE /api/attendance/:id

Payments:
GET /api/payments
GET /api/payments/:id
POST /api/payments
PUT /api/payments/:id
DELETE /api/payments/:id
POST /api/payments/:id/mark-paid

Notifications:
GET /api/notifications
GET /api/notifications/:id
POST /api/notifications
PUT /api/notifications/:id
DELETE /api/notifications/:id
POST /api/notifications/:id/read

Reports:
GET /api/reports/dashboard
GET /api/reports/students
GET /api/reports/attendance
GET /api/reports/grades
GET /api/reports/payments

Upload:
POST /api/upload/avatar
POST /api/upload/document

Response format chuẩn:
Success:
{
  "success": true,
  "message": "OK",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}

Error:
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "Email không hợp lệ"
    }
  ]
}

==================================================
29. BACKEND LOGIC
==================================================

Authentication:
- Login bằng email/password
- So sánh password bằng bcrypt
- Tạo JWT token
- Token payload:
  - id
  - email
  - role
- Token expire: 7d
- Middleware verify token
- Middleware check role

Authorization:
- Admin: all permissions
- Teacher:
  - read students
  - update grades
  - update attendance
  - create notifications for assigned classes
- Student:
  - read own data
- Parent:
  - read children data

Validation server-side:
- Không tin client
- Validate tất cả input
- Sanitize string
- Check unique email/student_code/teacher_code/class_code/subject_code
- Check foreign key tồn tại trước khi insert
- Check permission trước khi update/delete

Pagination:
- default page = 1
- default limit = 10
- max limit = 100
- trả meta đầy đủ

Search:
- Students search theo:
  - full_name
  - student_code
  - email
  - phone

Soft delete hay hard delete:
- Với dữ liệu quan trọng nên ưu tiên status inactive
- Nhưng DELETE endpoint có thể xóa thật nếu cần
- Audit log phải ghi lại action

Audit logs:
- Ghi lại:
  - create student
  - update student
  - delete student
  - update grade
  - mark attendance
  - mark payment paid
  - login

File upload:
- Lưu trong backend/uploads
- Avatar trong backend/uploads/avatars
- Documents trong backend/uploads/documents
- Giới hạn file avatar 2MB
- Documents 10MB
- Allowed avatar: jpg, jpeg, png, webp
- Allowed document: pdf, doc, docx, xls, xlsx, png, jpg

==================================================
30. FRONTEND LOGIC
==================================================

API client:
- Axios instance
- baseURL từ env
- tự gắn Authorization Bearer token
- nếu 401 thì logout và redirect /login

Auth store:
- user
- token
- isAuthenticated
- login()
- logout()
- fetchMe()

Route guard:
- ProtectedRoute
- RoleRoute

Form:
- React Hook Form
- Zod schema
- Hiển thị lỗi dưới input
- Không submit nếu invalid
- Disable button khi loading

Table:
- loading skeleton
- empty state
- pagination
- search debounce 300ms
- filters
- row action menu
- confirm delete modal

Toast:
- global toast provider
- success/error/info

Responsive:
- custom hook useMediaQuery nếu cần
- sidebar drawer mobile

==================================================
31. DESIGN TOKENS CSS
==================================================

Tạo file frontend/src/styles/design-tokens.css:

:root {
  --color-primary-blue: #0071E3;
  --color-primary-blue-hover: #006EDB;
  --color-primary-blue-press: #0076DF;
  --color-interactive-blue-deep: #0077ED;

  --color-text-dominant: #1D1D1F;
  --color-text-secondary: #333336;
  --color-text-tertiary: #6E6E73;
  --color-text-inverse: #000000;

  --color-white: #FFFFFF;
  --color-surface-light: #EDEDF2;
  --color-dark-medium: #272729;
  --color-dark-deep: #18181A;

  --nav-surface: rgba(255, 255, 255, 0.8);
  --overlay-soft: rgba(0, 0, 0, 0.8);

  --font-text: "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-display: "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  --container-max: 1262px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-7: 28px;
  --space-8: 32px;
  --space-10: 40px;
  --space-11: 44px;
  --space-12: 48px;
  --space-13: 52px;
  --space-14: 56px;

  --radius-none: 0px;
  --radius-input: 8px;
  --radius-pill: 999px;

  --shadow-subtle: 0 1px 3px rgba(0, 0, 0, 0.12);
  --shadow-medium: 0 4px 12px rgba(0, 0, 0, 0.15);
  --shadow-deep: 0 12px 32px rgba(0, 0, 0, 0.16);

  --transition-fast: 160ms cubic-bezier(0.2, 0, 0, 1);
  --transition-normal: 220ms cubic-bezier(0.2, 0, 0, 1);
}

==================================================
32. GLOBAL CSS
==================================================

Global CSS bắt buộc:
- box-sizing border-box
- body margin 0
- font-family var(--font-text)
- background #FFFFFF
- color #1D1D1F
- font-size 17px
- line-height 25px
- antialiasing
- scroll smooth

Scrollbar:
- width 10px
- thumb #D5D5D7
- track transparent
- hover thumb #A1A1A6

Selection:
- background rgba(0,113,227,0.18)

Focus visible:
- outline none
- box-shadow 0 0 0 3px rgba(0,113,227,0.18)

==================================================
33. TRẠNG THÁI UI
==================================================

Mọi page phải có:

Loading state:
- skeleton
- không để màn hình trắng
- skeleton màu #F5F5F7
- shimmer nhẹ

Empty state:
- icon đơn giản
- title
- description
- action button nếu phù hợp

Error state:
- message rõ ràng
- retry button

Unauthorized:
- redirect login hoặc hiển thị 403 page

404 page:
- title "Không tìm thấy trang"
- subtitle
- button về dashboard

Form submitting:
- disable all submit buttons
- show spinner nhỏ
- không double submit

Network error:
- toast "Không thể kết nối máy chủ. Vui lòng thử lại."

==================================================
34. RESPONSIVE CHI TIẾT
==================================================

Breakpoints:
- mobile: 320px - 767px
- tablet: 768px - 1023px
- desktop: 1024px - 1440px
- large desktop: 1441px+

Mobile:
- sidebar chuyển drawer
- table scroll ngang
- modal full width gần như full screen
- content padding 16px
- stat grid 1 cột
- form grid 1 cột
- title giảm:
  - 40px xuống 32px
  - 34px xuống 28px
  - 24px giữ hoặc xuống 22px

Tablet:
- sidebar có thể thu nhỏ hoặc drawer
- grid 2 cột
- content padding 24px

Desktop:
- sidebar fixed 260px
- content max-width 1262px
- dashboard grid 4 cột stats
- card grid 3 cột

Touch target:
- tất cả button, input, nav item >= 44px height
- icon button >= 44px width/height
- khoảng cách giữa touch target >= 8px mobile

==================================================
35. BẢO MẬT
==================================================

Backend:
- Helmet
- CORS chỉ cho frontend URL
- JWT secret từ .env
- Password hash bcrypt salt 10+
- Validate tất cả input
- Không trả password_hash về frontend
- Không log token
- Rate limit login optional
- Check role middleware
- Upload file validate mime type + size
- SQL query dùng parameterized queries, không concat string trực tiếp
- Error production không expose stack trace

Frontend:
- Không lưu sensitive data không cần thiết
- Token có thể lưu localStorage cho demo local
- Logout xóa token
- Không render HTML thô từ user input
- Guard route theo role

==================================================
36. FILE .ENV
==================================================

Backend .env.example:

PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=student_management_system

JWT_SECRET=replace_with_long_secret_key
JWT_EXPIRES_IN=7d

UPLOAD_DIR=uploads
MAX_AVATAR_SIZE=2097152
MAX_DOCUMENT_SIZE=10485760

Frontend .env.example:

VITE_API_URL=http://localhost:5000/api

==================================================
37. README
==================================================

README phải có hướng dẫn:

1. Cài XAMPP
2. Start Apache và MySQL
3. Tạo database student_management_system trong phpMyAdmin
4. Import database/schema.sql
5. Import database/seed.sql
6. Cài backend:
   cd backend
   npm install
   cp .env.example .env
   npm run dev
7. Cài frontend:
   cd frontend
   npm install
   cp .env.example .env
   npm run dev
8. Mở:
   http://localhost:5173

Ghi rõ tài khoản demo.

==================================================
38. YÊU CẦU CODE QUALITY
==================================================

Code phải:
- Chạy được thật
- Không chỉ mock UI
- Có kết nối backend thật
- Có kết nối MySQL thật
- Có CRUD thật cho students, teachers, classes, subjects
- Có login JWT thật
- Có phân quyền cơ bản thật
- Có seed data
- Có README rõ ràng
- Component tách nhỏ
- Không viết tất cả vào một file
- Không hardcode quá nhiều
- Có error handling
- Có loading state
- Có responsive
- Có comment những đoạn logic quan trọng
- Không để console.log rác
- Không dùng any TypeScript bừa bãi nếu có thể tránh
- Không để unused imports

==================================================
39. ƯU TIÊN TRIỂN KHAI THEO THỨ TỰ
==================================================

Nếu cần chia giai đoạn, hãy code theo thứ tự:

Phase 1:
- Setup database
- Setup backend
- Auth login JWT
- User role middleware
- Frontend login
- Dashboard layout

Phase 2:
- Students CRUD
- Teachers CRUD
- Classes CRUD
- Subjects CRUD

Phase 3:
- Grades
- Attendance
- Payments
- Notifications

Phase 4:
- Reports
- Profile
- Settings
- Polish UI
- Responsive
- Loading/empty/error states

Nhưng nếu có thể, hãy sinh đầy đủ toàn bộ code ngay.

==================================================
40. KẾT QUẢ CUỐI CÙNG CẦN TRẢ VỀ
==================================================

Hãy tạo toàn bộ source code đầy đủ cho dự án.

Trả về:
1. Cây thư mục đầy đủ
2. Code từng file
3. database/schema.sql
4. database/seed.sql
5. backend .env.example
6. frontend .env.example
7. README.md
8. Hướng dẫn chạy local bằng XAMPP
9. Tài khoản demo
10. Checklist chức năng đã hoàn thành

Quan trọng:
- Giao diện phải bám đúng DESIGN.md.
- Tất cả màu, spacing, font, border-radius, button, input, card, table, modal phải theo đúng design system Apple đã mô tả.
- Web phải nhìn sạch, đẹp, hiện đại, cao cấp.
- Hiệu ứng phải mượt, nhẹ, không lòe loẹt.
- Chỉ code web quản lý học sinh/sinh viên.
- Không code app mobile.
- Không dùng Docker.
- Không đổi công nghệ.