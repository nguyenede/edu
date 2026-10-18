import React from 'react';

interface GameIconProps {
  size?: number;
  className?: string;
}

/**
 * 1. Kéo co kiến thức (Tug of War)
 * Biểu tượng sợi dây thừng bện đối kháng với nút thắt ruy-băng đỏ ở giữa và mũi tên kéo 2 đầu
 */
export const TugOfWarIcon: React.FC<GameIconProps> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    {/* Dây thừng thắt bện 2 đầu kéo căng */}
    <path
      d="M2 13.5C5 11.5 8 14 12 12C16 10 19 12.5 22 10.5"
      stroke="#D97706"
      strokeWidth="2.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M2 13.5C5 11.5 8 14 12 12C16 10 19 12.5 22 10.5"
      stroke="#FDE68A"
      strokeWidth="1.2"
      strokeDasharray="2 3"
      strokeLinecap="round"
    />
    {/* Mũi tên đối kháng 2 đầu */}
    <path d="M4 10.5L1.5 13.5L4 16.5" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 7.5L22.5 10.5L20 13.5" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    {/* Nút thắt dải ruy-băng phân định thắng thua ở giữa */}
    <circle cx="12" cy="12" r="2.2" fill="#EF4444" stroke="#B91C1C" strokeWidth="0.8" />
    <path d="M12 14L10 19.5L12 18L14 19.5L12 14Z" fill="#EF4444" stroke="#B91C1C" strokeWidth="0.6" />
  </svg>
);

/**
 * 2. Đua thuyền kiến thức (Boat Race)
 * Thuyền buồm tốc độ lướt trên sóng nước biển với cờ bay
 */
export const BoatRaceIcon: React.FC<GameIconProps> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    {/* Cột buồm */}
    <path d="M11 3V15" stroke="#0369A1" strokeWidth="1.75" strokeLinecap="round" />
    {/* Cánh buồm chính */}
    <path
      d="M12.5 4L20 13.5H12.5V4Z"
      fill="#0EA5E9"
      stroke="#0284C7"
      strokeWidth="0.8"
      strokeLinejoin="round"
    />
    {/* Cánh buồm phụ trước */}
    <path
      d="M9.5 6.5L4.5 13.5H9.5V6.5Z"
      fill="#38BDF8"
      stroke="#0284C7"
      strokeWidth="0.8"
      strokeLinejoin="round"
    />
    {/* Lá cờ đỏ nhỏ trên đỉnh */}
    <path d="M11 3L14 4.5L11 6V3Z" fill="#F43F5E" />
    {/* Thân thuyền lướt sóng */}
    <path
      d="M3 15.5L5.5 18H18.5L21.5 15.5H3Z"
      fill="#0369A1"
      stroke="#075985"
      strokeWidth="1"
      strokeLinejoin="round"
    />
    {/* Sóng nước đại dương cuộn trôi */}
    <path
      d="M1.5 20C3.5 18.8 5.5 21.2 8.5 20C11.5 18.8 13.5 21.2 16.5 20C19.5 18.8 21.5 20.8 23 20"
      stroke="#38BDF8"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 3. Vòng quay may mắn (Lucky Wheel)
 * Bánh xe may mắn chia múi đa sắc rực rỡ kèm kim chỉ đỏ
 */
export const LuckyWheelIcon: React.FC<GameIconProps> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    {/* Viền ngoài bánh xe */}
    <circle cx="12" cy="13" r="8.5" fill="#FAF5FF" stroke="#8B5CF6" strokeWidth="1.5" />
    {/* Các nan hoa múi màu sắc */}
    <path d="M12 13L12 4.5A8.5 8.5 0 0 1 18 7L12 13Z" fill="#A855F7" opacity="0.9" />
    <path d="M12 13L18 7A8.5 8.5 0 0 1 20.5 13L12 13Z" fill="#EC4899" opacity="0.85" />
    <path d="M12 13L20.5 13A8.5 8.5 0 0 1 18 19L12 13Z" fill="#F59E0B" opacity="0.9" />
    <path d="M12 13L18 19A8.5 8.5 0 0 1 12 21.5L12 13Z" fill="#10B981" opacity="0.85" />
    <path d="M12 13L12 21.5A8.5 8.5 0 0 1 6 19L12 13Z" fill="#06B6D4" opacity="0.9" />
    <path d="M12 13L6 19A8.5 8.5 0 0 1 3.5 13L12 13Z" fill="#3B82F6" opacity="0.85" />
    <path d="M12 13L3.5 13A8.5 8.5 0 0 1 6 7L12 13Z" fill="#F43F5E" opacity="0.9" />
    <path d="M12 13L6 7A8.5 8.5 0 0 1 12 4.5L12 13Z" fill="#EAB308" opacity="0.9" />
    {/* Tâm trục xoay vàng kim */}
    <circle cx="12" cy="13" r="2.5" fill="#FDE047" stroke="#CA8A04" strokeWidth="1" />
    {/* Kim chỉ phần thưởng góc trên đỉnh */}
    <path d="M12 6.5L10 2L14 2L12 6.5Z" fill="#EF4444" stroke="#991B1B" strokeWidth="0.8" />
  </svg>
);

