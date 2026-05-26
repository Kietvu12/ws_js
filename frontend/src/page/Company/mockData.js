// ========== COMPANY MODULE MOCK DATA ==========

export const COMPANY_USER = {
  name: 'Nguyễn Văn A',
  role: 'HR Manager',
  avatar: null,
  company: 'ABC Manufacturing',
};

// ========== SIDEBAR NAV ==========
export const SIDEBAR_SECTIONS = [
  {
    items: [
      { id: 'dashboard', label: 'Tổng quan', path: '/company' },
    ],
  },
  {
    title: 'TUYỂN DỤNG',
    items: [
      { id: 'jd', label: 'Tin tuyển dụng', path: '/company/jd' },
      { id: 'nominations', label: 'Tiến cử', path: '/company/nominations' },
      { id: 'candidates', label: 'Ứng viên', path: '/company/candidates' },
    ],
  },
  {
    title: 'TÌM KIẾM ỨNG VIÊN',
    items: [
      { id: 'scout', label: 'Tìm ứng viên', path: '/company/scout' },
      { id: 'scout-performance', label: 'Tuyển dụng chuyên sâu', path: '/company/scout-performance' },
    ],
  },
  {
    title: 'DỊCH VỤ',
    items: [
      { id: 'saiyo-branding', label: 'Trang tuyển dụng', path: '/company/saiyo-branding' },
      { id: 'san-ctv', label: 'Sàn cộng tác viên', path: '/company/san-ctv' },
    ],
  },
  {
    title: 'KIẾN THỨC',
    items: [
      { id: 'knowledge', label: 'Thư viện kiến thức', path: '/company/knowledge' },
      { id: 'reports', label: 'Báo cáo & phân tích', path: '/company/reports' },
    ],
  },
  {
    items: [
      { id: 'messages', label: 'Tin nhắn', path: '/company/messages' },
      { id: 'billing', label: 'Thanh toán & tín dụng', path: '/company/billing' },
    ],
  },
];

// ========== DASHBOARD ==========
export const DASHBOARD_ALERTS = [
  {
    color: '#FEE2E2',
    borderColor: '#FECACA',
    iconBg: '#EF4444',
    title: 'Thiếu ứng viên\n(LOW SUPPLY)',
    desc: 'Nguồn ứng viên hiện tại đang thấp so với nhu cầu.',
    cta: 'Tăng nguồn với Scout Credit',
  },
  {
    color: '#fecaca',
    borderColor: '#fca5a5',
    iconBg: '#f87171',
    title: 'CV không phù hợp\n(LOW QUALITY)',
    desc: 'Chất lượng ứng viên chưa đáp ứng yêu cầu vị trí.',
    cta: 'Dùng Scout Performance hoặc Sàn CTV',
  },
  {
    color: '#fef2f2',
    borderColor: '#fecaca',
    iconBg: '#dc2626',
    title: 'Thiếu resource tuyển dụng\n(LOW CAPACITY)',
    desc: 'Đội ngũ tuyển dụng đang quá tải hoặc thiếu nguồn lực.',
    cta: 'Tăng hiệu quả với Branding',
  },
  {
    color: '#fef2f2',
    borderColor: '#fecaca',
    iconBg: '#b91c1c',
    title: 'Hiệu quả thấp\n(LOW PERFORMANCE)',
    desc: 'Tỷ lệ chuyển đổi và hiệu quả tuyển dụng chưa tối ưu.',
    cta: 'Tối ưu với Scout Performance',
  },
];

export const RECRUITMENT_HEALTH = [
  { label: 'Nguồn ứng viên\n(Supply)', score: 65, rating: 'Trung bình', color: '#dc2626', delta: '15%', up: true },
  { label: 'Hiệu suất\n(Performance)', score: 58, rating: 'Cần cải thiện', color: '#f87171', delta: '8%', up: false },
  { label: 'Chất lượng\n(Quality)', score: 78, rating: 'Tốt', color: '#ef4444', delta: '12%', up: true },
  { label: 'Tốc độ\n(Speed)', score: 70, rating: 'Trung bình', color: '#b91c1c', delta: '10%', up: false },
];

