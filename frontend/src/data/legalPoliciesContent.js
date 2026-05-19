/**
 * Nội dung chính sách (theo tài liệu Word WS Jobshare).
 * Dùng cho LegalPoliciesSlidePanel — không phụ thuộc file .docx runtime.
 */

export const LEGAL_TABS = {
  privacy: {
    id: 'privacy',
    labelVi: 'Bảo vệ dữ liệu',
    labelEn: 'Privacy',
    labelJa: 'プライバシー',
    titleVi: 'Chính sách bảo vệ dữ liệu & quyền riêng tư',
    titleEn: 'Data protection & privacy policy',
    titleJa: 'データ保護・プライバシーポリシー',
  },
  commission: {
    id: 'commission',
    labelVi: 'Hoa hồng',
    labelEn: 'Commission',
    labelJa: '歩合',
    titleVi: 'Chính sách hoa hồng',
    titleEn: 'Commission policy',
    titleJa: '歩合・手数料ポリシー',
  },
  terms: {
    id: 'terms',
    labelVi: 'Điều khoản',
    labelEn: 'Terms',
    labelJa: '利用規約',
    titleVi: 'Điều khoản hoạt động',
    titleEn: 'Terms of use',
    titleJa: '活動規約',
  },
};

/** @typedef {{ heading: string, paragraphs: string[] }} LegalSection */

