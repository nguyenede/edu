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
 * Hàm tiện ích lấy đúng component icon tự thiết kế theo mã trò chơi (gameId)
 */
export function getGameCustomIcon(gameId: string, size = 18, className = ''): React.ReactNode {
  switch (gameId) {
    case 'tug_of_war':
      return <TugOfWarIcon size={size} className={className} />;
    case 'boat_race':
      return <BoatRaceIcon size={size} className={className} />;
    case 'lucky_wheel':
      return <LuckyWheelIcon size={size} className={className} />;
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
      return <TugOfWarIcon size={size} className={className} />;
  }
}