export const DASHBOARD_QUICK_STATS = [
  { label: 'JD đang hoạt động', value: 12 },
  { label: 'Ứng viên mới (7 ngày)', value: 128 },
  { label: 'Ứng viên phù hợp', value: 32 },
  { label: 'Lượt unlock (7 ngày)', value: 45 },
  { label: 'Yêu cầu đang xử lý', value: 18, alert: true },
];

export const QUICK_ACTIONS = [
  { label: 'Tạo JD mới (AI)', desc: 'Tạo JD miễn phí bằng AI', color: '#dc2626' },
  { label: 'Tìm ứng viên (Scout)', desc: 'Tìm kiếm trong kho ứng viên', color: '#ef4444' },
  { label: 'Dùng Scout Performance', desc: 'Yêu cầu WS hỗ trợ giới thiệu', color: '#b91c1c' },
  { label: 'Tạo Landing Page', desc: 'Tạo trang tuyển dụng miễn phí', color: '#f87171' },
  { label: 'Đăng job lên Sàn CTV', desc: 'Kết nối với CTV HR Partner', color: '#EF4444' },
  { label: 'Xem hướng dẫn', desc: 'Hướng dẫn sử dụng platform', color: '#6B7280' },
];

export const DASHBOARD_NOTIFICATIONS = [
  { text: 'Có 3 ứng viên mới phù hợp với Mechanical Engineer', time: '10 phút trước' },
  { text: 'Ứng viên T.N.H đã trả lời tin nhắn', time: '1 giờ trước' },
  { text: 'Yêu cầu Scout Performance mới', time: '2 giờ trước' },
  { text: 'JD "QA Engineer" chưa có ứng viên sau 7 ngày', time: '3 giờ trước', alert: true },
];

// ========== JD LIST ==========
export const JD_STATUS_MAP = {
  active: { label: 'Đang hoạt động', color: '#ef4444', bg: '#fee2e2' },
  warning: { label: 'Cần cải thiện', color: '#f87171', bg: '#fecaca' },
  danger: { label: 'Nguy hiểm', color: '#EF4444', bg: '#FEE2E2' },
  caution: { label: 'Cảnh báo', color: '#fca5a5', bg: '#fee2e2' },
  paused: { label: 'Tạm dừng', color: '#6B7280', bg: '#F3F4F6' },
  closed: { label: 'Đã đóng', color: '#6B7280', bg: '#E5E7EB' },
};

export const JD_LIST = [
  {
    id: 'jd-1', titleVi: 'Mechanical Engineer', titleJp: '設計エンジニア',
    location: 'Tokyo, Nhật Bản', type: 'Full-time',
    status: 'active', services: ['Scout Credit', 'Branding LP'],
    totalCandidates: 45, matchedCandidates: 18,
    efficiency: 40, postedDays: 3, postedDate: '20/05/2024',
  },
  {
    id: 'jd-2', titleVi: 'IT Developer', titleJp: 'システムエンジニア',
    location: 'Osaka, Nhật Bản', type: 'Full-time',
    status: 'warning', services: ['Scout Performance', 'Sàn CTV'],
    totalCandidates: 28, matchedCandidates: 7,
    efficiency: 25, postedDays: 5, postedDate: '18/05/2024',
  },
  {
    id: 'jd-3', titleVi: 'Production Staff', titleJp: '生産スタッフ',
    location: 'Aichi, Nhật Bản', type: 'Full-time',
    status: 'active', services: ['Sàn CTV'],
    totalCandidates: 63, matchedCandidates: 20,
    efficiency: 32, postedDays: 2, postedDate: '21/05/2024',
  },
  {
    id: 'jd-4', titleVi: 'Sales Executive', titleJp: '営業担当',
    location: 'Ho Chi Minh, VN', type: 'Full-time',
    status: 'caution', services: ['Scout Credit'],
    totalCandidates: 12, matchedCandidates: 2,
    efficiency: 16, postedDays: 6, postedDate: '17/05/2024',
  },
  {
    id: 'jd-5', titleVi: 'QA Engineer', titleJp: '品質保証エンジニア',
    location: 'Tokyo, Nhật Bản', type: 'Full-time',
    status: 'danger', services: ['Scout Credit'],
    totalCandidates: 0, matchedCandidates: 0,
    efficiency: 0, postedDays: 8, postedDate: '15/05/2024',
  },
  {
    id: 'jd-6', titleVi: 'Business Analyst', titleJp: 'ビジネスアナリスト',
    location: 'Tokyo, Nhật Bản', type: 'Full-time',
    status: 'paused', services: ['Scout Performance', 'Branding LP'],
    totalCandidates: 9, matchedCandidates: 3,
    efficiency: 33, postedDays: null, postedDate: '10/05/2024',
  },
];