/**
 * 4. Chặn Zombie bảo vệ thành (Zombie Defense)
 * Tháp thành lũy kiên cố với khiên chắn phòng thủ
 */
export const ZombieDefenseIcon: React.FC<GameIconProps> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    {/* Thành lũy với lỗ châu mai */}
    <path
      d="M4 21V9L6 9V6H8V9H10V6H14V9H16V6H18V9L20 9V21H4Z"
      fill="#475569"
      stroke="#1E293B"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    {/* Cửa hầm vòm bảo vệ */}
    <path
      d="M9.5 21V15C9.5 13.6 10.6 12.5 12 12.5C13.4 12.5 14.5 13.6 14.5 15V21H9.5Z"
      fill="#0F172A"
    />
    {/* Khiên chắn năng lượng màu đỏ trước thành */}
    <path
      d="M12 8L16.5 10V14.5C16.5 17 14.5 19 12 20C9.5 19 7.5 17 7.5 14.5V10L12 8Z"
      fill="#E11D48"
      fillOpacity="0.85"
      stroke="#FFF"
      strokeWidth="1"
    />
    {/* Biểu tượng thanh kiếm/sấm sét phòng thủ trên khiên */}
    <path d="M12 10.5V17M10 12.5H14" stroke="#FFF" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

/**
 * 5. Đào vàng kiến thức (Gold Miner)
 * Chiếc cuốc đào vàng kim sáng lấp lánh và thỏi vàng nguyên khối
 */
export const GoldMinerIcon: React.FC<GameIconProps> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    {/* Thỏi vàng / Đá vàng lấp lánh bên dưới */}
    <path
      d="M13 15L17.5 13L21.5 16L18 21L11.5 20L13 15Z"
      fill="#F59E0B"
      stroke="#D97706"
      strokeWidth="0.8"
      strokeLinejoin="round"
    />
    <path d="M17.5 13L15.5 17L18 21" stroke="#FEF3C7" strokeWidth="0.8" />
    <path d="M13 15L15.5 17L11.5 20" stroke="#B45309" strokeWidth="0.8" />
    {/* Cán cuốc gỗ chéo */}
    <path d="M4 20L15 9" stroke="#92400E" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M4 20L15 9" stroke="#D97706" strokeWidth="1" strokeLinecap="round" />
    {/* Đầu cuốc sắt sắc nhọn hình trăng khuyết */}
    <path
      d="M11 4C14.5 4.5 18.5 7.5 20 11L18 12C16.8 9 14 7 11 6.5L11 4Z"
      fill="#CBD5E1"
      stroke="#475569"
      strokeWidth="0.8"
    />
    <path
      d="M9 6C6 8 4 11.5 3.5 15L5.5 15.5C6 12.5 7.5 10 10 8L9 6Z"
      fill="#94A3B8"
      stroke="#475569"
      strokeWidth="0.8"
    />
    {/* Khớp nối kim loại */}
    <circle cx="12.5" cy="8.5" r="1.6" fill="#64748B" />
    {/* Ánh kim lấp lánh */}
    <path d="M20 7L21 9L23 10L21 11L20 13L19 11L17 10L19 9L20 7Z" fill="#FDE047" />
  </svg>
);

/**
 * 6. Chém hoa quả trắc nghiệm (Fruit Slash)
 * Lát dưa hấu đỏ mọng bị nhát kiếm chém chéo ngọt ngào
 */
