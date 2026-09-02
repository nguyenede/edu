# Design System: StudentOS (Apple-Inspired)

## 1. Màu sắc (Colors)
- **Primary Action Blue**: `#0071E3` (Dùng cho Button chính, link quan trọng, trạng thái active)
- **Primary Blue Hover**: `#006EDB`
- **Primary Blue Press**: `#0076DF`
- **Text Dominant**: `#1D1D1F` (Headline, Body chính)
- **Text Secondary**: `#333336`
- **Text Tertiary**: `#6E6E73` (Label, meta text)
- **Background chính**: `#FFFFFF`
- **Surface Light**: `#EDEDF2` (Border, Background phụ)
- **Navigation Surface**: `rgba(255, 255, 255, 0.8)` (Glassmorphism hiệu ứng)

## 2. Font chữ (Typography)
- **Body Font**: `"SF Pro Text", -apple-system, sans-serif`
- **Display Font**: `"SF Pro Display", -apple-system, sans-serif`
- **Quy tắc**:
  - **Display Hero**: 40px, Weight 600, Line-height 44px
  - **Heading Primary**: 24px, Weight 600
  - **Body Default**: 17px, Weight 400, Line-height 25px
  - **Small Label**: 12px, Weight 400

## 3. Hệ thống Spacing
- **Base Unit**: 4px
- **Standard Padding**: 16px, 24px, 32px
- **Section Gap**: 40px, 56px
- **Layout**: Full-width fluid layout (chạm lề)
- **Touch Target**: Chiều cao tối thiểu 44px cho mọi button và input.

## 4. Components Style
- **Buttons**: Bo góc tròn (Pill-shaped / rounded-full), không shadow nặng, hiệu ứng chuyển động mượt.
- **Inputs**: Chiều cao 44px, border 1px, focus màu Blue với hiệu ứng ring mờ.
- **Cards**: Border 1px `#EDEDF2`, không bo góc quá nhiều (radius 0 hoặc rất nhỏ), hiệu ứng hover nhẹ.
- **Tables**: Sạch sẽ, header chữ in hoa nhỏ, hover row đổi màu nhẹ.

## 5. Hiệu ứng (Animations)
- **Duration**: 160ms - 220ms
- **Easing**: `cubic-bezier(0.2, 0, 0, 1)` (Apple's standard easing)
- **Transition**: Opacity, Transform (translateY), Scale nhẹ.