export const JD_TEMPLATES = [
  { label: 'IT / Phần mềm', count: 32 },
  { label: 'Kỹ sư cơ khí', count: 28 },
  { label: 'Sales / Kinh doanh', count: 25 },
  { label: 'Nhân sự / Hành chính', count: 18 },
  { label: 'Marketing', count: 15 },
];

export const JD_STATS = { total: 12, active: 8, paused: 2, closed: 2 };

// ========== JD DETAIL ==========
export const JD_DETAIL = {
  id: 'FE2405-0012',
  title: 'Frontend Developer (ReactJS)',
  location: 'Hà Nội',
  type: 'Toàn thời gian',
  level: 'Middle',
  status: 'active',
  postedDate: '18/05/2024',
  expiryDate: '17/06/2024',
  daysLeft: 28,
  createdBy: 'Nguyễn Văn A',
  health: [
    { label: 'Nguồn ứng viên', score: 72, rating: 'Khá', color: '#dc2626' },
    { label: 'Chất lượng ứng viên', score: 68, rating: 'Khá', color: '#f87171' },
    { label: 'Hiệu suất tuyển dụng', score: 65, rating: 'Trung bình', color: '#ef4444' },
    { label: 'Tốc độ tuyển dụng', score: 60, rating: 'Trung bình', color: '#b91c1c' },
  ],
  aiMatch: {
    total: 128,
    high: 32,
    medium: 76,
    potential: 20,
    avgScore: 84,
    topSkills: ['React', 'TypeScript', 'Next.js', 'Redux'],
    topLocations: ['Hà Nội', 'TP.HCM', 'Đà Nẵng'],
    salaryRange: '20 - 35 triệu VND',
  },
  topCandidates: [
    { name: 'Ẩn danh #1', title: 'Frontend Developer', match: 91, exp: '4 năm', location: 'Hà Nội', skills: ['React', 'TypeScript', 'Next.js'] },
    { name: 'Ẩn danh #2', title: 'Frontend Engineer', match: 89, exp: '3 năm', location: 'TP. Hồ Chí Minh', skills: ['React', 'JavaScript', 'Redux'] },
    { name: 'Ẩn danh #3', title: 'React Developer', match: 87, exp: '5 năm', location: 'Hà Nội', skills: ['React', 'TypeScript', 'AWS'] },
    { name: 'Ẩn danh #4', title: 'Frontend Developer', match: 85, exp: '3 năm', location: 'Đà Nẵng', skills: ['React', 'Next.js', 'Tailwind'] },
  ],
  services: [
    { name: 'Ucout Credit', status: 'Đang sử dụng', detail: 'Đã unlock: 56 hồ sơ' },
    { name: 'Saiyo Branding', status: 'Đang sử dụng', detail: 'Hiện thị tử: 18/05/2024' },
    { name: 'Sàn CTV (HR Partner)', status: 'Chưa sử dụng', detail: 'Chưa đăng job' },
  ],
  history: [
    { text: 'JD được đăng lên hệ thống', date: '18/05/2024 10:30' },
    { text: 'Tự động gợi ý 128 ứng viên phù hợp', date: '18/05/2024 10:32' },
    { text: 'Unlock 10 hồ sơ bằng Scout Credit', date: '18/05/2024 11:05' },
    { text: 'Có 5 ứng viên mới phù hợp', date: '19/05/2024 09:15' },
    { text: 'Cập nhật mô tả công việc', date: '20/05/2024 14:20' },
  ],
};