export const FruitSlashIcon: React.FC<GameIconProps> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    {/* Miếng dưa hấu: Vỏ xanh, ruột đỏ */}
    <path
      d="M4 8C4 16.8 11.2 21 17 21C18 21 19 20.8 20 20C20 12 14.5 5 6 4C5 5.2 4 6.5 4 8Z"
      fill="#059669"
      stroke="#047857"
      strokeWidth="1"
    />
    <path
      d="M5.5 8C5.5 15.5 11.5 19.2 16.5 19.5C16.5 12.5 12 6.5 6.8 5.2C6 6 5.5 7 5.5 8Z"
      fill="#F43F5E"
    />
    {/* Hạt dưa hấu */}
    <circle cx="9" cy="11" r="0.9" fill="#1E293B" />
    <circle cx="12" cy="14" r="0.9" fill="#1E293B" />
    <circle cx="13" cy="10" r="0.9" fill="#1E293B" />
    {/* Vết kiếm chém chéo lóe sáng (Ninja Katana Slash) */}
    <path
      d="M2 3L22 21"
      stroke="#38BDF8"
      strokeWidth="2.2"
      strokeLinecap="round"
      filter="drop-shadow(0 0 2px #38BDF8)"
    />
    <path d="M3 2L21 20" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" />
    {/* Tia nước / giọt nước quả tóe ra */}
    <circle cx="17" cy="6" r="1.2" fill="#FB7185" />
    <circle cx="21" cy="9" r="0.9" fill="#FB7185" />
  </svg>
);

/**
 * 7. Đập chuột chũi kiến thức (Whack-a-Mole)
 * Chú chuột chũi đội nón nhô lên từ miệng hang cùng chiếc búa đập đồ chơi
 */
export const WhackAMoleIcon: React.FC<GameIconProps> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    {/* Miệng hang đất */}
    <ellipse cx="11" cy="19.5" rx="8" ry="2.8" fill="#78350F" />
    <ellipse cx="11" cy="19.5" rx="6.5" ry="1.8" fill="#451A03" />
    {/* Thân & đầu chú chuột chũi nhô lên */}
    <path
      d="M7 19.5V14C7 11.2 8.8 9 11 9C13.2 9 15 11.2 15 14V19.5H7Z"
      fill="#92400E"
      stroke="#78350F"
      strokeWidth="0.8"
    />
    {/* Tai chuột chũi */}
    <circle cx="7.5" cy="10.5" r="1.5" fill="#B45309" stroke="#F472B6" strokeWidth="0.8" />
    <circle cx="14.5" cy="10.5" r="1.5" fill="#B45309" stroke="#F472B6" strokeWidth="0.8" />
    {/* Mắt chuột chũi */}
    <circle cx="9.5" cy="12.5" r="0.9" fill="#0F172A" />
    <circle cx="12.5" cy="12.5" r="0.9" fill="#0F172A" />
    {/* Mõm & mũi hồng */}
    <ellipse cx="11" cy="14.5" rx="2" ry="1.2" fill="#FED7AA" />
    <circle cx="11" cy="14" r="0.8" fill="#EC4899" />
    {/* Chiếc búa đồ chơi giáng xuống từ góc phải */}
    <path d="M16 12L21 7" stroke="#EA580C" strokeWidth="2.2" strokeLinecap="round" />
    <rect
      x="14.5"
      y="5"
      width="4.5"
      height="7.5"
      rx="1.5"
      transform="rotate(45 14.5 5)"
      fill="#F97316"
      stroke="#C2410C"
      strokeWidth="1"
    />
    {/* Tia lực tác động */}
    <path d="M12 6L11 4M14 3L15 1.5" stroke="#FDE047" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

/**
 * 8. Bắt bong bóng đại dương (Bubble Pop)
 * Những quả bong bóng pha lê trong suốt óng ánh bay lên với ánh sáng phản chiếu
 */