/** @type {{ vi: LegalSection[], en: LegalSection[], ja: LegalSection[] }} */
export const PRIVACY_SECTIONS = {
  vi: [
    {
      heading: '1. Phạm vi áp dụng',
      paragraphs: [
        'Chính sách này quy định việc thu thập, sử dụng và bảo vệ dữ liệu của: CTV, Ứng viên và Doanh nghiệp khi sử dụng nền tảng Workstation JobShare.',
      ],
    },
    {
      heading: '2. Loại dữ liệu thu thập',
      paragraphs: [
        'Bao gồm: thông tin cá nhân (tên, email, điện thoại); CV và hồ sơ ứng viên; dữ liệu hoạt động trên nền tảng.',
      ],
    },
    {
      heading: '3. Mục đích sử dụng',
      paragraphs: [
        'Kết nối tuyển dụng; cung cấp dịch vụ; cải thiện hệ thống; phân tích và tối ưu vận hành.',
      ],
    },
    {
      heading: '4. Chia sẻ dữ liệu',
      paragraphs: [
        'Dữ liệu được chia sẻ chỉ trong phạm vi phục vụ tuyển dụng, với doanh nghiệp tuyển dụng và đối tác liên quan theo quy định.',
      ],
    },
    {
      heading: '5. Nghĩa vụ của CTV',
      paragraphs: [
        'CTV phải có sự đồng ý của ứng viên trước khi gửi dữ liệu; không sử dụng dữ liệu ngoài nền tảng; bảo mật thông tin của ứng viên và doanh nghiệp.',
      ],
    },
    {
      heading: '6. Lưu trữ dữ liệu',
      paragraphs: [
        'Dữ liệu được lưu trữ theo quy định pháp luật. Thời gian lưu trữ tùy mục đích sử dụng.',
      ],
    },
    {
      heading: '7. Bảo mật',
      paragraphs: [
        'Công ty áp dụng kiểm soát truy cập, bảo vệ hệ thống và biện pháp kỹ thuật phù hợp.',
      ],
    },
    {
      heading: '8. Quyền của người dùng',
      paragraphs: [
        'Người dùng có quyền truy cập dữ liệu, chỉnh sửa và yêu cầu xóa theo quy định.',
      ],
    },
    {
      heading: '9. Tuân thủ pháp luật',
      paragraphs: [
        'Tuân thủ Luật An ninh mạng và Nghị định 13/2023 về bảo vệ dữ liệu cá nhân và các quy định liên quan khác.',
      ],
    },
    {
      heading: '10. Cập nhật chính sách',
      paragraphs: [
        'Công ty có thể thay đổi chính sách và thông báo trên nền tảng.',
      ],
    },
  ],
  en: [
    {
      heading: '1. Scope',
      paragraphs: [
        'This policy governs how we collect, use and protect data from collaborators, candidates and businesses using Workstation JobShare.',
      ],
    },
    {
      heading: '2. Data collected',
      paragraphs: [
        'Including: personal information (name, email, phone); CVs and candidate profiles; platform activity data.',
      ],
    },
    {
      heading: '3. Purposes',
      paragraphs: [
        'Recruitment matching; service delivery; system improvement; analytics and operations.',
      ],
    },
    {
      heading: '4. Sharing',
      paragraphs: [
        'Data is shared only as needed for recruitment, with hiring businesses and relevant partners as required.',
      ],
    },
    {
      heading: '5. Collaborator obligations',
      paragraphs: [
        'Obtain candidate consent before sending data; do not use data outside the platform; protect candidate and business information.',
      ],
    },
    {
      heading: '6. Retention',
      paragraphs: [
        'Data is stored in line with law. Retention periods depend on purpose.',
      ],
    },
    {
      heading: '7. Security',
      paragraphs: [
        'We apply access control, system protection and appropriate technical measures.',
      ],
    },
    {
      heading: '8. Your rights',
      paragraphs: [
        'Users may access, correct and request deletion of their data as applicable.',
      ],
    },
    {
      heading: '9. Legal compliance',
      paragraphs: [
        'We comply with applicable laws including cybersecurity and personal data protection regulations.',
      ],
    },
    {
      heading: '10. Updates',
      paragraphs: [
        'We may update this policy and will notify users on the platform.',
      ],
    },
  ],
  ja: [
    {
      heading: '1. 適用範囲',
      paragraphs: [
        '本ポリシーは、Workstation JobShare を利用するコラボレーター、応募者、企業に関するデータの収集・利用・保護を定めます。',
      ],
    },
    {
      heading: '2. 収集するデータ',
      paragraphs: [
        '氏名・メール・電話などの個人情報、履歴書・プロフィール、プラットフォーム上の活動データを含みます。',
      ],
    },
    {
      heading: '3. 利用目的',
      paragraphs: [
        '採用マッチング、サービス提供、システム改善、分析・運用最適化のため。',
      ],
    },
    {
      heading: '4. 共有',
      paragraphs: [
        '採用目的の範囲内で、採用企業および関連パートナーとのみ共有します。',
      ],
    },
    {
      heading: '5. コラボレーターの義務',
      paragraphs: [
        'データ送信前に応募者の同意を得ること、プラットフォーム外での不正利用を禁止すること、情報の機密保持。',
      ],
    },
    {
      heading: '6. 保管',
      paragraphs: [
        '法令に従い保管します。保存期間は目的に応じます。',
      ],
    },
    {
      heading: '7. セキュリティ',
      paragraphs: [
        'アクセス管理、システム保護、適切な技術的手段を講じます。',
      ],
    },
    {
      heading: '8. ユーザーの権利',
      paragraphs: [
        'アクセス、訂正、削除の請求が可能な場合があります。',
      ],
    },
    {
      heading: '9. 法令遵守',
      paragraphs: [
        'サイバーセキュリティおよび個人データ保護に関する法令等を遵守します。',
      ],
    },
    {
      heading: '10. 改定',
      paragraphs: [
        '本ポリシーを変更する場合、プラットフォーム上で通知します。',
      ],
    },
  ],
};