// ========== NOMINATIONS ==========
export const NOMINATION_STATS = [
  { label: 'Tổng ứng viên vào JD', value: 236, delta: '18%', up: true },
  { label: 'Ứng viên từ tiến cử\n(Scout Performance, Sàn CTV)', value: 128, delta: '14%', up: true },
  { label: 'Ứng viên từ Scout Credit\n(DN tiên liên hệ trực tiếp)', value: 92, delta: '22%', up: true },
  { label: 'Đang xử lý', value: 68, delta: '12%', up: true },
  { label: 'Đã tuyển', value: 11, delta: '10%', up: true },
];

export const NOMINATION_TABS = [
  { label: 'Tất cả', count: null },
  { label: 'Tiến cử (WS/CTV)', count: 128 },
  { label: 'Scout Credit (DN tự liên hệ)', count: 92 },
  { label: 'Đã tuyển', count: 11 },
  { label: 'Không phù hợp', count: 59 },
];

export const NOMINATION_LIST = [
  {
    id: 1, name: 'Trần Minh Đức', email: 'duc.tran@gmail.com', phone: '0901 234 567',
    jdTitle: 'IT Developer', jdTitleJp: 'システムエンジニア',
    source: 'Scout Credit', sourceNote: 'DN liên hệ trực tiếp',
    status: 'Liên hệ', phase: 'Trao đổi với ứng viên',
    entryDate: '20/05/2024', daysInSystem: 3,
  },
  {
    id: 2, name: 'Nguyễn Thị Hương', email: 'huong.nguyen@gmail.com', phone: '080-1234-5678',
    jdTitle: 'Business Analyst', jdTitleJp: 'ビジネスアナリスト',
    source: 'Scout Performance', sourceNote: 'WS Intro',
    status: 'Phỏng vấn', phase: 'Phỏng vấn vòng 1',
    entryDate: '19/05/2024', daysInSystem: 4,
  },
  {
    id: 3, name: 'Lê Quang Huy', email: 'huy.le@gmail.com', phone: '0903 987 654',
    jdTitle: 'QA Engineer', jdTitleJp: '品質保証エンジニア',
    source: 'Sàn CTV (HR Partner)', sourceNote: 'CTV Phạm Văn Tùng',
    status: 'Đang xử lý', phase: 'Hearing & Match',
    entryDate: '18/05/2024', daysInSystem: 5,
  },
  {
    id: 4, name: 'Phạm Thùy Linh', email: 'linh.pham@gmail.com', phone: '070-5555-7777',
    jdTitle: 'Sales Executive', jdTitleJp: '営業担当',
    source: 'Scout Credit', sourceNote: 'DN liên hệ trực tiếp',
    status: 'Liên hệ', phase: 'Trao đổi với ứng viên',
    entryDate: '16/05/2024', daysInSystem: 7,
  },
  {
    id: 5, name: 'Vũ Hoàng Nam', email: 'nam.vu@gmail.com', phone: '090-2222-3333',
    jdTitle: 'IT Support Engineer', jdTitleJp: 'インフラエンジニア',
    source: 'Branding LP', sourceNote: 'Ứng viên ứng tuyển',
    status: 'Đã ứng tuyển', phase: 'Đã nhận CV',
    entryDate: '10/05/2024', daysInSystem: 13,
  },
];

export const NOMINATION_STATUS_CHART = [
  { label: 'Liên hệ', value: 52, color: '#dc2626' },
  { label: 'Đang xử lý', value: 68, color: '#f87171' },
  { label: 'Phỏng vấn', value: 42, color: '#b91c1c' },
  { label: 'Offered', value: 11, color: '#ef4444' },
  { label: 'Đã tuyển', value: 11, color: '#dc2626' },
  { label: 'Không phù hợp', value: 45, color: '#EF4444' },
];