export const BubblePopIcon: React.FC<GameIconProps> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    {/* Quả bong bóng lớn chính giữa */}
    <circle
      cx="11.5"
      cy="12.5"
      r="7.5"
      fill="#38BDF8"
      fillOpacity="0.3"
      stroke="#0284C7"
      strokeWidth="1.5"
    />
    {/* Điểm phản xạ ánh sáng hình vầng trăng khuyết bên trong */}
    <path
      d="M8.5 7.5C10 6.5 12.5 6.5 14.5 7.5"
      stroke="#FFFFFF"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <circle cx="8" cy="10" r="0.9" fill="#FFFFFF" />
    {/* Bong bóng nhỏ bay xung quanh */}
    <circle
      cx="18.5"
      cy="6.5"
      r="3"
      fill="#60A5FA"
      fillOpacity="0.35"
      stroke="#2563EB"
      strokeWidth="1"
    />
    <path d="M17.5 5C18 4.6 18.8 4.6 19.5 5" stroke="#FFFFFF" strokeWidth="0.8" strokeLinecap="round" />
    <circle
      cx="5"
      cy="17"
      r="2"
      fill="#818CF8"
      fillOpacity="0.3"
      stroke="#4F46E5"
      strokeWidth="0.8"
    />
    {/* Tia nước / lấp lánh khi nổ */}
    <path d="M19 14L20 15M21 12H23M20 9L19 10" stroke="#38BDF8" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

/**
 * 9. Gọi tên ngẫu nhiên (Random Picker)
 * Biểu tượng vòng xoay đa sắc kèm chú vịt vàng bơi lội và xúc xắc may mắn
 */
export const RandomPickerIcon: React.FC<GameIconProps> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    {/* Vòng quay đa sắc ở góc trên trái */}
    <circle cx="8.5" cy="8.5" r="5.5" fill="#FAF5FF" stroke="#A855F7" strokeWidth="1" />
    <path d="M8.5 8.5L8.5 3A5.5 5.5 0 0 1 13.5 6L8.5 8.5Z" fill="#EC4899" />
    <path d="M8.5 8.5L13.5 6A5.5 5.5 0 0 1 14 8.5L8.5 8.5Z" fill="#F59E0B" />
    <path d="M8.5 8.5L14 8.5A5.5 5.5 0 0 1 11.5 13.5L8.5 8.5Z" fill="#10B981" />
    <path d="M8.5 8.5L11.5 13.5A5.5 5.5 0 0 1 5.5 13L8.5 8.5Z" fill="#06B6D4" />
    <path d="M8.5 8.5L5.5 13A5.5 5.5 0 0 1 3 8.5L8.5 8.5Z" fill="#8B5CF6" />
    <path d="M8.5 8.5L3 8.5A5.5 5.5 0 0 1 8.5 3L8.5 8.5Z" fill="#EF4444" />
    <circle cx="8.5" cy="8.5" r="1.5" fill="#FFFFFF" stroke="#6B7280" strokeWidth="0.5" />
    {/* Chú vịt vàng dễ thương góc dưới phải */}
    <ellipse cx="16" cy="16.5" rx="4.5" ry="3.5" fill="#FBBF24" stroke="#D97706" strokeWidth="0.8" />
    <circle cx="17.5" cy="14" r="2.2" fill="#FBBF24" stroke="#D97706" strokeWidth="0.8" />
    <circle cx="18.2" cy="13.5" r="0.5" fill="#1E293B" />
    <path d="M19.5 14.2L21.5 14.8L19.5 15.5Z" fill="#F97316" />
    {/* Gợn sóng nước xanh */}
    <path d="M12 20.5C13.5 19.8 15 21 17 20.5C19 20 20.5 21.2 22 20.5" stroke="#38BDF8" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

/**
 * 10. Đua vịt tốc độ (Duck Race)
 * Chú vịt vàng tốc độ lướt trên vệt sóng nước xanh biếc
 */