/** @type {{ vi: LegalSection[], en: LegalSection[], ja: LegalSection[] }} */
export const COMMISSION_SECTIONS = {
  vi: [
    {
      heading: '1. Phạm vi áp dụng',
      paragraphs: [
        'Chính sách này quy định cơ chế ghi nhận, tính toán và thanh toán hoa hồng cho Cộng tác viên (“CTV”) tham gia nền tảng Workstation JobShare (“Nền tảng”) do Công ty Cổ phần Workstation (“Công ty”) vận hành.',
      ],
    },
    {
      heading: '2. Nguyên tắc chung',
      paragraphs: [
        'Hoa hồng của CTV được tính dựa trên phí tuyển dụng thực tế mà Công ty thu từ khách hàng.',
        'Công thức: Hoa hồng = Phí tuyển dụng × Tỷ lệ hoa hồng theo cấp bậc (Rank). Tỷ lệ áp dụng theo cấp bậc CTV tại thời điểm ghi nhận giao dịch.',
      ],
    },
    {
      heading: '3. Hệ thống cấp bậc (Rank)',
      paragraphs: [
        'SILVER 25% · GOLD 30% · PLATINUM 40% · DIAMOND 50%',
        'CTV cá nhân khi bắt đầu thường xếp SILVER; nâng cấp theo hiệu quả tuyển dụng và mức độ tham gia quy trình theo quy định Công ty.',
        'CTV tổ chức/doanh nghiệp: cấp bậc và tỷ lệ có thể xác định riêng theo năng lực, quy mô, hiệu quả hợp tác, ghi nhận qua thỏa thuận/hợp đồng.',
        'Công ty có quyền điều chỉnh cấp bậc và áp dụng cơ chế phân loại phù hợp chiến lược vận hành.',
      ],
    },
    {
      heading: '4. Xác định cấp bậc',
      paragraphs: [
        '4.1 Hiệu quả tuyển dụng: số lượt tuyển thành công, tốc độ, tỷ lệ chuyển đổi, ứng viên hợp lệ, doanh thu mang lại, v.v.',
        '4.2 Mức độ tham gia: tìm kiếm ứng viên, screening, hoàn thiện hồ sơ/CV, hỗ trợ phỏng vấn, theo dõi offer và onboarding.',
        '4.3 Đánh giá nội bộ: phương pháp và ngưỡng có thể điều chỉnh; CTV không khiếu nại về phương pháp tính nội bộ.',
      ],
    },
    {
      heading: '5. Điều chỉnh cấp bậc',
      paragraphs: [
        'Có thể cập nhật tự động hoặc đánh giá định kỳ; nâng/giảm hạng theo hiệu suất. Công ty có toàn quyền quyết định.',
      ],
    },
    {
      heading: '6. Ghi nhận ứng viên',
      paragraphs: [
        'Ứng viên hợp lệ khi có đủ thông tin, có đồng ý, và chưa trùng trong hệ thống trong vòng 6 tháng. Hồ sơ trùng không ghi nhận cho CTV gửi sau.',
      ],
    },
    {
      heading: '7. Điều kiện nhận hoa hồng',
      paragraphs: [
        'Ứng viên tuyển dụng thành công, đã bắt đầu làm việc, và khách hàng đã thanh toán phí cho Công ty.',
      ],
    },
    {
      heading: '8. Thanh toán',
      paragraphs: [
        'Theo từng giao dịch hợp lệ; thời gian: tháng tiếp theo sau khi Công ty nhận phí (hoặc theo từng khách hàng). Hình thức: chuyển khoản. CTV cung cấp thông tin thanh toán chính xác.',
      ],
    },
    {
      heading: '9. Bảo hành và hoàn trả',
      paragraphs: [
        'Nếu ứng viên nghỉ sớm trong thời bảo hành khiến Công ty hoàn phí cho khách hàng, CTV hoàn trả phần hoa hồng tương ứng. Công ty có thể khấu trừ kỳ sau hoặc yêu cầu hoàn trả trực tiếp.',
      ],
    },
    {
      heading: '10. Gian lận và xử lý',
      paragraphs: [
        'Cấm thông tin giả, thao túng hệ thống, spam/lạm dụng, vi phạm pháp luật. Công ty có thể từ chối ghi nhận, thu hồi hoa hồng, khóa tài khoản, yêu cầu bồi thường.',
      ],
    },
    {
      heading: '11. Giới hạn trách nhiệm',
      paragraphs: [
        'Công ty không chịu trách nhiệm đối với tranh chấp giữa CTV với ứng viên hoặc khách hàng (trong phạm vi pháp luật cho phép).',
      ],
    },
  ],
  en: [
    {
      heading: '1. Scope',
      paragraphs: [
        'This policy governs how commissions are recorded, calculated and paid to collaborators on Workstation JobShare, operated by Workstation Joint Stock Company.',
      ],
    },
    {
      heading: '2. General principles',
      paragraphs: [
        'Commissions are based on actual recruitment fees collected from clients.',
        'Formula: Commission = Recruitment fee × Rate by Rank at the time the transaction is recorded.',
      ],
    },
    {
      heading: '3. Rank system',
      paragraphs: [
        'SILVER 25% · GOLD 30% · PLATINUM 40% · DIAMOND 50%. New individuals typically start at SILVER; upgrades depend on performance and process participation.',
        'Organizations may have separate rates via agreement/contract.',
        'The company may adjust ranks and classification as operations require.',
      ],
    },
    {
      heading: '4–11. Performance, eligibility, payment, warranty clawback, fraud, liability',
      paragraphs: [
        'Ranks consider recruitment outcomes and contribution (sourcing, screening, CV support, interviews, offer/onboarding).',
        'Valid candidates require complete data, consent, and no duplicate within 6 months.',
        'Commission is due when hire is successful, work has started, and the client has paid.',
        'Payment timing and method as announced; provide accurate bank details.',
        'Warranty refunds may require commission repayment; fraud may lead to forfeiture, account suspension or legal action.',
        'The company is not liable for disputes between collaborators and candidates or clients, within applicable law.',
      ],
    },
  ],
  ja: [
    {
      heading: '1. 適用範囲',
      paragraphs: [
        '本ポリシーは、株式会社ワークステーションが運営する Workstation JobShare におけるコラボレーター向け歩合の記録・計算・支払いを定めます。',
      ],
    },
    {
      heading: '2. 基本原則',
      paragraphs: [
        '歩合は顧客から実際に受領した採用手数料に基づきます。歩合 = 採用手数料 × ランク別率（取引記録時点）。',
      ],
    },
    {
      heading: '3. ランク',
      paragraphs: [
        'SILVER 25% · GOLD 30% · PLATINUM 40% · DIAMOND 50%。個人は通常 SILVER から開始し、実績・参加度に応じて昇格。法人は別契約で決定する場合があります。',
      ],
    },
    {
      heading: '4–11',
      paragraphs: [
        '実績・貢献度に基づく評価、候補者の有効性（同意・重複なし等）、支払条件、保証返金に伴う歩合返還、不正行為への対応、責任の限界について、会社の定めに従います。',
      ],
    },
  ],
};