// ========== CANDIDATES ==========
export const CANDIDATE_LIST = [
  {
    id: 1, name: 'Trần Minh Đức', title: 'IT Developer', code: 'JD-IT-001',
    source: 'Scout Credit', status: 'Mới', date: '20/05/2024',
    age: 28, gender: 'Nam', location: 'Hà Nội, Việt Nam',
    email: 'duc.tran@gmail.com', phone: '0901 234 567',
    linkedin: 'linkedin.com/in/ductran', exp: '5 năm', level: 'Senior Developer',
    salary: '25 - 30 triệu VND', availability: 'Có thể bắt đầu sau 2 tuần',
    matchScore: 85, skills: ['React.js', 'Node.js', 'TypeScript', 'Next.js', 'JavaScript', 'CI/CD', 'Git', 'MongoDB'],
    matchDetails: [
      { label: 'Kinh nghiệm phù hợp', level: 'Rất phù hợp' },
      { label: 'Kỹ năng chuyên môn', level: 'Phù hợp' },
      { label: 'Mức lương kỳ vọng', level: 'Phù hợp' },
      { label: 'Thời gian sẵn sàng', level: 'Phù hợp' },
    ],
    aiSummary: 'Ứng viên có 5 năm kinh nghiệm phát triển web với React.js và Node.js. Từng làm việc tại các công ty công nghệ hàng đầu, có kinh nghiệm triển khai dự án thực tế. Phù hợp cao với vị trí IT Developer của bạn.',
  },
  {
    id: 2, name: 'Nguyễn Thị Hương', title: 'Business Analyst', code: 'JD-BA-002',
    source: 'Scout Performance', status: 'Phỏng vấn', date: '19/05/2024',
    age: 30, gender: 'Nữ', location: 'TP. Hồ Chí Minh',
    matchScore: 78, skills: ['SQL', 'Tableau', 'JIRA', 'Agile'],
  },
  {
    id: 3, name: 'Lê Quang Huy', title: 'QA Engineer', code: 'JD-QA-003',
    source: 'Sàn CTV (HR Partner)', status: 'Đang xử lý', date: '18/05/2024',
    matchScore: 72, skills: ['Selenium', 'JMeter', 'API Testing'],
  },
  {
    id: 4, name: 'Phạm Thùy Linh', title: 'Sales Executive', code: 'JD-SALES-004',
    source: 'Scout Credit', status: 'Đã tuyển', date: '15/05/2024',
    matchScore: 90, skills: ['B2B Sales', 'CRM', 'Negotiation'],
  },
  {
    id: 5, name: 'Vũ Hoàng Nam', title: 'IT Support Engineer', code: 'JD-IT-005',
    source: 'Branding LP', status: 'Đã nhận CV', date: '10/05/2024',
    matchScore: 65, skills: ['Linux', 'AWS', 'Docker'],
  },
];

// ========== SCOUT ==========
export const SCOUT_CANDIDATES = [
  {
    id: 1, title: 'IT Developer', exp: '3 năm', level: 'Senior',
    location: 'Hà Nội', salary: '25 - 30 triệu', skills: ['React.js', 'TypeScript'],
  },
  {
    id: 2, title: 'Backend Developer', exp: '4 năm', level: 'Middle',
    location: 'Hà Nội', salary: '28 - 35 triệu', skills: ['Node.js', 'AWS'],
  },
  {
    id: 3, title: 'Frontend Developer', exp: '2 năm', level: 'Senior',
    location: 'Hồ Chí Minh', salary: '20 - 25 triệu', skills: ['Vue.js', 'JavaScript'],
  },
  {
    id: 4, title: 'Fullstack Developer', exp: '5 năm', level: 'Senior',
    location: 'Đà Nẵng', salary: '30 - 40 triệu', skills: ['React.js', 'Node.js'],
  },
  {
    id: 5, title: 'DevOps Engineer', exp: '3 năm', level: 'Middle',
    location: 'Hà Nội', salary: '25 - 35 triệu', skills: ['AWS', 'Docker'],
  },
];