export const DuckRaceIcon: React.FC<GameIconProps> = ({ size = 18, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    {/* Vệt sóng nước tốc độ */}
    <path
      d="M2 18.5C4.5 17.5 7 19.5 9.5 18.5C12 17.5 14.5 19.5 17 18.5C19 17.7 20.8 19 22.5 18.5"
      stroke="#0284C7"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M1 21C3.5 20 6 22 8.5 21C11 20 13.5 22 16 21C18 20.2 20 21.5 22 21"
      stroke="#38BDF8"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    {/* Thân chú vịt vàng */}
    <ellipse cx="11.5" cy="14" rx="6" ry="4" fill="#FBBF24" stroke="#D97706" strokeWidth="0.8" />
    {/* Đuôi vịt cong vút */}
    <path d="M5.5 13.5L3 10.5C4.5 11 6 12 7 13" fill="#F59E0B" />
    {/* Đầu vịt */}
    <circle cx="15.5" cy="9.5" r="3.2" fill="#FBBF24" stroke="#D97706" strokeWidth="0.8" />
    {/* Mắt vịt lanh lợi */}
    <circle cx="16.5" cy="8.8" r="0.75" fill="#1E293B" />
    <circle cx="16.7" cy="8.6" r="0.25" fill="#FFFFFF" />
    {/* Mỏ vịt cam tươi lướt gió */}
    <path
      d="M18.2 9.2L22 9.8L18.4 11.2C18.1 10.6 18.1 9.8 18.2 9.2Z"
      fill="#F97316"
      stroke="#EA580C"
      strokeWidth="0.5"
    />
    {/* Cánh vịt */}
    <path
      d="M9 13.5C10 11.5 13 12 14.5 14C13 15 10.5 15.2 9 13.5Z"
      fill="#F59E0B"
      stroke="#D97706"
      strokeWidth="0.6"
    />
  </svg>
);

/**
 * 11. Đua bi tốc độ (Marble Race)
 * Viên bi 3D bóng bẩy lăn trên đường đua xoắn ốc
 */
export const MarbleRaceIcon: React.FC<GameIconProps> = ({ size = 18, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    {/* Đường ray uốn lượn */}
    <path
      d="M3 19C7 19 8 13 13 13C17 13 18 7 22 7"
      stroke="#A855F7"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <path
      d="M3 19C7 19 8 13 13 13C17 13 18 7 22 7"
      stroke="#E9D5FF"
      strokeWidth="1"
      strokeDasharray="2 3"
      strokeLinecap="round"
    />
    {/* Viên bi tím chính (3D glossy marble) */}
    <circle cx="13" cy="9.5" r="4.2" fill="url(#marbleGradCustom)" stroke="#7C3AED" strokeWidth="0.8" />
    {/* Điểm phản quang ánh sáng trên bi */}
    <ellipse cx="11.8" cy="8" rx="1.4" ry="0.8" transform="rotate(-30 11.8 8)" fill="#FFFFFF" opacity="0.8" />
    {/* Viên bi nhỏ đuổi theo */}
    <circle cx="6.5" cy="16.5" r="2.8" fill="#38BDF8" stroke="#0284C7" strokeWidth="0.6" />
    <circle cx="5.8" cy="15.5" r="0.8" fill="#FFFFFF" opacity="0.85" />
    {/* Định nghĩa gradient đổ bóng 3D */}
    <defs>
      <radialGradient id="marbleGradCustom" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#C084FC" />
        <stop offset="50%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#581C87" />
      </radialGradient>
    </defs>
  </svg>
);

/**
 * 12. Bắt vịt 3D (Blind Duck Pond)
 * Hồ nước trong xanh với lá sen/súng và chú vịt bồng bềnh
 */
export const BlindDuckIcon: React.FC<GameIconProps> = ({ size = 18, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    {/* Lá sen/súng xanh biếc bên dưới */}
    <ellipse cx="9" cy="17" rx="7" ry="3.5" fill="#10B981" stroke="#059669" strokeWidth="0.8" />
    <path d="M9 17L5 15.5" stroke="#047857" strokeWidth="0.8" />
    <path d="M9 17L12 19" stroke="#047857" strokeWidth="0.8" />
    {/* Hoa súng hồng nhỏ trên lá */}
    <circle cx="4" cy="16.5" r="1.5" fill="#F472B6" />
    <circle cx="4" cy="16.5" r="0.6" fill="#FDE047" />
    {/* Chú vịt vàng 3D nổi trên nước */}
    <ellipse cx="14" cy="12.5" rx="5" ry="3.5" fill="#FBBF24" stroke="#D97706" strokeWidth="0.8" />
    <circle cx="17" cy="8.5" r="2.8" fill="#FBBF24" stroke="#D97706" strokeWidth="0.8" />
    <circle cx="17.8" cy="7.8" r="0.65" fill="#0F172A" />
    <circle cx="18" cy="7.6" r="0.2" fill="#FFFFFF" />
    <path d="M19.2 8.5L22.5 9L19.4 10.2Z" fill="#F97316" />
    {/* Gợn sóng nước hồ trong veo */}
    <path
      d="M1 20C4 19 8 21 12 20C16 19 20 21 23 20"
      stroke="#38BDF8"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 13. Ghép cặp bằng ảnh (Photo Pair / Team Grouping)
 * Cặp đôi học sinh hợp tác kèm huy hiệu liên kết
 */
export const PhotoPairIcon: React.FC<GameIconProps> = ({ size = 18, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    {/* Nhân vật trái (màu cam tươi) */}
    <circle cx="8" cy="8" r="3.2" fill="#FB923C" stroke="#EA580C" strokeWidth="0.8" />
    <path
      d="M3.5 18C3.5 14.5 5.5 12.5 8 12.5C10.5 12.5 12.5 14.5 12.5 18"
      stroke="#EA580C"
      strokeWidth="1.6"
      strokeLinecap="round"
      fill="#FED7AA"
    />
    {/* Nhân vật phải (màu xanh dương) */}
    <circle cx="16" cy="8" r="3.2" fill="#60A5FA" stroke="#2563EB" strokeWidth="0.8" />
    <path
      d="M11.5 18C11.5 14.5 13.5 12.5 16 12.5C18.5 12.5 20.5 14.5 20.5 18"
      stroke="#2563EB"
      strokeWidth="1.6"
      strokeLinecap="round"
      fill="#BFDBFE"
    />
    {/* Nút liên kết bắt tay / sao đồng đội ở giữa */}
    <circle cx="12" cy="15" r="2.2" fill="#F59E0B" stroke="#B45309" strokeWidth="0.8" />
    <path d="M12 13.8L12.6 14.8L13.8 15L12.8 15.8L13.1 16.9L12 16.3L10.9 16.9L11.2 15.8L10.2 15L11.4 14.8L12 13.8Z" fill="#FFFFFF" />
  </svg>
);

/**
 * 14. Ống kính may mắn (Lucky Lens / Camera Radar)
 * Ống kính công nghệ cao đa lớp với tâm ngắm viền chéo
 */
export const LuckyLensIcon: React.FC<GameIconProps> = ({ size = 18, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    {/* Thân ống kính tròn công nghệ cao */}
    <circle cx="12" cy="12" r="9" fill="#042F2E" stroke="#0D9488" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="6.5" fill="#134E4A" stroke="#14B8A6" strokeWidth="1" />
    {/* Tâm thấu kính radar đa sắc */}
    <circle cx="12" cy="12" r="3.8" fill="#2DD4BF" stroke="#5EEAD4" strokeWidth="0.8" />
    <circle cx="12" cy="12" r="1.6" fill="#CCFBF1" />
    {/* Vạch ngắm 4 góc (Crosshairs) */}
    <path d="M12 2V5M12 19V22M2 12H5M19 12H22" stroke="#2DD4BF" strokeWidth="1.5" strokeLinecap="round" />
    {/* Góc ngắm camera viewfinder */}
    <path d="M6 8H8M6 8V10" stroke="#FDE047" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M18 8H16M18 8V10" stroke="#FDE047" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M6 16H8M6 16V14" stroke="#FDE047" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M18 16H16M18 16V14" stroke="#FDE047" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

/**
 * Hàm tiện ích lấy đúng component icon tự thiết kế theo mã trò chơi (gameId) hoặc subMode
 */
export function getGameCustomIcon(gameId: string, size = 18, className = ''): React.ReactNode {
  switch (gameId) {
    case 'random_picker':
      return <RandomPickerIcon size={size} className={className} />;
    case 'duck':
      return <DuckRaceIcon size={size} className={className} />;
    case 'marble':
      return <MarbleRaceIcon size={size} className={className} />;
    case 'wheel':
    case 'lucky_wheel':
      return <LuckyWheelIcon size={size} className={className} />;
    case 'blind_duck':
      return <BlindDuckIcon size={size} className={className} />;
    case 'photo_pair':
      return <PhotoPairIcon size={size} className={className} />;
    case 'lucky_lens':
      return <LuckyLensIcon size={size} className={className} />;
    case 'tug_of_war':
      return <TugOfWarIcon size={size} className={className} />;
    case 'boat_race':
      return <BoatRaceIcon size={size} className={className} />;
    case 'zombie':
      return <ZombieDefenseIcon size={size} className={className} />;
    case 'gold_miner':
      return <GoldMinerIcon size={size} className={className} />;
    case 'fruit_slash':
      return <FruitSlashIcon size={size} className={className} />;
    case 'whack_a_mole':
      return <WhackAMoleIcon size={size} className={className} />;
    case 'bubble_pop':
      return <BubblePopIcon size={size} className={className} />;
    default:
      return <RandomPickerIcon size={size} className={className} />;
  }
}
