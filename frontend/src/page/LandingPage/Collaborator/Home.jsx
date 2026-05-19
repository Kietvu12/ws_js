import React, { useEffect, useRef, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { formatDistanceToNow } from 'date-fns'
import { enUS, ja, vi as viFns } from 'date-fns/locale'
import { Link, useLocation } from 'react-router-dom'
import apiService from '../../../services/api'
import { translations as appTranslations } from '../../../translations/translations'
import {
  formatPublicPostDate,
  pickPublicPostCategoryLabel,
  pickPublicPostExcerpt,
  pickPublicPostTitle,
} from '../../../utils/publicPostDisplay'
import { useLanguage } from '../../../context/LanguageContext'
import heroSectionBg from '../../../assets/1936706726032224537.jpg'
import heroPeopleCutout from '../../../assets/名称未設定のデザイン (8).png'
import jobShareWhiteLogo from '../../../assets/JobShare (White).png'

const seoMeta = {
  vi: {
    title: 'Trở thành Cộng tác viên JobShare | Hoa hồng lên đến 50% | Tuyển dụng kỹ sư Nhật Bản',
    description: 'Đăng ký làm cộng tác viên Workstation JobShare. Giới thiệu ứng viên, nhận hoa hồng lên đến 50%. Cộng đồng cộng tác viên tuyển dụng kỹ sư Nhật Bản lớn nhất.',
    keywords: 'cộng tác viên, cộng tác viên JobShare, hoa hồng tuyển dụng, giới thiệu ứng viên, tuyển dụng kỹ sư Nhật, JobShare, collaborator, việc làm Nhật Bản',
    ogTitle: 'Cộng tác viên JobShare | Hoa hồng lên đến 50%',
    ogDesc: 'Trở thành cộng tác viên JobShare, giới thiệu ứng viên kỹ sư tại Nhật Bản và nhận hoa hồng hấp dẫn.',
  },
  en: {
    title: 'Become a JobShare Collaborator | Up to 50% Commission | Japan Engineer Recruitment',
    description: 'Join Workstation JobShare as a collaborator. Refer candidates, earn up to 50% commission. The largest collaborator community for engineer recruitment in Japan.',
    keywords: 'collaborator, JobShare collaborator, recruitment commission, refer candidates, Japan engineer recruitment, JobShare, Japan jobs',
    ogTitle: 'JobShare Collaborator | Earn Up to 50% Commission',
    ogDesc: 'Become a JobShare collaborator, refer engineering candidates in Japan and earn attractive commissions.',
  },
  ja: {
    title: 'JobShareコラボレーターになる | 報酬最大50% | 日本エンジニア採用',
    description: 'Workstation JobShareのコラボレーターに登録。候補者を紹介し、最大50%の報酬を獲得。日本最大級のエンジニア採用コラボレーターコミュニティ。',
    keywords: 'コラボレーター, JobShare, 紹介報酬, 候補者紹介, エンジニア採用, 日本就職, 人材紹介',
    ogTitle: 'JobShareコラボレーター | 報酬最大50%',
    ogDesc: 'JobShareコラボレーターになり、日本のエンジニア候補者を紹介して魅力的な報酬を獲得しましょう。',
  },
}

const i18n = {
  vi: {
    heroBadge: 'Cộng tác viên JobShare',
    heroTitleRed1: 'KẾT NỐI',
    heroTitleWhite1: 'CƠ HỘI',
    heroTitleWhite2: 'NHÂN ĐÔI',
    heroTitleRed2: 'THÀNH CÔNG',
    heroDesc:
      'Đồng hành cùng doanh nghiệp trong hành trình tìm kiếm ứng viên nước ngoài phù hợp. Bạn giới thiệu ứng viên phù hợp, JobShare hỗ trợ hệ thống theo dõi minh bạch và chi trả hoa hồng rõ ràng.',
    heroBtnPrimary: 'Trở thành cộng tác viên',
    heroBtnSecondary: 'Tìm hiểu thêm',
    aboutTitleLine1: 'Cộng đồng cộng tác viên',
    aboutTitleLine2: 'Tuyển dụng kỹ sư Nhật Bản lớn nhất',
    aboutCard1Title: 'NẮM BẮT CƠ HỘI TUYỂN DỤNG',
    aboutCard1Desc:
      'Tiếp cận hệ thống job kỹ sư tại Nhật Bản được cập nhật liên tục, phù hợp với nhiều cấp độ và chuyên môn khác nhau, giúp bạn dễ dàng lựa chọn vị trí để giới thiệu ứng viên.',
    aboutCard2Title: 'QUẢN LÝ TIẾN ĐỘ HIỆU QUẢ',
    aboutCard2Desc:
      'Theo dõi toàn bộ quá trình giới thiệu ứng viên từ lúc apply đến khi trúng tuyển. Mọi trạng thái đều được cập nhật minh bạch, giúp bạn chủ động tối ưu hiệu suất làm việc.',
    aboutCard3Title: 'PHỐI HỢP & HỖ TRỢ BẰNG AI',
    aboutCard3Desc:
      'Làm việc trực tiếp cùng đội ngũ Workstation trong suốt quy trình tuyển dụng, đồng thời tận dụng các công cụ AI như gợi ý việc làm và tạo hồ sơ ứng viên theo chuẩn, giúp tăng tỷ lệ thành công.',
    whyTitle: 'Why Choose Us?',
    whyDesc:
      'Lợi thế khi tham gia hệ sinh thái cộng tác viên JobShare: chính sách minh bạch, quy trình đơn giản, và đội ngũ chuyên viên đồng hành xuyên suốt.',
    whyCard1Title: 'Chính sách hoa hồng rõ ràng, khởi điểm từ 25% lên đến 50%',
    whyCard1Desc:
      'cộng tác viên được chia sẻ phần trăm phí giới thiệu theo cơ chế minh bạch. Thành tích tốt sẽ giúp bạn thăng hạng và tăng tỉ lệ hoa hồng lên đến 50%.',
    whyCard2Title: 'Không cần kinh nghiệm - có hướng dẫn chi tiết',
    whyCard2Desc:
      'Bạn chỉ cần biết ai đang tìm việc, mọi quy trình còn lại như tư vấn, sửa CV, phỏng vấn... sẽ được đội ngũ JobShare hỗ trợ.',
    whyCard3Title: 'Cơ hội đồng hành cùng đội ngũ tuyển dụng hơn 10 năm kinh nghiệm',
    whyCard3Desc:
      'Đội ngũ chuyên nghiệp sẽ hỗ trợ bạn xử lý yêu cầu tuyển dụng kỹ sư Nhật, đảm bảo thông tin minh bạch và hiệu quả tuyển dụng cao.',
    whyCard4Title: 'Kho job đa dạng, cập nhật liên tục từ doanh nghiệp Nhật',
    whyCard4Desc:
      'JobShare cung cấp nguồn job tuyển dụng kỹ sư từ các doanh nghiệp Nhật đã được xử lý và chuẩn hóa. Bạn có thể chọn job phù hợp và bắt đầu tiến cử ứng viên ngay mà không cần tự tìm kiếm khách hàng.',
    aiCvPromoTitle:
      'Chỉ mất 3 phút để có CV chuẩn Nhật với công nghệ AI của Workstation JobShare.',
    aiCvPromoCta: 'Thử ngay - Miễn phí',
    guideTitleLine1: '3 bước đơn giản',
    guideTitleLine2: 'để trở thành 1 Cộng tác viên của JobShare',
    guideStep1Title: 'Đăng ký trở thành cộng tác viên',
    guideStep1Desc:
      'Đọc kỹ Quy định & Chính sách sử dụng nền tảng JobShare dành cho cộng tác viên, sau đó điền form đăng ký. Hệ thống sẽ ghi nhận và liên lạc qua mail đã đăng ký.',
    guideStep2Title: 'Tìm ứng viên & tiến cử',
    guideStep2Desc:
      'Cộng tác viên tìm ứng viên phù hợp với điều kiện ứng tuyển của mỗi việc làm đang tuyển, sau đó điền thông tin ứng tuyển và form tiến cử. cộng tác viên cần đảm bảo rằng thông tin ứng viên tiến cử là chính xác và đã được sự đồng thuận rõ ràng từ chính ứng viên trước khi gửi cho JobShare.',
    guideStep3Title: 'Follow quá trình tiến cử và nhận hoa hồng xứng đáng',
    guideStep3Desc:
      'Sau khi tiến cử ứng viên, cộng tác viên sẽ theo dõi quá trình tiến cử qua hệ thống JobShare, hỗ trợ ứng viên trong quá trình phỏng vấn và bổ sung thông tin khi cần thiết. Khi ứng viên được tuyển dụng thành công, cộng tác viên sẽ nhận được khoản hoa hồng tương ứng theo cơ chế minh bạch và rõ ràng.',
    partnerTitleLine1: 'Hơn 200 đối tác doanh nghiệp Nhật',
    partnerTitleLine2: 'đang tìm kiếm nhân sự nước ngoài',
    featureTitle: '4 tính năng miễn phí dành cho bạn',
    feature1Title: 'Truy cập kho dữ liệu việc làm',
    feature1Desc:
      'Truy cập hàng nghìn cơ hội việc làm kỹ sư tại Nhật Bản và dễ dàng tìm kiếm vị trí phù hợp để giới thiệu ứng viên.',
    feature1Points: [
      'Xem và tìm kiếm các vị trí kỹ sư tại Nhật Bản theo ngành nghề, khu vực và yêu cầu',
      'Gợi ý việc làm phù hợp nhờ hệ thống AI matching',
      'Thông tin tuyển dụng chi tiết giúp tăng tỷ lệ tiến cử thành công',
    ],
    feature2Title: 'Quản lý hồ sơ ứng viên',
    feature2Desc:
      'Quản lý thông tin ứng viên thông minh, giúp tiết kiệm thời gian và tăng hiệu quả tuyển dụng.',
    feature2Points: [
      'Tự động tạo hồ sơ ứng viên theo chuẩn format CV Nhật Bản bằng AI',
      'Lưu trữ và quản lý dữ liệu ứng viên không giới hạn',
      'Hệ thống gợi ý các vị trí phù hợp để tăng khả năng trúng tuyển',
    ],
    feature3Title: 'Quản lý tiến trình tuyển dụng',
    feature3Desc:
      'Theo dõi toàn bộ quá trình tuyển dụng của ứng viên một cách tập trung và minh bạch.',
    feature3Points: [
      'Quản lý tiến độ tuyển dụng của từng ứng viên theo từng vòng phỏng vấn',
      'Dễ dàng trao đổi và phối hợp với đội ngũ Workstation trong quá trình tuyển dụng',
      'Tìm kiếm và lọc ứng viên theo trạng thái tuyển dụng',
    ],
    feature4Title: 'Cập nhật sự kiện tuyển dụng và đăng ký tham gia trực tiếp',
    feature4Desc:
      'Cập nhật các sự kiện giới thiệu việc làm và chương trình đào tạo mới nhất dành riêng cho cộng tác viên JobShare.',
    feature4Points: [
      'Theo dõi các sự kiện giới thiệu việc làm tại Nhật Bản',
      'Tham gia các chương trình đào tạo và chia sẻ kinh nghiệm tuyển dụng',
      'Đăng ký tham gia sự kiện trực tiếp trên hệ thống',
    ],
    featureCta: 'Khám phá ngay',
    hotNewsTitle: 'Tin tức cập nhật',
    hotNewsDesc: 'Cập nhật nhanh thông tin, mẹo làm cộng tác viên và xu hướng việc làm Nhật Bản.',
    hotNewsViewAll: 'Xem tất cả tin tức',
    hotNewsTagFallback: 'Tin tức',
    faqTitle: 'Câu hỏi thường gặp',
    faqItems: [
      {
        q: 'Làm thế nào để trở thành cộng tác viên?',
        paragraphs: [
          'Để trở thành cộng tác viên, bạn cần đăng ký tài khoản và hoàn thiện thông tin cá nhân. Sau đó, bạn có thể nộp đơn ứng tuyển vào các vị trí cộng tác viên đang được đăng tuyển.',
        ],
      },
      {
        q: 'Thế nào được coi là một hồ sơ tiến cử hợp lệ?',
        paragraphs: [
          'CV tiến cử hợp lệ là hồ sơ ứng viên không trùng với bất kỳ hồ sơ nào đã có trong hệ thống JobShare trong vòng 6 tháng gần nhất.',
          'Nếu ứng viên chưa từng có trong hệ thống hoặc đã được tiến cử từ trước đó hơn 6 tháng → CV được ghi nhận là hợp lệ và quyền lợi thuộc về cộng tác viên tiến cử hiện tại.',
          'Nếu ứng viên đã từng được một cộng tác viên khác tiến cử trong vòng 6 tháng → quyền lợi vẫn thuộc về cộng tác viên ban đầu, hồ sơ mới không được ghi nhận.',
          'Trường hợp đặc biệt: Nếu ứng viên từng từ chối apply khi được cộng tác viên ban đầu tiến cử, nhưng sau đó được cộng tác viên khác tiến cử lại trong vòng 6 tháng → JobShare sẽ tiến hành xác minh theo quy trình riêng.',
        ],
      },
      {
        q: 'Làm sao để nâng cao hiệu suất công việc?',
        paragraphs: [
          'Để nâng cao hiệu suất, bạn nên:',
          '1) Cập nhật thường xuyên kỹ năng và kiến thức tại các lớp đào tạo chuyên biệt của Workstation',
          '2) Kiên trì và có lịch hàng ngày cho việc đăng tin tuyển dụng, tìm kiếm ứng viên',
          '3) Luôn luôn đặt mình vào vị trí của ứng viên, hỏi thăm và hiểu câu chuyện tìm việc của họ',
          '4) Tận dụng các công cụ hỗ trợ để nâng cao sáng tạo trong content tuyển dụng, công cụ quản lý danh sách ứng viên của riêng mình',
        ],
      },
      {
        q: 'Có thể làm việc từ xa không?',
        paragraphs: [
          'Có, chúng tôi hỗ trợ làm việc từ xa. Bạn chỉ cần đảm bảo có kết nối internet ổn định và tuân thủ các quy định về bảo mật thông tin.',
        ],
      },
      {
        q: 'Làm thế nào để báo cáo vấn đề kỹ thuật?',
        paragraphs: [
          'Bạn có thể báo cáo vấn đề kỹ thuật thông qua:',
          '1) Email hỗ trợ',
          '2) Form liên hệ trên website',
          '3) Hotline Zalo hỗ trợ. Chúng tôi sẽ phản hồi trong vòng 24 giờ làm việc.',
        ],
      },
      {
        q: 'Có chính sách đào tạo không?',
        paragraphs: [
          'Có, chúng tôi cung cấp các khóa đào tạo định kỳ và tài liệu hướng dẫn chi tiết. Sau tháng đầu tiên tham gia nền tảng, bạn sẽ được tham gia vào khóa đào tạo cơ bản gồm 3 buổi, dành riêng cho cộng tác viên của JobShare, được đào tạo bởi chuyên viên tư vấn tuyển dụng có hơn 10 năm kinh nghiệm của chúng tôi.',
        ],
      },
    ],
    jobPickupTitle: 'Công việc bạn sẽ yêu thích',
    jobPickupStatLabel: 'Việc làm trên JobShare.',
    jobPickupExploreAll: 'Khám phá tất cả',
    jobPickupCards: [
      {
        company: 'Founders',
        postedAgo: '3 ngày trước',
        title: 'Marketing & Communications Manager (Internship/Co-founder)',
        meta: 'Toàn thời gian tại Copenhagen',
        tag: 'design',
      },
      {
        company: 'Mailchimp',
        postedAgo: '2 ngày trước',
        title: 'Senior B2B Sales Consultant - Sweden',
        meta: 'Toàn thời gian tại Copenhagen',
        tag: 'development',
      },
      {
        company: 'Chobani',
        postedAgo: '3 ngày trước',
        title: 'Senior Creative Director with a partnership role',
        meta: 'Toàn thời gian tại Copenhagen',
        tag: 'business development',
      },
      {
        company: 'ProsperOps',
        postedAgo: '3 ngày trước',
        title: 'Marketing & Communications Manager (Internship/Co-founder)',
        meta: 'Toàn thời gian tại Copenhagen',
        tag: 'customer support',
      },
      {
        company: 'Mailchimp',
        postedAgo: '2 ngày trước',
        title: 'Senior B2B Sales Consultant - Sweden',
        meta: 'Toàn thời gian tại Copenhagen',
        tag: 'marketing',
      },
    ],
    footerCtaTitleWhite: 'Sẵn sàng',
    footerCtaTitleRed: 'bắt đầu',
    footerCtaTitleWhiteEnd: 'chưa?',
    footerCtaDesc:
      'Đăng ký ngay hôm nay để trở thành cộng tác viên của JobShare và khám phá hàng trăm cơ hội việc làm Nhật Bản. Hoàn toàn miễn phí!',
    footerBtnPrimary: 'Đăng ký ngay',
    footerBtnSecondary: 'Liên hệ tư vấn',
    footerExploreTitle: 'Khám phá',
    footerExploreLinks: ['Danh sách việc làm', 'Giới thiệu', 'Partner', 'Blog'],
    footerSupportTitle: 'Hỗ trợ',
    footerSupportLinks: ['Hướng dẫn sử dụng', 'FAQ', 'Tài liệu về chúng tôi', 'Liên hệ'],
    footerContactTitle: 'Liên hệ',
    footerContactLocation: '3F, 82 Tuệ Tĩnh, Hai Bà Trưng, Hanoi, Vietnam, 10000',
    footerLinkTitle: 'Liên kết',
    footerLinkUrl: 'ws-jobshare.com',
    footerContactInfoTitle: 'Thông tin liên hệ',
    footerContactPhone: '097 289 97 28',
    footerDesc:
      'Nền tảng kết nối việc làm Nhật Bản thông qua cộng đồng giới thiệu nhân sự.',
  },
  en: {
    heroBadge: 'JobShare Collaborator',
    heroTitleRed1: 'CONNECT',
    heroTitleWhite1: 'OPPORTUNITIES',
    heroTitleWhite2: 'DOUBLE',
    heroTitleRed2: 'SUCCESS',
    heroDesc:
      'Partner with companies on their journey to find the right international candidates. You refer suitable talent, and JobShare provides transparent tracking and clear commission payouts.',
    heroBtnPrimary: 'Become a Collaborator',
    heroBtnSecondary: 'Learn More',
    aboutTitleLine1: "Japan's largest community of collaborators",
    aboutTitleLine2: 'Recruiting engineers for Japan',
    aboutCard1Title: 'SEIZE RECRUITMENT OPPORTUNITIES',
    aboutCard1Desc:
      'Access a constantly updated catalog of engineer jobs in Japan across many levels and specialties, so you can easily choose roles to introduce candidates.',
    aboutCard2Title: 'MANAGE PROGRESS EFFECTIVELY',
    aboutCard2Desc:
      'Track every step of your referrals from application to hire. Statuses stay transparently updated so you can optimize how you work.',
    aboutCard3Title: 'COORDINATION & AI SUPPORT',
    aboutCard3Desc:
      'Work directly with the Workstation team throughout hiring while using AI tools such as job suggestions and standard candidate profiles to improve success rates.',
    whyTitle: 'Why Choose Us?',
    whyDesc:
      'Key benefits of joining the JobShare collaborator ecosystem: transparent policies, a simple process, and dedicated experts supporting you throughout.',
    whyCard1Title: 'Clear commission policy, starting from 25% up to 50%',
    whyCard1Desc:
      'Collaborators share referral fees with a transparent mechanism. Strong performance helps you level up and increase your commission rate to 50%.',
    whyCard2Title: 'No experience required - detailed guidance included',
    whyCard2Desc:
      'You only need to know who is looking for a job. The remaining steps such as consulting, CV review, and interviews are supported by JobShare.',
    whyCard3Title: 'Work with a recruitment team with 10+ years of experience',
    whyCard3Desc:
      'Our professional team helps you handle Japanese engineer hiring requests with transparent information and strong recruitment efficiency.',
    aiCvPromoTitle:
      'Get a Japan-standard CV in just 3 minutes with JobShare AI technology.',
    aiCvPromoCta: 'Try now — Free',
    guideTitleLine1: '3 simple steps',
    guideTitleLine2: 'to become a JobShare collaborator',
    guideStep1Title: 'Register to become a collaborator',
    guideStep1Desc:
      'Read the JobShare collaborator policy carefully, then submit the registration form. The system records your request and contacts you via your registered email.',
    guideStep2Title: 'Find candidates & submit referrals',
    guideStep2Desc:
      'Collaborators find candidates who match each open role, then submit the application details and referral form. Please ensure candidate information is accurate and clearly consented before sending to JobShare.',
    guideStep3Title: 'Follow referral progress and earn proper commissions',
    guideStep3Desc:
      'After referral, collaborators track progress through the 3-party support group (collaborator - candidate - JobShare) to support interviews and additional requirements. When candidates are hired successfully, commissions are paid transparently based on policy.',
    partnerTitleLine1: 'Over 200 Japanese corporate partners',
    partnerTitleLine2: 'seeking international talent',
    featureTitle: '4 free features for you',
    feature1Title: 'Access the job database',
    feature1Desc:
      'Access thousands of engineer job opportunities in Japan and easily find suitable roles to refer candidates.',
    feature1Points: [
      'Search engineering positions in Japan by industry, region, and requirements',
      'Get suitable job recommendations with the AI matching system',
      'Detailed hiring information helps increase successful referral rates',
    ],
    feature2Title: 'Manage candidate profiles',
    feature2Desc:
      'Manage candidate information smartly to save time and improve recruitment efficiency.',
    feature2Points: [
      'Automatically generate candidate profiles in Japanese-standard CV format using AI',
      'Store and manage unlimited candidate data',
      'The system recommends suitable positions to improve hiring success',
    ],
    feature3Title: 'Manage the recruitment process',
    feature3Desc:
      "Track each candidate's recruitment journey in one focused, transparent place.",
    feature3Points: [
      'Track each candidate recruitment progress by interview stage',
      'Easily communicate and collaborate with the Workstation team during recruitment',
      'Search and filter candidates by recruitment status',
    ],
    feature4Title: 'Recruitment events and direct registration',
    feature4Desc:
      'Stay updated on job events and the latest training programs for JobShare collaborators.',
    feature4Points: [
      'Follow job introduction events in Japan',
      'Join training programs and recruitment experience-sharing sessions',
      'Register for events directly on the platform',
    ],
    featureCta: 'Explore now',
    hotNewsTitle: 'Tin tức cập nhật',
    hotNewsDesc: 'Quick updates, collaborator tips, and job market trends in Japan.',
    hotNewsViewAll: 'View all news',
    hotNewsTagFallback: 'News',
    faqTitle: 'Frequently asked questions',
    faqItems: [
      {
        q: 'How do I become a collaborator?',
        paragraphs: [
          'Register an account and complete your profile. You can then apply for open collaborator positions.',
        ],
      },
      {
        q: 'What counts as a valid referral profile?',
        paragraphs: [
          'A valid referral means the candidate profile does not duplicate any profile already in JobShare within the last 6 months.',
          'If the candidate has never been in the system, or was referred more than 6 months ago → the CV is accepted as valid and the benefit belongs to the current referring collaborator.',
          'If another collaborator referred the same candidate within 6 months → the benefit stays with the first collaborator; the new profile is not accepted.',
          'Special case: If the candidate previously declined to apply when referred by the first collaborator, but is referred again by someone else within 6 months → JobShare will verify according to our internal process.',
        ],
      },
      {
        q: 'How can I improve my performance?',
        paragraphs: [
          'To perform better, you should:',
          '1) Keep updating skills and knowledge through Workstation specialist training',
          '2) Stay consistent with a daily routine for outreach and candidate sourcing',
          '3) Put yourself in the candidate’s shoes—ask questions and understand their job search story',
          '4) Use support tools to boost creative recruiting content and manage your own candidate lists',
        ],
      },
      {
        q: 'Can I work remotely?',
        paragraphs: [
          'Yes. We support remote work. You need a stable internet connection and must follow our information security rules.',
        ],
      },
      {
        q: 'How do I report a technical issue?',
        paragraphs: [
          'You can report technical issues via:',
          '1) Support email',
          '2) Contact form on the website',
          '3) Zalo support hotline. We respond within 24 business hours.',
        ],
      },
      {
        q: 'Is there a training policy?',
        paragraphs: [
          'Yes. We offer regular training and detailed guides. After your first month on the platform, you can join a 3-session basic training program for JobShare collaborators, delivered by our recruitment consultants with over 10 years of experience.',
        ],
      },
    ],
    jobPickupTitle: 'Find a job you will love',
    jobPickupStatLabel: 'Jobs on JobShare.',
    jobPickupExploreAll: 'Explore all jobs',
    jobPickupCards: [
      {
        company: 'Founders',
        postedAgo: '3 days ago',
        title: 'Marketing & Communications Manager (Internship/Co-founder)',
        meta: 'Full Time in Copenhagen',
        tag: 'design',
      },
      {
        company: 'Mailchimp',
        postedAgo: '2 days ago',
        title: 'Senior B2B Sales Consultant - Sweden',
        meta: 'Full Time in Copenhagen',
        tag: 'development',
      },
      {
        company: 'Chobani',
        postedAgo: '3 days ago',
        title: 'Senior Creative Director with a partnership role',
        meta: 'Full Time in Copenhagen',
        tag: 'business development',
      },
      {
        company: 'ProsperOps',
        postedAgo: '3 days ago',
        title: 'Marketing & Communications Manager (Internship/Co-founder)',
        meta: 'Full Time in Copenhagen',
        tag: 'customer support',
      },
      {
        company: 'Mailchimp',
        postedAgo: '2 days ago',
        title: 'Senior B2B Sales Consultant - Sweden',
        meta: 'Full Time in Copenhagen',
        tag: 'marketing',
      },
    ],
    footerCtaTitleWhite: 'Ready to',
    footerCtaTitleRed: 'get started',
    footerCtaTitleWhiteEnd: '?',
    footerCtaDesc:
      'Register today to become a JobShare collaborator and explore hundreds of job opportunities in Japan. Completely free!',
    footerBtnPrimary: 'Register now',
    footerBtnSecondary: 'Contact advisor',
    footerExploreTitle: 'Explore',
    footerExploreLinks: ['Job listings', 'About', 'Partners', 'Blog'],
    footerSupportTitle: 'Support',
    footerSupportLinks: ['User guide', 'FAQ', 'Our documents', 'Contact'],
    footerContactTitle: 'Contact',
    footerContactLocation: '3F, 82 Tue Tinh, Hai Ba Trung, Hanoi, Vietnam, 10000',
    footerLinkTitle: 'Links',
    footerLinkUrl: 'ws-jobshare.com',
    footerContactInfoTitle: 'Contact Info',
    footerContactPhone: '097 289 97 28',
    footerDesc: 'A Japan job connection platform powered by a talent referral community.',
  },
  ja: {
    heroBadge: 'JobShare コラボレーター',
    heroTitleRed1: 'つなぐ',
    heroTitleWhite1: 'チャンス',
    heroTitleWhite2: '成功を',
    heroTitleRed2: '倍増',
    heroDesc:
      '企業の外国人材採用に向けた取り組みに伴走します。適切な候補者をご紹介いただき、JobShareが透明性のある進捗管理と明確なコミッション支払いをサポートします。',
    heroBtnPrimary: 'コラボレーターになる',
    heroBtnSecondary: '詳しく見る',
    aboutTitleLine1: '日系エンジニア採用コラボレーター',
    aboutTitleLine2: 'コミュニティ日本最大級',
    aboutCard1Title: '採用のチャンスをつかむ',
    aboutCard1Desc:
      '日本のエンジニア求人を継続的に更新し、さまざまなレベル・専門領域に対応。候補者を紹介しやすいポジションを選びやすくします。',
    aboutCard2Title: '進捗を効率的に管理',
    aboutCard2Desc:
      '応募から内定まで、紹介プロセス全体を追跡。すべてのステータスを透明に更新し、業務効率の最適化を支援します。',
    aboutCard3Title: '連携とAIサポート',
    aboutCard3Desc:
      '採用プロセスを通じてWorkstationチームと直接連携し、求人の提案や標準フォーマットの候補者プロフィール作成などAIツールで成功率向上を支援します。',
    whyTitle: 'Why Choose Us?',
    whyDesc:
      'JobShareのコラボレーター制度に参加するメリット：透明な報酬制度、シンプルな運用、そして専任チームによる継続サポート。',
    whyCard1Title: '明確な報酬制度：25%から最大50%まで',
    whyCard1Desc:
      '紹介手数料の分配は透明なルールで運用。成果に応じてランクアップし、報酬率を最大50%まで高められます。',
    whyCard2Title: '経験不要 - 詳細なサポートあり',
    whyCard2Desc:
      '仕事を探している人を知っていればOK。相談、履歴書添削、面接対応などはJobShareチームが支援します。',
    whyCard3Title: '10年以上の採用経験を持つチームと連携',
    whyCard3Desc:
      '日本人エンジニア採用ニーズへの対応をプロチームが支援。情報の透明性と採用効率の向上を実現します。',
    aiCvPromoTitle:
      'JobShareのAI技術で、日本基準の履歴書をわずか3分で。プロ品質の職務経歴書を。',
    aiCvPromoCta: '今すぐ試す（無料）',
    guideTitleLine1: '3つの簡単なステップ',
    guideTitleLine2: 'JobShareコラボレーターになる',
    guideStep1Title: 'コラボレーター登録',
    guideStep1Desc:
      'JobShareのコラボレーター向け規約とポリシーを確認し、登録フォームを提出します。登録メール宛にシステムから連絡が届きます。',
    guideStep2Title: '候補者の発掘と推薦',
    guideStep2Desc:
      '募集条件に合う候補者を探し、応募情報と推薦フォームを提出します。推薦前に候補者情報の正確性と同意取得を必ず確認してください。',
    guideStep3Title: '推薦プロセスの伴走と報酬受取',
    guideStep3Desc:
      '推薦後は、コラボレーター・候補者・JobShareの3者で進捗を確認し、面接や追加情報対応を支援します。採用成立時は、明確なルールに基づき報酬が支払われます。',
    partnerTitleLine1: '200社超の日本企業パートナー',
    partnerTitleLine2: '外国人人材を募集',
    featureTitle: '無料で使える4つの機能',
    feature1Title: '求人データベースへアクセス',
    feature1Desc:
      '日本のエンジニア求人に数千件からアクセスし、候補者紹介に適したポジションを見つけやすくします。',
    feature1Points: [
      '業種・地域・要件から日本のエンジニア求人を閲覧・検索できます',
      'AIマッチングで最適な求人を提案します',
      '詳細な求人情報で推薦成功率を高めます',
    ],
    feature2Title: '候補者プロフィールの管理',
    feature2Desc:
      '候補者情報をスマートに管理し、時間を節約して採用効率を高めます。',
    feature2Points: [
      'AIで日本式フォーマットの候補者CVを自動作成します',
      '候補者データを無制限に保存・管理できます',
      '採用成功しやすい最適なポジションをシステムが提案します',
    ],
    feature3Title: '採用プロセスの管理',
    feature3Desc:
      '候補者ごとの採用プロセスを一箇所で集中・透明に追跡できます。',
    feature3Points: [
      '各候補者の採用進捗を面接フェーズごとに管理できます',
      '採用プロセス中にWorkstationチームと円滑に連携できます',
      '採用ステータスで候補者を検索・絞り込みできます',
    ],
    feature4Title: '採用イベントの更新と直接申込み',
    feature4Desc:
      'JobShareコラボレーター向けの就職イベントや研修の最新情報をお届けします。',
    feature4Points: [
      '日本での就職紹介イベントをフォローできます',
      '採用ノウハウ共有や研修プログラムに参加できます',
      'システム上でイベントに直接申し込みできます',
    ],
    featureCta: '今すぐ見る',
    hotNewsTitle: '最新ニュース',
    hotNewsDesc: 'コラボレーター向けの実践情報、就職トレンド、最新ニュースを素早くお届けします。',
    hotNewsViewAll: 'ニュース一覧を見る',
    hotNewsTagFallback: 'ニュース',
    faqTitle: 'よくある質問',
    faqItems: [
      {
        q: 'コラボレーターになるには？',
        paragraphs: [
          'アカウント登録とプロフィール入力を完了してください。その後、募集中のコラボレーターポジションに応募できます。',
        ],
      },
      {
        q: '有効な推薦プロフィールとは？',
        paragraphs: [
          '有効な推薦とは、過去6か月以内にJobShare上で重複しない候補者プロフィールであることです。',
          'システムに未登録、または6か月より前に推薦された候補者 → 有効とみなされ、権利は現在の推薦コラボレーターに帰属します。',
          '6か月以内に別のコラボレーターが推薦済みの候補者 → 権利は最初のコラボレーターに残り、新しいプロフィールは認められません。',
          '特例：最初の推薦で応募を辞退した候補者が、6か月以内に別のコラボレーターから再推薦された場合 → JobShareが独自フローで確認します。',
        ],
      },
      {
        q: '業務効率を上げるには？',
        paragraphs: [
          '次を意識してください。',
          '1) Workstationの専門研修でスキル・知識を継続的にアップデートする',
          '2) 日々の発信・候補者探索を習慣化する',
          '3) 候補者の立場になり、転職の背景を丁寧にヒアリングする',
          '4) 採用コンテンツの創作や候補者リスト管理など、支援ツールを活用する',
        ],
      },
      {
        q: 'リモートで働けますか？',
        paragraphs: [
          'はい。リモート勤務を支援しています。安定したインターネット環境と、情報セキュリティ規定の遵守が必要です。',
        ],
      },
      {
        q: '技術的な問題を報告するには？',
        paragraphs: [
          '次の方法でご連絡ください。',
          '1) サポートメール',
          '2) サイト上のお問い合わせフォーム',
          '3) Zaloサポートホットライン。営業日24時間以内に返信します。',
        ],
      },
      {
        q: '研修制度はありますか？',
        paragraphs: [
          'はい。定期的な研修と詳細ガイドを提供しています。登録初月後、JobShareコラボレーター向け基礎研修（全3回）にご参加いただけます。採用コンサルタント歴10年以上の担当者が講師です。',
        ],
      },
    ],
    jobPickupTitle: 'あなたに合う仕事を見つけよう',
    jobPickupStatLabel: 'JobShare 上の求人。',
    jobPickupExploreAll: 'すべての求人を見る',
    jobPickupCards: [
      {
        company: 'Founders',
        postedAgo: '3日前',
        title: 'Marketing & Communications Manager (Internship/Co-founder)',
        meta: 'フルタイム / Copenhagen',
        tag: 'design',
      },
      {
        company: 'Mailchimp',
        postedAgo: '2日前',
        title: 'Senior B2B Sales Consultant - Sweden',
        meta: 'フルタイム / Copenhagen',
        tag: 'development',
      },
      {
        company: 'Chobani',
        postedAgo: '3日前',
        title: 'Senior Creative Director with a partnership role',
        meta: 'フルタイム / Copenhagen',
        tag: 'business development',
      },
      {
        company: 'ProsperOps',
        postedAgo: '3日前',
        title: 'Marketing & Communications Manager (Internship/Co-founder)',
        meta: 'フルタイム / Copenhagen',
        tag: 'customer support',
      },
      {
        company: 'Mailchimp',
        postedAgo: '2日前',
        title: 'Senior B2B Sales Consultant - Sweden',
        meta: 'フルタイム / Copenhagen',
        tag: 'marketing',
      },
    ],
    footerCtaTitleWhite: '始める準備は',
    footerCtaTitleRed: 'できていますか',
    footerCtaTitleWhiteEnd: '？',
    footerCtaDesc:
      '今すぐ登録して、JobShareの協力パートナーになり、日本の数百件に及ぶ求人情報をチェックしましょう。完全無料です！',
    footerBtnPrimary: '今すぐ登録',
    footerBtnSecondary: '相談する',
    footerExploreTitle: '探索',
    footerExploreLinks: ['求人一覧', '紹介', 'パートナー', 'ブログ'],
    footerSupportTitle: 'サポート',
    footerSupportLinks: ['利用ガイド', 'FAQ', '資料', 'お問い合わせ'],
    footerContactTitle: '連絡先',
    footerContactLocation: '3F, 82 Tue Tinh, Hai Ba Trung, Hanoi, Vietnam, 10000',
    footerLinkTitle: 'リンク',
    footerLinkUrl: 'ws-jobshare.com',
    footerContactInfoTitle: 'お問い合わせ情報',
    footerContactPhone: '097 289 97 28',
    footerDesc: '人材紹介コミュニティを通じて日本の仕事をつなぐプラットフォームです。',
  },
}

const PARTNER_LOGOS = Array.from({ length: 18 }, (_, index) => `/assets/partner-${index + 1}.png`)
const PARTNER_ROW_1 = PARTNER_LOGOS.slice(0, 9)
const PARTNER_ROW_2 = PARTNER_LOGOS.slice(9)

const dateLocales = { vi: viFns, en: enUS, ja }

function recruitmentLabel(type, lang) {
  const map = {
    vi: { 1: 'Toàn thời gian', 2: 'Chính thức (haken)', 3: 'Phái cử', 4: 'Bán thời gian', 5: 'Uỷ thác' },
    en: { 1: 'Full-time', 2: 'Permanent (haken)', 3: 'Seconded', 4: 'Part-time', 5: 'Contract' },
    ja: { 1: '正社員', 2: '正社員（派遣）', 3: '派遣', 4: 'パート', 5: '業務委託' },
  }
  const L = map[lang] || map.vi
  const n = Number(type)
  return L[n] || L[1]
}

const Home = () => {
  const { language } = useLanguage()
  const { pathname } = useLocation()
  const t = i18n[language] || i18n.vi
  const trApp = appTranslations[language] || appTranslations.vi
  const blogBase = pathname.startsWith('/landing/collaborator') ? '/landing/collaborator' : '/collaborator'
  const featureScrollRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [contactPopupOpen, setContactPopupOpen] = useState(false)

  const [pickupJobs, setPickupJobs] = useState([])
  const [pickupLoading, setPickupLoading] = useState(true)
  const [newsPosts, setNewsPosts] = useState([])
  const [newsLoading, setNewsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setPickupLoading(true)

      try {
        const qp = {
          page: 1,
          limit: 5,
          status: 1,
          sortBy: 'createdAt',
          sortOrder: 'DESC',
        }
        const res = await apiService.getApplicantJobs(qp)
        const jobs = res?.success && Array.isArray(res?.data?.jobs) ? res.data.jobs : []
        if (!cancelled) setPickupJobs(jobs)
      } catch (e) {
        if (!cancelled) setPickupJobs([])
      } finally {
        if (!cancelled) setPickupLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setNewsLoading(true)
      try {
        const res = await apiService.getPublicPosts({
          page: 1,
          limit: 3,
          sortBy: 'published_at',
          sortOrder: 'DESC',
          surface: 'collaborator',
        })
        const list = res?.data?.posts || []
        if (!cancelled) setNewsPosts(Array.isArray(list) ? list.slice(0, 3) : [])
      } catch {
        if (!cancelled) setNewsPosts([])
      } finally {
        if (!cancelled) setNewsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const updateFeatureScrollButtons = () => {
    if (!featureScrollRef.current) return

    const { scrollLeft, scrollWidth, clientWidth } = featureScrollRef.current
    const maxScrollLeft = scrollWidth - clientWidth

    setCanScrollLeft(scrollLeft > 8)
    setCanScrollRight(scrollLeft < maxScrollLeft - 8)
  }

  useEffect(() => {
    const container = featureScrollRef.current
    if (!container) return undefined

    updateFeatureScrollButtons()

    const handleResize = () => updateFeatureScrollButtons()
    container.addEventListener('scroll', updateFeatureScrollButtons)
    window.addEventListener('resize', handleResize)

    return () => {
      container.removeEventListener('scroll', updateFeatureScrollButtons)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const handleFeatureScroll = (direction) => {
    if (!featureScrollRef.current) return

    featureScrollRef.current.scrollBy({
      left: direction * 300,
      behavior: 'smooth',
    })
  }

  const scrollToSection = (id) => {
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const salaryLine = (job) => {
    const sr = job?.salaryRanges?.[0] || job?.salary_ranges?.[0]
    if (!sr) return '—'
    if (typeof sr === 'string') return sr

    if (language === 'en' && (sr.salaryRangeEn || sr.salary_range_en)) return sr.salaryRangeEn || sr.salary_range_en
    if (language === 'ja' && (sr.salaryRangeJp || sr.salary_range_jp)) return sr.salaryRangeJp || sr.salary_range_jp
    return sr.salaryRange || sr.salary_range || '—'
  }

  const mapJobToPickupCard = (job, fallbackIdx) => {
    const fallback = t.jobPickupCards?.[fallbackIdx]
    if (!job) {
      return fallback
        ? { ...fallback, id: `pickup-fallback-${fallbackIdx}` }
        : { id: `pickup-fallback-${fallbackIdx}`, company: '—', postedAgo: '', title: '', meta: '—', tag: '' }
    }

    const posted = job.createdAt || job.created_at
    const postedAgo =
      posted != null && posted !== ''
        ? formatDistanceToNow(new Date(posted), {
            addSuffix: true,
            locale: dateLocales[language] || viFns,
          })
        : ''

    const title =
      (language === 'en' && job.titleEn) || (language === 'ja' && job.titleJp) ? (language === 'en' ? job.titleEn : job.titleJp) : job.title

    const company =
      job?.company?.name ||
      job?.companyName ||
      job?.recruitingCompany?.companyName ||
      '—'

    return {
      id: job.id ?? `pickup-${fallbackIdx}`,
      company,
      postedAgo,
      title: title || '—',
      meta: salaryLine(job),
      tag: recruitmentLabel(job.recruitmentType ?? job.recruitment_type, language),
    }
  }

  const mappedCards = (pickupJobs || []).slice(0, 5).map((job, idx) => mapJobToPickupCard(job, idx))
  const pickupCards = Array.from({ length: 5 }, (_, idx) => mappedCards[idx] || mapJobToPickupCard(null, idx))

  const seo = seoMeta[language] || seoMeta.vi

  return (
    <>
      <Helmet>
        <html lang={language === 'ja' ? 'ja' : language === 'en' ? 'en' : 'vi'} />
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <meta name="keywords" content={seo.keywords} />
        <link rel="canonical" href="https://ws-jobshare.com/landing/collaborator" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={seo.ogTitle} />
        <meta property="og:description" content={seo.ogDesc} />
        <meta property="og:url" content="https://ws-jobshare.com/landing/collaborator" />
        <meta property="og:image" content="https://ws-jobshare.com/og-image.png" />
        <meta property="og:site_name" content="Workstation JobShare" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seo.ogTitle} />
        <meta name="twitter:description" content={seo.ogDesc} />
        <meta name="twitter:image" content="https://ws-jobshare.com/og-image.png" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": seo.title,
          "description": seo.description,
          "url": "https://ws-jobshare.com/landing/collaborator",
          "inLanguage": language,
          "isPartOf": { "@type": "WebSite", "name": "Workstation JobShare", "url": "https://ws-jobshare.com" }
        })}</script>
      </Helmet>
      <section
        className="relative -mt-[68px] w-full min-h-[620px] overflow-hidden bg-cover bg-center bg-no-repeat pb-0 pt-[68px]"
        style={{
          backgroundImage: `url(${heroSectionBg})`,
        }}
      >
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#020817]/85 via-[#0f172a]/65 to-[#0f172a]/45" />
        <div className="relative z-10 mx-auto w-full max-w-[1200px] px-4 pt-16 pb-10 md:px-6 md:pb-16 md:pr-[min(50%,360px)]">
          <div className="max-w-xl">
            <p className="inline-flex items-center rounded-full border border-white/40 bg-white/10 px-4 py-1 text-xs font-semibold tracking-wide text-white backdrop-blur">
              {t.heroBadge}
            </p>

            <h1 className="mt-5 text-3xl font-extrabold uppercase leading-tight text-white md:text-5xl">
              <span className="block whitespace-nowrap">
                <span className="text-[#ED212F]">{t.heroTitleRed1}</span> {t.heroTitleWhite1}
              </span>
              <span className="block whitespace-nowrap">
                {t.heroTitleWhite2} <span className="text-[#ED212F]">{t.heroTitleRed2}</span>
              </span>
            </h1>

            <p className="mt-4 max-w-xl text-sm text-white/90 md:text-base">
              {t.heroDesc}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-full bg-[#ED212F] px-5 py-2.5 text-sm font-semibold !text-white transition-colors hover:bg-[#d11824] hover:!text-white"
              >
                {t.heroBtnPrimary}
              </Link>
              <button
                type="button"
                onClick={() => scrollToSection('guide')}
                className="rounded-full border border-white/60 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
              >
                {t.heroBtnSecondary}
              </button>
            </div>
          </div>
        </div>

        {/* Desktop: cùng lớp với overlay — inset-0 + flex-col justify-end → đẩy ảnh xuống sát đáy lớp gradient. Mobile: trong luồng dưới chữ. */}
        <div className="z-[5] mt-6 flex justify-center px-4 pb-0 md:pointer-events-none md:absolute md:inset-0 md:mt-0 md:flex md:flex-col md:justify-end md:px-0 md:pb-0">
          <div className="w-full max-w-[1200px] px-4 pb-0 text-center md:mx-auto md:flex md:justify-end md:pl-6 md:pr-3 md:pb-0">
            <img
              src={heroPeopleCutout}
              alt=""
              className="inline-block h-auto w-full max-w-[min(100%,400px)] align-bottom object-contain object-bottom max-md:max-h-[min(52vh,340px)] md:ml-0 md:block md:max-h-[min(82vh,740px)] md:w-auto md:max-w-[min(58vw,640px)] md:translate-x-2"
              decoding="async"
            />
          </div>
        </div>
      </section>

      <section id="about-us" className="bg-[#fff] pb-0 pt-20">
        <div className="w-full">
          <div className="bg-white">
            <div className="mx-auto w-full max-w-[1200px] px-4 py-6 text-left md:px-6 md:py-8">
              <p className="max-w-4xl text-xl font-extrabold uppercase leading-tight text-[#ed212f] md:text-2xl lg:text-3xl">
                <span className="block">{t.aboutTitleLine1}</span>
                <span className="mt-1 block">{t.aboutTitleLine2}</span>
              </p>
            </div>
          </div>

          <div className="space-y-0 overflow-hidden">
            <div className="bg-white">
              <div className="mx-auto grid min-h-[220px] w-full max-w-[1200px] grid-cols-1 md:grid-cols-[220px_1fr]">
                <div className="flex min-h-[220px] flex-col justify-center px-4 py-8 text-left md:px-6 md:py-10">
                  <p className="text-2xl font-extrabold uppercase text-[#162275]">01</p>
                  <p className="mt-2 text-base font-extrabold uppercase leading-snug text-[#162275] md:text-lg">
                    {t.aboutCard1Title}
                  </p>
                </div>
                <div className="flex min-h-[220px] items-center px-4 py-8 text-left md:px-6 md:py-10">
                  <p className="max-w-3xl text-base leading-relaxed text-[#1f2a6b]">
                    {t.aboutCard1Desc}
                  </p>
                </div>
              </div>
            </div>

            <div
              className="relative"
              style={{ backgroundImage: "url('/assets/banner.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
              <div className="absolute inset-0 bg-[#0b1220]/65" />
              <div className="relative mx-auto grid min-h-[220px] w-full max-w-[1200px] grid-cols-1 md:grid-cols-[220px_1fr]">
                <div className="flex min-h-[220px] flex-col justify-center px-4 py-8 text-left md:px-6 md:py-10">
                  <p className="text-2xl font-extrabold uppercase text-white">02</p>
                  <p className="mt-2 text-base font-extrabold uppercase leading-snug text-white md:text-lg">
                    {t.aboutCard2Title}
                  </p>
                </div>
                <div className="flex min-h-[220px] items-center px-4 py-8 text-left md:px-6 md:py-10">
                  <p className="max-w-3xl text-base leading-relaxed text-white/95">
                    {t.aboutCard2Desc}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#ed212f]">
              <div className="mx-auto grid min-h-[220px] w-full max-w-[1200px] grid-cols-1 md:grid-cols-[220px_1fr]">
                <div className="flex min-h-[220px] flex-col justify-center px-4 py-8 text-left md:px-6 md:py-10">
                  <p className="text-2xl font-extrabold uppercase text-white">03</p>
                  <p className="mt-2 text-base font-extrabold uppercase leading-snug text-white md:text-lg">
                    {t.aboutCard3Title}
                  </p>
                </div>
                <div className="flex min-h-[220px] items-center px-4 py-8 text-left md:px-6 md:py-10">
                  <p className="max-w-3xl text-base leading-relaxed text-white">
                    {t.aboutCard3Desc}
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      <section id="guide" className="bg-white px-4 pb-16 pt-20 md:px-6 md:pb-20">
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="grid gap-14 lg:grid-cols-[320px_1fr] lg:items-start lg:gap-56">
            <div className="mt-20 lg:sticky lg:top-24 lg:flex lg:min-h-[500px] lg:items-center">
              <div>
                <h2 className="inline-block text-left uppercase">
                  <span className="block text-3xl font-bold text-black md:text-5xl lg:text-6xl">
                    Why Choose
                  </span>
                  <span className="mt-1 block w-full text-7xl font-extrabold leading-none text-[#ED212F] md:text-9xl lg:text-[10rem]">
                    Us?
                  </span>
                </h2>
                <p className="mt-4 max-w-sm text-xs leading-relaxed text-black md:text-sm">
                  {t.whyDesc}
                </p>
              </div>
            </div>

            <div className="mt-20 grid grid-cols-1 gap-2.5 md:grid-cols-2">
              <div className="flex rounded-xl bg-[#ED212F] p-4 text-white md:min-h-[240px]">
                <div className="w-full">
                  <div className="mb-3 flex min-h-[120px] items-start justify-between gap-3">
                    <h3 className="text-xl font-extrabold leading-tight">
                      {t.whyCard1Title}
                    </h3>
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-[#ED212F]">
                      01
                    </span>
                  </div>
                  <p className="mt-5 text-xs leading-relaxed text-white/90">
                    {t.whyCard1Desc}
                  </p>
                </div>
              </div>

              <div className="flex rounded-xl border border-[#ED212F]/30 bg-white p-4 text-[#111827] md:min-h-[240px]">
                <div className="w-full">
                  <div className="mb-3 flex min-h-[120px] items-start justify-between gap-3">
                    <h3 className="text-xl font-extrabold leading-tight text-black">
                      {t.whyCard2Title}
                    </h3>
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ED212F] text-sm font-bold text-white">
                      02
                    </span>
                  </div>
                  <p className="mt-5 text-xs leading-relaxed text-black">
                    {t.whyCard2Desc}
                  </p>
                </div>
              </div>

              <div className="flex rounded-xl border border-[#ED212F]/30 bg-white p-4 text-[#111827] md:min-h-[240px]">
                <div className="w-full">
                  <div className="mb-3 flex min-h-[120px] items-start justify-between gap-3">
                    <h3 className="text-xl font-extrabold leading-tight text-black">
                      {t.whyCard3Title}
                    </h3>
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ED212F] text-sm font-bold text-white">
                      03
                    </span>
                  </div>
                  <p className="mt-5 text-xs leading-relaxed text-black">
                    {t.whyCard3Desc}
                  </p>
                </div>
              </div>

              <div className="flex rounded-xl border border-[#ED212F] bg-white p-4 text-[#111827] md:min-h-[240px]">
                <div className="w-full">
                  <div className="mb-3 flex min-h-[120px] items-start justify-between gap-3">
                    <h3 className="text-xl font-extrabold leading-tight text-black">
                      {t.whyCard4Title}
                    </h3>
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ED212F] text-sm font-bold text-white">
                      04
                    </span>
                  </div>
                  <p className="mt-5 text-xs leading-relaxed text-black">
                    {t.whyCard4Desc}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div
            className="mt-16 grid w-full items-center gap-10 md:gap-12 lg:grid-cols-2 lg:gap-14"
            aria-labelledby="ai-cv-promo-heading"
          >
            <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
              <img
                src="/assets/cv_ai.png"
                alt=""
                className="h-auto w-full object-contain object-center"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="flex min-h-0 flex-col justify-center">
              <h2
                id="ai-cv-promo-heading"
                className="text-2xl font-extrabold leading-snug text-[#111827] md:text-3xl md:leading-tight lg:text-[1.65rem] xl:text-4xl"
              >
                {t.aiCvPromoTitle}
              </h2>
              <Link
                to="/register"
                className="mt-8 inline-flex h-12 w-fit max-w-full items-center justify-center rounded-lg bg-[#ED212F] px-7 text-base font-bold text-white shadow-sm transition-colors hover:bg-[#d11824] md:h-12 md:px-8 md:text-base"
              >
                <span className="text-white !text-white leading-none">{t.aiCvPromoCta}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        id="guide-steps"
        className="bg-white pt-30 px-4 pb-30 md:px-6 md:pb-40"
      >
        <div className="relative mx-auto w-full max-w-[1200px]">
          <h3 className="mx-auto max-w-4xl text-center text-xl font-extrabold uppercase leading-snug md:text-2xl lg:text-3xl">
            <span className="block text-[#ED212F]">{t.guideTitleLine1}</span>
            <span className="mt-1 block text-black">{t.guideTitleLine2}</span>
          </h3>

          <div className="mt-6 flex flex-col gap-3 md:flex-row md:gap-4">
            {[
              { step: '01', title: t.guideStep1Title, desc: t.guideStep1Desc },
              { step: '02', title: t.guideStep2Title, desc: t.guideStep2Desc },
              { step: '03', title: t.guideStep3Title, desc: t.guideStep3Desc },
            ].map((item) => (
              <article
                key={item.step}
                className="group rounded-xl bg-[#ED212F] p-5 text-white transition-all duration-300 md:min-h-[260px] md:flex-1 md:hover:flex-[1.6]"
              >
                <p className="text-base font-extrabold uppercase tracking-wide">Step {item.step}</p>
                <h4 className="mt-3 text-xl font-extrabold leading-tight">{item.title}</h4>
                <p className="mt-5 text-sm leading-relaxed text-white/95 md:mt-0 md:max-h-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-300 md:group-hover:mt-5 md:group-hover:max-h-[420px] md:group-hover:opacity-100">
                  {item.desc}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="features"
        className="relative bg-cover bg-center bg-no-repeat px-4 py-12 md:px-6 md:py-16"
        style={{
          backgroundImage:
            "url('/assets/collaborative-process-multicultural-businesspeople-using-computer-presentation-communication-meeting-brainstorming-ideas-about-project-colleagues-working-plan-success-strategy-modern-office.jpg')",
        }}
      >
        <div className="absolute inset-0 bg-[#0b1220]/70" />
        <div className="relative mx-auto grid w-full max-w-[1200px] items-start gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12 lg:items-stretch">
          <div className="flex w-full justify-start lg:h-full">
            <div className="flex h-full min-h-[340px] w-[220px] shrink-0 flex-col rounded-xl bg-[#ED212F] p-5 shadow-sm md:w-[240px] lg:w-full lg:max-w-[260px]">
              <h3 className="text-3xl font-extrabold uppercase leading-tight text-white md:text-4xl">
                {t.featureTitle}
              </h3>
              <Link
                to="/register"
                className="mt-auto inline-flex self-end rounded-full bg-white px-4 py-2 text-sm font-bold !text-[#ED212F] transition-colors hover:bg-[#ffe7ea] hover:!text-[#ED212F]"
              >
                {t.featureCta}
              </Link>
            </div>
          </div>

          <div className="relative min-h-0 min-w-0 max-w-full lg:flex lg:min-h-[340px] lg:flex-col">
            <div
              ref={featureScrollRef}
              className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <div className="flex flex-nowrap items-stretch gap-4 pr-10">
            {[
              { id: '01', title: t.feature1Title, desc: t.feature1Desc, points: t.feature1Points || [] },
              { id: '02', title: t.feature2Title, desc: t.feature2Desc, points: t.feature2Points || [] },
              { id: '03', title: t.feature3Title, desc: t.feature3Desc, points: t.feature3Points || [] },
              { id: '04', title: t.feature4Title, desc: t.feature4Desc, points: t.feature4Points || [] },
            ].map((feature) => (
              <article
                key={feature.id}
                className="flex w-[220px] min-h-[340px] shrink-0 flex-col rounded-xl border border-[#ED212F]/20 bg-white p-5 shadow-sm md:w-[240px] lg:w-[260px]"
              >
                <div className="h-[200px] shrink-0 overflow-hidden">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#ED212F] text-xs font-bold text-white">
                    {feature.id}
                  </span>
                  <h4 className="mt-2.5 line-clamp-4 text-base font-extrabold leading-snug text-[#111827]">
                    {feature.title}
                  </h4>
                  <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-[#4B5563] md:text-sm">
                    {feature.desc}
                  </p>
                </div>
                <ul className="mt-1.5 flex flex-1 flex-col gap-2">
                  {feature.points.map((point, idx) => (
                    <li key={`${feature.id}-${idx}`} className="flex gap-2">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ED212F] text-[10px] font-bold leading-none text-white">
                        ✓
                      </span>
                      <span className="min-w-0 flex-1 text-sm leading-relaxed text-[#4B5563]">{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
              </div>
            </div>

            {canScrollLeft && (
              <div className="absolute left-1 top-1/2 z-20 -translate-y-1/2 md:left-2">
                <button
                  type="button"
                  onClick={() => handleFeatureScroll(-1)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#ED212F] text-base font-bold text-white shadow-md transition-colors hover:bg-[#d11824]"
                  aria-label="Scroll features left"
                >
                  &#8592;
                </button>
              </div>
            )}
            {canScrollRight && (
              <div className="absolute right-1 top-1/2 z-20 -translate-y-1/2 md:right-2">
                <button
                  type="button"
                  onClick={() => handleFeatureScroll(1)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#ED212F] text-base font-bold text-white shadow-md transition-colors hover:bg-[#d11824]"
                  aria-label="Scroll features right"
                >
                  &#8594;
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="partners" className="bg-white px-4 pb-14 pt-20 md:px-6 md:pb-16">
        <div className="mx-auto w-full max-w-[1200px]">
          <h3 className="mx-auto mt-0 max-w-4xl text-center text-xl font-extrabold uppercase leading-snug text-[#ED212F] md:text-2xl lg:text-3xl">
            <span className="block">{t.partnerTitleLine1}</span>
            <span className="mt-1 block">{t.partnerTitleLine2}</span>
          </h3>
        </div>

        <div className="mx-auto mt-6 w-full max-w-[1200px] space-y-3">
          <div className="relative partner-marquee">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent md:w-24" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent md:w-24" />
            <div className="partner-marquee-track">
              {[...PARTNER_ROW_1, ...PARTNER_ROW_1].map((logoPath, index) => (
                <div key={`row1-${logoPath}-${index}`} className="partner-logo-card">
                  <img
                    src={logoPath}
                    alt={`Partner row 1 - ${((index % PARTNER_ROW_1.length) + 1).toString()}`}
                    className="partner-logo-image"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="relative partner-marquee">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent md:w-24" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent md:w-24" />
            <div
              className="partner-marquee-track"
              style={{ animationDirection: 'reverse', animationDuration: '36s' }}
            >
              {[...PARTNER_ROW_2, ...PARTNER_ROW_2].map((logoPath, index) => (
                <div key={`row2-${logoPath}-${index}`} className="partner-logo-card">
                  <img
                    src={logoPath}
                    alt={`Partner row 2 - ${((index % PARTNER_ROW_2.length) + 1).toString()}`}
                    className="partner-logo-image"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="hot-news" className="bg-white px-4 py-12 md:px-6 md:py-14">
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="flex items-start justify-between gap-4 border-b border-[#e7e7ea] pb-5">
            <div>
              <h3 className="text-xl font-extrabold uppercase tracking-normal text-[#ED212F] md:text-2xl">
                {t.hotNewsTitle}
              </h3>
              <p className="mt-3 text-sm text-[#6B7280] md:text-base">{t.hotNewsDesc}</p>
            </div>
            <Link
              to={`${blogBase}/blog`}
              className="inline-flex items-center gap-2 whitespace-nowrap pt-1 text-sm font-semibold text-[#ED212F] hover:text-[#d11824]"
            >
              {t.hotNewsViewAll}
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>

          <div>
            {newsLoading ? (
              <>
                {[0, 1, 2].map((k) => (
                  <div
                    key={`news-skel-${k}`}
                    className="grid grid-cols-1 gap-3 border-b border-[#ececef] py-4 md:grid-cols-[92px_112px_1fr_20px] md:gap-4"
                  >
                    <div className="h-4 animate-pulse rounded bg-neutral-200 md:w-20" />
                    <div className="h-6 w-24 animate-pulse rounded-full bg-neutral-200" />
                    <div className="space-y-2">
                      <div className="h-5 w-full max-w-md animate-pulse rounded bg-neutral-200" />
                      <div className="h-4 w-full max-w-lg animate-pulse rounded bg-neutral-100" />
                    </div>
                  </div>
                ))}
              </>
            ) : newsPosts.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#6B7280]">{trApp.publicBlogEmpty}</p>
            ) : (
              newsPosts.map((post) => {
                const dateStr = formatPublicPostDate(post.publishedAt || post.createdAt, language)
                const postTitle = pickPublicPostTitle(post, language) || '—'
                const excerpt = pickPublicPostExcerpt(post, language)
                const tagLabel = pickPublicPostCategoryLabel(post, language, t.hotNewsTagFallback)
                return (
                  <Link
                    key={post.id}
                    to={`${blogBase}/blog/${post.id}`}
                    className="grid grid-cols-1 items-center gap-3 border-b border-[#ececef] py-4 transition-colors hover:bg-neutral-50/80 md:grid-cols-[92px_112px_1fr_20px] md:gap-4"
                  >
                    <p className="text-sm text-[#6B7280]">{dateStr || '—'}</p>
                    <span className="inline-flex w-fit items-center rounded-full bg-[#fdecef] px-3 py-1 text-xs font-semibold text-[#c63a54]">
                      {tagLabel}
                    </span>
                    <div>
                      <h4 className="text-base font-semibold text-[#111827] md:text-xl">{postTitle}</h4>
                      {excerpt ? <p className="mt-1 line-clamp-2 text-sm text-[#6B7280]">{excerpt}</p> : null}
                    </div>
                    <span className="justify-self-end text-xl text-[#9CA3AF]" aria-hidden="true">
                      &#8250;
                    </span>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      </section>

      <section id="faq" className="bg-[#f5f6fa] px-4 py-12 md:px-6 md:py-16">
        <div className="mx-auto w-full max-w-[1200px]">
          <h2 className="text-center text-2xl font-extrabold uppercase tracking-wide text-[#ED212F] md:text-3xl">
            {t.faqTitle}
          </h2>
          <div className="mt-8 divide-y divide-[#e5e7eb] overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-sm">
            {(t.faqItems || []).map((item, idx) => (
              <details key={`faq-${idx}`} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-left text-[15px] font-semibold text-[#111827] transition-colors hover:bg-[#fafafa] md:px-5 md:text-base [&::-webkit-details-marker]:hidden">
                  <span className="pr-2">{item.q}</span>
                  <span
                    className="inline-flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-lg font-semibold leading-none text-[#ED212F] transition-colors group-open:border-[#ED212F]/30 group-open:bg-[#fff5f5]"
                    aria-hidden
                  >
                    <span className="group-open:hidden">+</span>
                    <span className="hidden group-open:inline">−</span>
                  </span>
                </summary>
                <div className="space-y-3 border-t border-[#f0f1f4] bg-[#fafbfc] px-4 pb-5 pt-4 md:px-5">
                  {item.paragraphs.map((para, i) => (
                    <p key={`faq-${idx}-p-${i}`} className="text-sm leading-relaxed text-[#374151]">
                      {para}
                    </p>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="collaborator-footer" className="bg-[#171b24] px-4 pb-6 pt-10 text-white sm:pt-12 md:px-6 md:pt-14">
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="text-center">
            <h3 className="text-2xl font-extrabold leading-tight sm:text-3xl md:text-4xl">
              <span>{t.footerCtaTitleWhite} </span>
              <span className="text-[#ED212F]">{t.footerCtaTitleRed}</span>
              <span> {t.footerCtaTitleWhiteEnd}</span>
            </h3>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/75 sm:mt-4 md:text-base">
              {t.footerCtaDesc}
            </p>
            <div className="mt-5 flex flex-col items-center gap-3 sm:mt-6 sm:flex-row sm:justify-center">
              <Link
                to="/register"
                className="inline-flex h-10 w-full max-w-[280px] items-center justify-center rounded-lg bg-[#ED212F] px-5 text-sm font-semibold !text-white transition-colors hover:bg-[#d11824] hover:!text-white sm:w-auto sm:min-w-[132px]"
              >
                {t.footerBtnPrimary}
              </Link>
              <button
                type="button"
                onClick={() => setContactPopupOpen(true)}
                className="inline-flex h-10 w-full max-w-[280px] items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold text-[#ED212F] transition-colors hover:bg-[#f4f4f5] sm:w-auto sm:min-w-[132px]"
              >
                {t.footerBtnSecondary}
              </button>
            </div>
          </div>

          <div className="mt-10 grid gap-8 sm:mt-12 sm:grid-cols-2 md:mt-14 md:gap-10 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
            <div className="sm:col-span-2 lg:col-span-1">
              <img src={jobShareWhiteLogo} alt="Job Share" className="h-16 w-auto sm:h-20" />
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/70 sm:mt-4">{t.footerDesc}</p>
              <div className="mt-4 flex items-center gap-2 sm:mt-5">
                {['f', 'z', 'm', '▶'].map((icon) => (
                  <span
                    key={icon}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-xs text-white/80"
                  >
                    {icon}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold uppercase tracking-wide text-white">{t.footerExploreTitle}</h4>
              <div className="mt-3 space-y-2 text-sm text-white/75 sm:mt-4">
                {(t.footerExploreLinks || []).map((link) => (
                  <a key={link} href="#" className="block transition-colors hover:text-white">
                    {link}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold uppercase tracking-wide text-white">{t.footerSupportTitle}</h4>
              <div className="mt-3 space-y-2 text-sm text-white/75 sm:mt-4">
                {(t.footerSupportLinks || []).map((link) => (
                  <a key={link} href="#" className="block transition-colors hover:text-white">
                    {link}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold uppercase tracking-wide text-white">{t.footerContactTitle}</h4>
              <div className="mt-3 space-y-2 text-sm text-white/75 sm:mt-4">
                <p>📍 {t.footerContactLocation}</p>
              </div>
              <h4 className="mt-4 text-sm font-bold uppercase tracking-wide text-white">{t.footerLinkTitle}</h4>
              <div className="mt-2 space-y-1 text-sm text-white/75">
                <a href="https://ws-jobshare.com" target="_blank" rel="noopener noreferrer" className="block transition-colors hover:text-white">{t.footerLinkUrl}</a>
              </div>
              <h4 className="mt-4 text-sm font-bold uppercase tracking-wide text-white">{t.footerContactInfoTitle}</h4>
              <div className="mt-2 space-y-1 text-sm text-white/75">
                <p>☎ {t.footerContactPhone}</p>
              </div>
            </div>
          </div>

        </div>
      </section>
      {contactPopupOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-[#111827]">{t.footerContactTitle}</h3>
                <p className="mt-1 text-sm text-[#6B7280]">{t.footerContactInfoTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setContactPopupOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-lg text-neutral-600 hover:bg-neutral-200"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-[#374151]">
              <div className="rounded-xl bg-[#f9fafb] p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Address</p>
                <p className="mt-1">{t.footerContactLocation}</p>
              </div>
              <div className="rounded-xl bg-[#f9fafb] p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Website</p>
                <a href="https://ws-jobshare.com" target="_blank" rel="noopener noreferrer" className="mt-1 block text-[#ED212F] hover:underline">
                  {t.footerLinkUrl}
                </a>
              </div>
              <div className="rounded-xl bg-[#f9fafb] p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Phone</p>
                <p className="mt-1">{t.footerContactPhone}</p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setContactPopupOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-[#ED212F] px-4 text-sm font-semibold text-white hover:bg-[#d11824]"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default Home