// ========== SAIYO BRANDING ==========
export const LANDING_PAGES = [
  { id: 1, name: 'Tuyển dụng Frontend Developer', url: 'jobshare.jp/abc-fe', views: 1248, candidates: 86, status: 'Đang hoạt động' },
  { id: 2, name: 'Tuyển dụng Sales Engineer', url: 'jobshare.jp/abc-se', views: 654, candidates: 42, status: 'Đang hoạt động' },
  { id: 3, name: 'Tuyển dụng QA Engineer', url: 'jobshare.jp/abc-qa', views: 320, candidates: 18, status: 'Tạm dừng' },
];

export const BRANDING_STATS = { views: 2222, forms: 146, candidates: 113, conversionRate: 5.1 };

export const BRANDING_SERVICES = [
  { label: 'Tạo Landing Page chuyên nghiệp', desc: 'Thiết kế nâng cao thương hiệu tuyển dụng công ty, tối ưu chuyển đổi.' },
  { label: 'Chạy quảng cáo tuyển dụng', desc: 'Tiếp cận đăng ứng viên trên Google, Facebook, LinkedIn...' },
  { label: 'Tổ chức seminar, event tuyển dụng', desc: 'Tổ chức sự kiện offline/online thu hút ứng viên tiềm năng.' },
  { label: 'Làm company profile (chuẩn hóa)', desc: 'Xây dựng hồ sơ năng lực công ty chuyên nghiệp.' },
  { label: 'Thiết kế & phát triển website công ty', desc: 'Website đẹp, chuẩn SEO, thể hiện uy tín doanh nghiệp.' },
];

// ========== SÀN CTV ==========
export const SAN_CTV_STATS = [
  { label: 'Job đã đăng sàn', value: 12, extra: '5 đang chạy' },
  { label: 'Đơn tiến cử', value: 48, extra: '+2 tuần này' },
  { label: 'Ứng viên đang xử lý', value: 21 },
  { label: 'Tuyển thành công', value: 8, extra: '+2 tháng này' },
];

export const SAN_CTV_JOBS = [
  { title: 'Frontend Developer', code: 'FE-2405', commission: '20% Thu nhập năm đầu', commissionNote: 'Thường 15 đế 60,000,000đ', status: 'Đang chạy', ctvInterested: 23, nominations: 12, deadline: '30/06/2024' },
  { title: 'QA Engineer', code: 'QA-2405', commission: '15% Thu nhập năm đầu', commissionNote: 'Thường 15 đế 30,000,000đ', status: 'Đang chạy', ctvInterested: 15, nominations: 8, deadline: '25/06/2024' },
  { title: 'Product Owner', code: 'PO-2405', commission: '20% Thu nhập năm đầu', commissionNote: 'Thường 15 đế 70,000,000đ', status: 'Chờ WS duyệt', ctvInterested: null, nominations: null, deadline: '30/06/2024' },
  { title: 'DevOps Engineer', code: 'DOPS-2405', commission: '15% Thu nhập năm đầu', commissionNote: 'Thường 15 đế 40,000,000đ', status: 'Tạm dừng', ctvInterested: 6, nominations: 2, deadline: '20/06/2024' },
  { title: 'Data Analyst', code: 'DA-2405', commission: '10% Thu nhập năm đầu', commissionNote: 'Thường 15 đế 20,000,000đ', status: 'Đã đóng', ctvInterested: 18, nominations: 7, deadline: '15/06/2024' },
];

// ========== KNOWLEDGE HUB ==========
export const KNOWLEDGE_CATEGORIES = [
  { label: 'Tuyển dụng', count: 128, icon: '📋' },
  { label: 'Quản trị nhân sự', count: 96, icon: '👥' },
  { label: 'Phát triển đội ngũ', count: 78, icon: '🎯' },
  { label: 'Pháp lý & Tuân thủ', count: 52, icon: '⚖️' },
  { label: 'Kỹ năng nghề nghiệp', count: 67, icon: '💡' },
  { label: 'Khác', count: 34, icon: '📎' },
];