/** @type {{ vi: LegalSection[], en: LegalSection[], ja: LegalSection[] }} */
export const TERMS_SECTIONS = {
  vi: [
    {
      heading: '1. Giới thiệu',
      paragraphs: [
        'Workstation JobShare (“Nền tảng”) kết nối Cộng tác viên tuyển dụng (“CTV”) với cơ hội tuyển dụng do Công ty Cổ phần Workstation (“Công ty”) cung cấp. Đăng ký và sử dụng đồng nghĩa CTV đã đọc, hiểu và đồng ý toàn bộ điều khoản.',
      ],
    },
    {
      heading: '2. Đối tượng sử dụng',
      paragraphs: [
        'Cá nhân từ đủ 18 tuổi, có năng lực hành vi dân sự; hoặc tổ chức/công ty có nhu cầu hợp tác. Công ty có quyền từ chối hoặc chấm dứt tài khoản nếu không đáp ứng tiêu chí.',
      ],
    },
    {
      heading: '3. Tài khoản & bảo mật',
      paragraphs: [
        'Mỗi CTV chịu trách nhiệm về tài khoản; không chia sẻ cho bên thứ ba; mọi hoạt động từ tài khoản được xem là của CTV.',
      ],
    },
    {
      heading: '4. Cách thức hoạt động',
      paragraphs: [
        'CTV truy cập job, gửi ứng viên tiến cử hoặc cập nhật vào cơ sở dữ liệu; Công ty xử lý và chuyển tới khách hàng. Công ty có toàn quyền quyết định việc sử dụng hồ sơ.',
      ],
    },
    {
      heading: '5. Quy tắc hợp tác',
      paragraphs: [
        'Không liên hệ trực tiếp khách hàng ngoài nền tảng; không khai thác dữ liệu ứng viên cho mục đích riêng; không cung cấp thông tin sai lệch; không gian lận.',
      ],
    },
    {
      heading: '6. Sở hữu dữ liệu',
      paragraphs: [
        'Dữ liệu trên nền tảng thuộc quyền quản lý của Công ty; CTV chỉ sử dụng trong phạm vi hợp tác.',
      ],
    },
    {
      heading: '7. Phí & quyền lợi',
      paragraphs: [
        'CTV nhận hoa hồng theo Chính sách hoa hồng. Điều kiện nhận phí được quy định riêng.',
      ],
    },
    {
      heading: '8. Tạm ngưng & chấm dứt',
      paragraphs: [
        'Công ty có quyền khóa tài khoản, từ chối hợp tác khi CTV vi phạm hoặc có hành vi gian lận gây ảnh hưởng hệ thống.',
      ],
    },
    {
      heading: '9. Giới hạn trách nhiệm',
      paragraphs: [
        'Công ty không chịu trách nhiệm đối với tranh chấp giữa CTV với ứng viên hoặc doanh nghiệp. Mức trách nhiệm tối đa (nếu có) không vượt quá phí dịch vụ đã thu.',
      ],
    },
    {
      heading: '10. Luật áp dụng',
      paragraphs: [
        'Áp dụng pháp luật Việt Nam. Tranh chấp giải quyết tại Trung tài Quốc tế Việt Nam (VIAC) theo quy định hiện hành.',
      ],
    },
  ],
  en: [
    {
      heading: '1. Introduction',
      paragraphs: [
        'Workstation JobShare connects recruitment collaborators with opportunities provided by Workstation Joint Stock Company. Registration means acceptance of these terms.',
      ],
    },
    {
      heading: '2–10',
      paragraphs: [
        'Eligibility (individuals 18+ or organizations), account security, platform workflow, cooperation rules, data ownership, fees per commission policy, suspension/termination, liability limits, and governing law (Vietnam; disputes at VIAC) apply as described in the full Vietnamese terms.',
      ],
    },
  ],
  ja: [
    {
      heading: '1. はじめに',
      paragraphs: [
        'Workstation JobShare は、株式会社ワークステーションが提供する採用機会とコラボレーターをつなぐプラットフォームです。登録・利用により本規約に同意したものとみなします。',
      ],
    },
    {
      heading: '2–10',
      paragraphs: [
        '利用資格、アカウント管理、活動方法、協力ルール、データ、手数料・停止・終了、責任制限、準拠法・紛争解決（VIAC 等）は、ベトナム語版の定めに従います。',
      ],
    },
  ],
};

export function getSectionsForTab(tabId, lang) {
  const l = lang === 'en' || lang === 'ja' ? lang : 'vi';
  if (tabId === 'privacy') return PRIVACY_SECTIONS[l];
  if (tabId === 'commission') return COMMISSION_SECTIONS[l];
  if (tabId === 'terms') return TERMS_SECTIONS[l];
  return PRIVACY_SECTIONS.vi;
}