export const KNOWLEDGE_ARTICLES = [
  { id: 1, title: '10 bước xây dựng quy trình tuyển dụng hiệu quả', category: 'Tuyển dụng', date: '15/05/2024', readTime: 12, views: 2400, featured: true },
  { id: 2, title: 'Cách xây dựng chính sách lương thưởng cạnh tranh', category: 'Quản trị nhân sự', date: '14/05/2024', readTime: 8, views: 1800 },
  { id: 3, title: 'Lộ trình phát triển nhân tài trong doanh nghiệp', category: 'Phát triển đội ngũ', date: '13/05/2024', readTime: 10, views: 1200 },
  { id: 4, title: 'Những điểm mới trong luật lao động 2024', category: 'Pháp lý & Tuân thủ', date: '12/05/2024', readTime: 6, views: 980 },
  { id: 5, title: 'Kỹ năng phỏng vấn giúp đánh giá ứng viên chính xác', category: 'Kỹ năng nghề nghiệp', date: '11/05/2024', readTime: 7, views: 1100 },
];

// ========== REPORTS & INSIGHTS ==========
export const REPORT_STATS = [
  { label: 'Tổng JD đã đăng', value: 28, delta: '12%', up: true },
  { label: 'Tổng tiến cử nhận được', value: 156, delta: '18%', up: true },
  { label: 'Ứng viên vào vòng phỏng vấn', value: 46, delta: '15%', up: true },
  { label: 'Tuyển thành công', value: 12, delta: '20%', up: true },
  { label: 'Chi phí tuyển dụng (WS)', value: '240,000,000đ', delta: '5%', up: false },
];

export const REPORT_CONVERSION = {
  posted: { label: 'JD đã đăng', value: 28, pct: 100 },
  received: { label: 'Tiên cử nhận được', value: 156, pct: 71.4 },
  interview: { label: 'Vào phỏng vấn', value: 46, pct: 29.5 },
  hired: { label: 'Tuyển thành công', value: 12, pct: 29.3 },
  overallRate: 29.3,
};

export const REPORT_TOP_JDS = [
  { title: 'Frontend Developer', code: 'FE-2405', dept: 'IT', conversionRate: 35, hired: 5 },
  { title: 'QA Engineer', code: 'QA-2405', dept: 'IT', conversionRate: 32, hired: 3 },
  { title: 'Product Owner', code: 'PO-2405', dept: 'Product', conversionRate: 30, hired: 2 },
  { title: 'DevOps Engineer', code: 'DO-2405', dept: 'IT', conversionRate: 28, hired: 1 },
  { title: 'Data Analyst', code: 'DA-2405', dept: 'Data', conversionRate: 25, hired: 1 },
];

// ========== MESSAGES ==========
export const MESSAGE_TABS = [
  { id: 'lp', label: 'Ứng viên từ LP', count: 3 },
  { id: 'scout', label: 'Ứng viên từ Scout Credit', count: 5 },
  { id: 'ctv', label: 'CTV', count: 12 },
  { id: 'ws', label: 'WS', count: 5 },
];

export const MESSAGE_CONVERSATIONS = [
  {
    id: 1, tab: 'lp', name: 'Trần Văn Hùng', title: 'Frontend Developer',
    source: 'Từ Landing Page', jd: 'Frontend Developer (FE2405-0012)',
    lastMsg: 'Chào anh/chị, Em đã xem qua mô tả công việc...', time: '10:30',
    unread: 2, matchScore: 85,
  },
  {
    id: 2, tab: 'lp', name: 'Nguyễn Thị Thu Hà', title: 'QA Engineer',
    source: 'Từ Landing Page', jd: 'QA Engineer (QA2404-0008)',
    lastMsg: '', time: '09:15', unread: 1,
  },
  {
    id: 3, tab: 'ctv', name: 'Nguyễn Văn A (CTV)', title: 'CTV tuyển dụng',
    jd: 'Frontend Developer (FE2405-0012)',
    lastMsg: 'Ứng viên: Trần Minh Đức', time: '10:48', unread: 4,
  },
  {
    id: 4, tab: 'ws', name: 'WS Team – Tuyển dụng', title: 'Đội ngũ tư vấn',
    lastMsg: 'Cảm ơn anh/chị đã sử dụng dịch vụ...', time: '09:15', unread: 3,
  },
  {
    id: 5, tab: 'ws', name: 'WS Billing', title: 'Hỗ trợ thanh toán',
    lastMsg: 'Yêu cầu nạp thêm credit', time: '', unread: 2,
  },
];

// ========== BILLING ==========
export const BILLING_STATS = [
  { label: 'Credit hiện tại', value: '2,450', extra: 'Nạp thêm credit →' },
  { label: 'Đã dùng trong tháng', value: '320 credit', extra: 'Chi tiết →' },
  { label: 'Request đang xử lý', value: 7, extra: 'Xem danh sách →' },
  { label: 'Dịch vụ đang hoạt động', value: 4, extra: 'Xem chi tiết →' },
  { label: 'Invoice chưa thanh toán', value: 2, extra: 'Xem chi tiết →' },
];

export const CREDIT_HISTORY = [
  { date: '15/05/2024 10:30', type: 'Mở hồ sơ ứng viên', change: -10, balance: 2450, note: 'Unlock ứng viên: Trần Minh Đức (FE2405-0012)' },
  { date: '14/05/2024 09:15', type: 'Nạp credit', change: +2000, balance: 2460, note: 'Nạp credit qua chuyển khoản' },
  { date: '12/05/2024 16:45', type: 'Mở hồ sơ ứng viên', change: -10, balance: 460, note: 'Unlock ứng viên: Lê Minh Khang (BE2405-0011)' },
  { date: '10/05/2024 11:20', type: 'Phí dịch vụ (Scout Perf.)', change: -150, balance: 470, note: 'Phi dịch vụ tiếp cận ứng viên' },
  { date: '08/05/2024 14:02', type: 'Hoàn credit', change: +50, balance: 620, note: 'Hoàn credit do ứng viên từ chối offer' },
];

export const ACTIVE_SERVICES = [
  { name: 'Scout Credit', status: 'Đang hoạt động', detail: 'Đã unlock: 56 hồ sơ' },
  { name: 'Scout Performance', status: 'Đang xử lý', detail: 'Đang xử lý: 12 ứng viên' },
  { name: 'Saiyo Branding', status: 'Đang hoạt động', detail: '2 landing page active' },
  { name: 'CTV Marketplace', status: 'Đang hoạt động', detail: '3 JD đang mở trên sàn' },
];

export const REQUEST_LIST = [
  { code: 'SP-2405-012', type: 'Scout Performance', jd: 'FE2405-0012', candidate: 'Nguyễn Hoàng Anh', status: 'Đang xử lý', wsAssigned: 'Trần Ngọc Linh', createdAt: '10/05/2024', updatedAt: '10/05/2024 10:30' },
  { code: 'BR-2405-006', type: 'Landing Page Premium', jd: '-', candidate: '-', status: 'Hoàn thành', wsAssigned: 'Lê Minh Đức', createdAt: '08/05/2024', updatedAt: '14/05/2024 16:20' },
  { code: 'CR-2405-008', type: 'Mua thêm credit', jd: '-', candidate: '-', status: 'Hoàn thành', wsAssigned: 'Trần Ngọc Linh', createdAt: '07/05/2024', updatedAt: '13/05/2024 11:10' },
  { code: 'MK-2405-004', type: 'Marketplace Support', jd: 'BE2405-0011', candidate: 'Lê Minh Khang', status: 'Chờ WS phản hồi', wsAssigned: 'Phạm Gia Bảo', createdAt: '06/05/2024', updatedAt: '12/05/2024 09:45' },
  { code: 'BL-2405-003', type: 'Hóa đơn / Báo giá', jd: '-', candidate: '-', status: 'Đang xử lý', wsAssigned: 'Nguyễn Thu Hà', createdAt: '05/05/2024', updatedAt: '10/05/2024 15:30' },
];

export const PENDING_INVOICES = [
  { code: 'INV-2405-028', amount: '15,000,000 VND', deadline: '25/05/2024' },
  { code: 'INV-2405-021', amount: '6,000,000 VND', deadline: '18/05/2024' },
];
