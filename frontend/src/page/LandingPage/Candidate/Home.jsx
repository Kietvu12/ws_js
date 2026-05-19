import React, { useEffect, useRef, useState } from 'react'
import { Helmet } from 'react-helmet-async'

import { Building2 } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import apiService, { getAssetBaseUrl } from '../../../services/api'
import { translations as appTranslations } from '../../../translations/translations'
import {
  formatPublicPostDate,
  pickPublicPostCategoryLabel,
  pickPublicPostExcerpt,
  pickPublicPostTitle,
} from '../../../utils/publicPostDisplay'
import { useLanguage } from '../../../context/LanguageContext'
import jobShareWhiteLogo from '../../../assets/JobShare (White).png'

const seoMeta = {
  vi: {
    title: 'Tìm việc kỹ sư tại Nhật Bản | Workstation JobShare - Tạo CV bằng AI',
    description: 'Nền tảng tuyển dụng thông minh cho người nước ngoài tại Nhật Bản. Tìm việc làm kỹ sư, tạo CV chuẩn Nhật bằng AI, theo dõi ứng tuyển minh bạch. Hoàn toàn miễn phí!',
    keywords: 'việc làm Nhật Bản, tuyển dụng kỹ sư, tìm việc Nhật, CV AI, hồ sơ ứng viên, JobShare, việc làm kỹ sư Nhật Bản, tạo CV chuẩn Nhật',
    ogTitle: 'Workstation JobShare | Tìm việc kỹ sư tại Nhật Bản',
    ogDesc: 'Nền tảng kết nối việc làm kỹ sư Nhật Bản. Tạo CV chuẩn bằng AI, theo dõi ứng tuyển minh bạch.',
  },
  en: {
    title: 'Engineering Jobs in Japan | Workstation JobShare - AI-Powered CV Builder',
    description: 'Smart recruitment platform for foreign nationals in Japan. Find engineering jobs, build Japan-standard CVs with AI, and track your applications transparently. Completely free!',
    keywords: 'Japan jobs, engineering jobs Japan, job search Japan, AI CV builder, JobShare, recruitment platform, foreign workers Japan',
    ogTitle: 'Workstation JobShare | Engineering Jobs in Japan',
    ogDesc: 'Find engineering jobs in Japan and build professional CVs with AI. Free job matching platform for foreign nationals.',
  },
  ja: {
    title: '日本のエンジニア求人 | Workstation JobShare - AIで履歴書作成',
    description: '外国人向けスマート採用プラットフォーム。日本のエンジニア求人検索、AI履歴書作成、応募状況の透明な管理。完全無料！',
    keywords: 'エンジニア求人, 日本就職, 外国人求人, AI履歴書, JobShare, 求人検索, 日本で働く, 履歴書作成',
    ogTitle: 'Workstation JobShare | 日本のエンジニア求人プラットフォーム',
    ogDesc: '日本のエンジニア求人を検索し、AIでプロ品質の履歴書を作成。外国人向け無料求人マッチング。',
  },
}

const i18n = {
  vi: {
    heroTitleLine1: 'NÂNG BƯỚC SỰ NGHIỆP',
    heroTitleLine2: 'VỮNG VÀNG TƯƠNG LAI',
    heroDescLine1: 'Nền tảng tuyển dụng thông minh',
    heroDescLine2: 'cho người nước ngoài tại Nhật',
    heroBtnPrimary: 'Tìm việc ngay',
    heroBtnSecondary: 'Tạo CV bằng AI',
    aboutTitle: 'Tìm việc kỹ sư',
    aboutSubtitle: 'Tìm Workstation JobShare',
    aboutCard1Title: 'Đa dạng Job Kỹ sư tại Nhật',
    aboutCard1Desc:
      'Hàng ngàn vị trí tuyển dụng được cập nhật mỗi ngày, thuộc các ngành Cơ khí, IT, Điện, Điện tử, Xây dựng tại các doanh nghiệp uy tín Nhật Bản.',
    aboutCard2Title: 'Ứng dụng AI tạo CV',
    aboutCard2Desc:
      'Tự động hóa việc viết CV chuẩn chuyên nghiệp, tối ưu từ khóa theo yêu cầu tuyển dụng Nhật Bản.',
    aboutCard3Title: 'Định hướng & Gợi ý Job',
    aboutCard3Desc:
      'Hệ thống tự động phân tích hồ sơ để đề xuất các công việc có độ "matching" cao nhất với năng lực của bạn.',
    whyTitleLine1: 'Why Choose',
    whyTitleLine2: 'Us?',
    whyDesc:
      'Lợi thế khi tìm việc cùng JobShare: gợi ý đúng vị trí, quy trình rõ ràng và đội ngũ chuyên viên đồng hành đến khi nhận việc.',
    whyCard1Title: 'Việc làm phù hợp năng lực, tập trung thị trường Nhật Bản',
    whyCard1Desc:
      'Danh sách việc làm được chọn lọc theo kỹ năng, kinh nghiệm và mục tiêu nghề nghiệp, giúp bạn tiết kiệm thời gian tìm kiếm và tăng cơ hội ứng tuyển đúng vị trí.',
    whyCard2Title: 'Hỗ trợ chuẩn hóa CV và chuẩn bị phỏng vấn thực tế',
    whyCard2Desc:
      'Bạn được hướng dẫn cải thiện hồ sơ theo tiêu chí doanh nghiệp Nhật, luyện phản hồi phỏng vấn và nhận góp ý cụ thể để tăng tỉ lệ đậu.',
    whyCard3Title: 'Theo dõi tiến trình minh bạch với chuyên viên đồng hành',
    whyCard3Desc:
      'Mọi trạng thái ứng tuyển được cập nhật rõ ràng theo từng vòng. Đội ngũ JobShare luôn theo sát để hỗ trợ bạn xử lý nhanh các phát sinh.',
    whyCard4Title: 'Kho job đa dạng, cập nhật liên tục từ doanh nghiệp Nhật',
    whyCard4Desc:
      'JobShare cung cấp nguồn job tuyển dụng kỹ sư từ các doanh nghiệp Nhật đã được xử lý và chuẩn hóa. Bạn có thể chọn job phù hợp và bắt đầu tiến cử ứng viên ngay mà không cần tự tìm kiếm khách hàng.',
    aiCvPromoTitle:
      'Chỉ mất 3 phút để có CV chuẩn Nhật với công nghệ AI của Workstation JobShare.',
    aiCvPromoCta: 'Thử ngay - Miễn phí',
    guideTitle: 'Quy trình ứng tuyển',
    guideStep1Title: 'Tìm kiếm việc làm phù hợp ngay trên trang chủ của chúng tôi',
    guideStep1Desc:
      'Từ trang chủ, bạn có thể nhanh chóng xem các vị trí đang tuyển và lọc theo nhu cầu của mình để bắt đầu ứng tuyển.',
    guideStep2Title: 'Tạo hồ sơ nhanh chóng và ứng tuyển',
    guideStep2Desc:
      'Hoàn thiện hồ sơ ứng viên, xác nhận thông tin cần thiết và gửi ứng tuyển chỉ trong vài bước đơn giản.',
    guideStep3Title:
      'Hệ thống sẽ đánh giá hồ sơ và liên hệ lại với ứng viên trong thời gian sớm nhất để tiếp tục quá trình tiến cử, sắp xếp phỏng vấn (nếu có)',
    guideStep3Desc:
      'Sau khi gửi hồ sơ, hệ thống sẽ đánh giá và cập nhật trạng thái để chuyên viên JobShare liên hệ hỗ trợ tiếp theo.',
    partnerTitle: 'Đối tác tiêu biểu',
    partnerSubtitle: 'Hệ sinh thái doanh nghiệp đang đồng hành cùng JobShare',
    featureTitle: '4 tính năng miễn phí dành cho ứng viên',
    feature1Title: 'Tìm việc làm kỹ sư tại Nhật nhanh chóng',
    feature1Points: [
      'Tìm kiếm vị trí theo ngành nghề, khu vực và mức yêu cầu phù hợp',
      'Nhận gợi ý công việc phù hợp với kỹ năng nhờ hệ thống AI matching',
      'Xem mô tả tuyển dụng chi tiết để tăng tỷ lệ ứng tuyển thành công',
    ],
    feature2Title: 'Tạo và tối ưu hồ sơ ứng tuyển bằng AI',
    feature2Points: [
      'Tự động tạo CV theo chuẩn format doanh nghiệp Nhật Bản',
      'Lưu trữ nhiều phiên bản hồ sơ để linh hoạt theo từng vị trí ứng tuyển',
      'Nhận gợi ý cải thiện nội dung hồ sơ để tăng khả năng trúng tuyển',
    ],
    feature3Title: 'Theo dõi tiến trình ứng tuyển minh bạch',
    feature3Points: [
      'Theo dõi trạng thái hồ sơ theo từng vòng phỏng vấn',
      'Trao đổi nhanh với đội ngũ JobShare khi cần bổ sung thông tin',
      'Quản lý lịch phỏng vấn và nhắc việc trực tiếp trên hệ thống',
    ],
    feature4Title: 'Nhận hỗ trợ nghề nghiệp từ JobShare',
    feature4Points: [
      'Cập nhật sự kiện việc làm và webinar về thị trường Nhật Bản',
      'Tham gia chương trình chia sẻ kinh nghiệm phỏng vấn và định hướng nghề nghiệp',
      'Đăng ký tham gia sự kiện trực tiếp ngay trên nền tảng',
    ],
    featureCta: 'Tạo hồ sơ ngay',
    hotNewsTitle: 'Tin tức cập nhật',
    hotNewsDesc: 'Cập nhật nhanh thông tin, mẹo làm CTV và xu hướng việc làm Nhật Bản.',
    hotNewsViewAll: 'Xem tất cả tin tức',
    hotNewsTagFallback: 'Tin tức',
    jobPickupTitle: 'Việc làm nổi bật hôm nay',
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
      'Đăng ký ngay hôm nay để tạo hồ sơ ứng viên JobShare và khám phá hàng trăm cơ hội việc làm tại Nhật Bản. Hoàn toàn miễn phí!',
    footerBtnPrimary: 'Tạo hồ sơ ngay',
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
    heroTitleLine1: 'ELEVATE YOUR CAREER',
    heroTitleLine2: 'BUILD A STEADY FUTURE',
    heroDescLine1: 'A smart recruitment platform',
    heroDescLine2: 'for foreign nationals in Japan',
    heroBtnPrimary: 'Find jobs now',
    heroBtnSecondary: 'Create CV with AI',
    aboutTitle: 'Engineering jobs',
    aboutSubtitle: 'Find them on JobShare',
    aboutCard1Title: 'Diverse engineering jobs in Japan',
    aboutCard1Desc:
      'Thousands of openings updated daily across mechanical, IT, electrical, electronics, and construction fields at trusted Japanese companies.',
    aboutCard2Title: 'AI-powered CV creation',
    aboutCard2Desc:
      'Automate professional CV writing and keyword optimization aligned with Japanese hiring expectations.',
    aboutCard3Title: 'Guidance & job suggestions',
    aboutCard3Desc:
      'The system analyzes your profile to recommend roles with the strongest match to your skills.',
    whyTitleLine1: 'Why Choose',
    whyTitleLine2: 'Us?',
    whyDesc:
      'Why job seekers choose JobShare: better-fit opportunities, a transparent process, and dedicated support until you get hired.',
    whyCard1Title: 'Better-fit jobs focused on the Japan market',
    whyCard1Desc:
      'Job listings are curated by your skills, experience, and career goals, helping you save search time and apply to roles that truly match.',
    whyCard2Title: 'Hands-on support for CV optimization and interviews',
    whyCard2Desc:
      'You receive practical guidance to improve your CV for Japanese employers, prepare interview responses, and increase your pass rate.',
    whyCard3Title: 'Transparent progress tracking with dedicated consultants',
    whyCard3Desc:
      'Every application stage is clearly tracked. JobShare consultants stay with you throughout the process to quickly handle issues and keep momentum.',
    aiCvPromoTitle:
      'Get a Japan-standard CV in just 3 minutes with JobShare AI technology.',
    aiCvPromoCta: 'Try now — Free',
    guideTitle: 'Application process',
    guideStep1Title: 'Find suitable jobs right on our homepage',
    guideStep1Desc:
      'From the homepage, you can quickly browse open positions and filter by your needs before starting an application.',
    guideStep2Title: 'Create your profile and apply quickly',
    guideStep2Desc:
      'Complete your candidate profile, confirm the required information, and submit an application in just a few simple steps.',
    guideStep3Title:
      'We review your profile and contact you as soon as possible to continue referral and schedule interviews (if applicable).',
    guideStep3Desc:
      'After you submit your profile, we review it and update the status so a JobShare consultant can follow up with the next steps.',
    partnerTitle: 'Featured Partners',
    partnerSubtitle: 'Companies in the ecosystem partnering with JobShare',
    featureTitle: '4 free features for candidates',
    feature1Title: 'Find engineering jobs in Japan faster',
    feature1Points: [
      'Search roles by industry, location, and requirement level',
      'Get skill-based recommendations from the AI matching system',
      'Review detailed job descriptions to improve application success',
    ],
    feature2Title: 'Build and optimize your profile with AI',
    feature2Points: [
      'Generate CVs automatically in Japanese employer-ready format',
      'Store multiple profile versions for different job applications',
      'Receive profile improvement suggestions to raise your pass rate',
    ],
    feature3Title: 'Track your application progress transparently',
    feature3Points: [
      'Follow status updates across each interview stage',
      'Communicate quickly with JobShare consultants when updates are needed',
      'Manage interview schedules and reminders in one place',
    ],
    feature4Title: 'Get career support from JobShare',
    feature4Points: [
      'Stay updated on job events and webinars about the Japan market',
      'Join interview experience-sharing and career guidance sessions',
      'Register for events directly on the platform',
    ],
    featureCta: 'Create Profile',
    hotNewsTitle: 'JobShare News',
    hotNewsDesc: 'Quick updates, collaborator tips, and job market trends in Japan.',
    hotNewsViewAll: 'View all news',
    hotNewsTagFallback: 'News',
    jobPickupTitle: "Today's featured jobs",
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
      'Register today to create your JobShare candidate profile and explore hundreds of job opportunities in Japan. Completely free!',
    footerBtnPrimary: 'Create profile now',
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
    heroTitleLine1: 'キャリアを一段上へ',
    heroTitleLine2: '確かな未来へ',
    heroDescLine1: 'スマートな採用プラットフォーム',
    heroDescLine2: '日本で働く外国人のために',
    heroBtnPrimary: '求人を探す',
    heroBtnSecondary: 'AIで履歴書を作成',
    aboutTitle: 'エンジニア求人',
    aboutSubtitle: 'JobShareで探す',
    aboutCard1Title: '多様なエンジニア求人（日本）',
    aboutCard1Desc:
      '機械・IT・電気・電子・建設など、毎日更新される数千件の求人を、信頼できる日本企業から提供します。',
    aboutCard2Title: 'AIで履歴書作成',
    aboutCard2Desc:
      'プロ品質の履歴書作成を自動化し、日本の採用要件に合わせたキーワード最適化を行います。',
    aboutCard3Title: 'キャリア提案と求人レコメンド',
    aboutCard3Desc:
      'プロフィールを自動分析し、あなたのスキルと最も「マッチング」度の高い求人を提案します。',
    whyTitleLine1: 'Why Choose',
    whyTitleLine2: 'Us?',
    whyDesc:
      '求職者がJobShareを選ぶ理由：適切な求人提案、透明な選考プロセス、そして内定まで続く伴走支援。',
    whyCard1Title: '日本市場に特化した、適性に合う求人提案',
    whyCard1Desc:
      'スキル・経験・キャリア目標に基づいて求人を厳選し、探す時間を減らしながら、適切なポジションへの応募精度を高めます。',
    whyCard2Title: 'CV最適化と面接準備を実践的にサポート',
    whyCard2Desc:
      '日本企業の基準に合わせたCV改善、面接回答の準備、具体的なフィードバックにより、通過率向上を支援します。',
    whyCard3Title: '進捗の見える化と専任コンサルタントの伴走',
    whyCard3Desc:
      '応募状況は各フェーズごとに明確に確認でき、JobShareチームが課題対応まで迅速にサポートします。',
    aiCvPromoTitle:
      'JobShareのAI技術で、日本基準の履歴書をわずか3分で。プロ品質の職務経歴書を。',
    aiCvPromoCta: '今すぐ試す（無料）',
    guideTitle: '応募の流れ',
    guideStep1Title: 'トップページから、自分に合う求人を探す',
    guideStep1Desc:
      'トップページから、募集中の求人をすばやく確認し、希望条件で絞り込んで応募を始められます。',
    guideStep2Title: 'プロフィールを作成し、すぐに応募する',
    guideStep2Desc:
      '候補者プロフィールを入力し、必要情報を確認して、わずか数ステップで応募できます。',
    guideStep3Title:
      '書類を審査のうえ、最短でご連絡し、推薦や面接の調整（該当する場合）へ進みます。',
    guideStep3Desc:
      'プロフィール送信後、内容を確認してステータスを更新し、JobShareの担当者が次の対応をご案内します。',
    partnerTitle: '主要パートナー',
    partnerSubtitle: 'JobShareと連携する企業エコシステム',
    featureTitle: '求職者向け無料機能 4つ',
    feature1Title: '日本のエンジニア求人を素早く検索',
    feature1Points: [
      '職種・エリア・要件レベルで求人を検索できます',
      'AIマッチングがスキルに合う求人を提案します',
      '詳細な求人情報を確認して応募成功率を高めます',
    ],
    feature2Title: 'AIで応募プロフィールを最適化',
    feature2Points: [
      '日本企業向けフォーマットのCVをAIで自動作成します',
      '応募先ごとに複数のプロフィールを保存・管理できます',
      '通過率を高めるための改善提案を受け取れます',
    ],
    feature3Title: '応募進捗を見える化',
    feature3Points: [
      '面接フェーズごとのステータスを確認できます',
      '追加情報が必要な際はJobShareチームと素早く連携できます',
      '面接予定とリマインダーを一元管理できます',
    ],
    feature4Title: 'JobShareのキャリア支援',
    feature4Points: [
      '日本就職に関するイベント・ウェビナー情報を確認できます',
      '面接対策やキャリア相談セッションに参加できます',
      'イベントへシステム上から直接申し込みできます',
    ],
    featureCta: 'プロフィール作成',
    hotNewsTitle: 'JobShare News',
    hotNewsDesc: 'CTV向けの実践情報、就職トレンド、最新ニュースを素早くお届けします。',
    hotNewsViewAll: 'ニュース一覧を見る',
    hotNewsTagFallback: 'ニュース',
    jobPickupTitle: '本日の注目求人',
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
      '今すぐ登録してJobShareの求職者プロフィールを作成し、日本での多くの求人機会を見つけましょう。利用は完全無料です！',
    footerBtnPrimary: 'プロフィール作成',
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



function companyLogoUrl(logo) {
  if (!logo || typeof logo !== 'string') return null
  const p = logo.trim()
  if (p.startsWith('http://') || p.startsWith('https://')) return p
  const base = getAssetBaseUrl()
  const path = p.startsWith('/') ? p : `/${p}`
  return `${base}${path}`
}

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
  const blogBase = pathname.startsWith('/landing/candidate') ? '/landing/candidate' : '/candidate'
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
        if (!cancelled) {
          setPickupJobs([])
        }
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
          surface: 'candidate',
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

  const appendJpyIfNeeded = (value) => {
    const text = String(value || '').trim()
    if (!text) return '—'

    const normalized = text.replace(/\s+/g, ' ')
    const hasLetters = /[A-Za-z\p{L}]/u.test(normalized)
    const alreadyHasJpy = /\bJPY\b/i.test(normalized)
    const hasNumber = /\d/.test(normalized)
    const rangeMatch = normalized.match(/^(.+?)\s*[-–—〜～]\s*(.+?)$/)

    if (alreadyHasJpy || !hasNumber || hasLetters) {
      return normalized
    }

    if (rangeMatch) {
      const left = rangeMatch[1].trim()
      const right = rangeMatch[2].trim()
      return `${left} - ${right} JPY`
    }

    return `${normalized} JPY`
  }

  const salaryLine = (job) => {
    const sr = job?.salaryRanges?.[0] || job?.salary_ranges?.[0]
    if (!sr) return '—'
    if (typeof sr === 'string') return appendJpyIfNeeded(sr)

    if (language === 'en' && (sr.salaryRangeEn || sr.salary_range_en)) return appendJpyIfNeeded(sr.salaryRangeEn || sr.salary_range_en)
    if (language === 'ja' && (sr.salaryRangeJp || sr.salary_range_jp)) return appendJpyIfNeeded(sr.salaryRangeJp || sr.salary_range_jp)
    return appendJpyIfNeeded(sr.salaryRange || sr.salary_range || '—')
  }

  const mapJobToPickupCard = (job, fallbackIdx) => {
    const fallback = t.jobPickupCards?.[fallbackIdx]
    if (!job) {
      return fallback
        ? { ...fallback, id: `pickup-fallback-${fallbackIdx}`, logoUrl: null }
        : { id: `pickup-fallback-${fallbackIdx}`, company: '—', postedAgo: '', title: '', meta: '—', tag: '', logoUrl: null }
    }

    const logoRaw = job?.company?.logo || job?.recruitingCompany?.logo || null

    const title =
      (language === 'en' && job.titleEn) || (language === 'ja' && job.titleJp) ? (language === 'en' ? job.titleEn : job.titleJp) : job.title

    const recruitingCompany =
      job?.recruitingCompany?.companyName ||
      job?.recruitingCompany?.company_name ||
      job?.company?.name ||
      job?.companyName ||
      '—'

    return {
      id: job.id ?? `pickup-${fallbackIdx}`,
      recruitingCompany,
      title: title || '—',
      meta: salaryLine(job),
      tag: recruitmentLabel(job.recruitmentType ?? job.recruitment_type, language),
      logoUrl: companyLogoUrl(logoRaw),
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
        <link rel="canonical" href="https://ws-jobshare.com/landing/candidate" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={seo.ogTitle} />
        <meta property="og:description" content={seo.ogDesc} />
        <meta property="og:url" content="https://ws-jobshare.com/landing/candidate" />
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
          "url": "https://ws-jobshare.com/landing/candidate",
          "inLanguage": language,
          "isPartOf": { "@type": "WebSite", "name": "Workstation JobShare", "url": "https://ws-jobshare.com" }
        })}</script>
      </Helmet>
      <section
        className="relative -mt-[68px] w-full min-h-[620px] overflow-hidden bg-cover bg-center bg-no-repeat pb-0 pt-[68px]"
        style={{
          backgroundImage: "url('/assets/banner.png')",
        }}
      >
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#020817]/85 via-[#0f172a]/65 to-[#0f172a]/45" />
        {/* Giống Collaborator: cùng padding; desktop căn giữa dọc trong vùng hero để nội dung ngang tầm ảnh cutout */}
        <div className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-col justify-center px-4 pb-10 pt-16 md:min-h-[552px] md:px-6 md:pb-16 md:pr-[min(50%,360px)]">
          <div className="max-w-xl">
            <h1 className="text-3xl font-extrabold uppercase leading-[1.1] tracking-tight text-white md:text-5xl">
              <span className="block">{t.heroTitleLine1}</span>
              <span className="mt-1 block md:mt-2">{t.heroTitleLine2}</span>
            </h1>

            <p className="mt-4 max-w-xl text-base font-normal leading-snug text-white md:text-lg">
              <span className="block">{t.heroDescLine1}</span>
              <span className="block">{t.heroDescLine2}</span>
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/landing/candidate/jobs"
                className="inline-flex items-center justify-center rounded-full bg-[#ED212F] px-5 py-2.5 text-sm font-bold !text-white transition-colors hover:bg-[#d11824] hover:!text-white"
              >
                {t.heroBtnPrimary}
              </Link>
              <Link
                to="/landing/candidate/profile"
                className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-bold !text-[#ED212F] transition-colors hover:bg-white/90 hover:!text-[#ED212F]"
              >
                {t.heroBtnSecondary}
              </Link>
            </div>
          </div>
        </div>

        <div className="z-[5] mt-6 flex justify-center px-4 pb-0 md:pointer-events-none md:absolute md:inset-0 md:mt-0 md:flex md:flex-col md:justify-end md:px-0 md:pb-0">
          <div className="w-full max-w-[1200px] px-4 pb-0 text-center md:mx-auto md:flex md:justify-end md:pl-6 md:pr-3 md:pb-0">
            <img
              src="/assets/banner_item1.png"
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
            <div className="mx-auto flex min-h-[140px] w-full max-w-[1200px] flex-col justify-center px-4 py-4 text-left md:px-6 md:py-5">
              <p className="text-4xl font-extrabold uppercase text-[#ed212f] md:text-5xl">
                {t.aboutTitle}
              </p>
              <p className="mt-3 text-sm font-medium uppercase text-[#1f2a6b] md:text-base">
                {t.aboutSubtitle}
              </p>
            </div>
          </div>

          <div className="space-y-0 overflow-hidden">
            <div className="bg-white">
              <div className="mx-auto grid min-h-[220px] w-full max-w-[1200px] grid-cols-1 md:grid-cols-[220px_1fr]">
                <div className="flex min-h-[220px] flex-col justify-center px-4 py-8 text-left md:px-6 md:py-10">
                  <p className="text-3xl font-extrabold uppercase text-[#162275]">01</p>
                  <p className="mt-2 text-xl font-extrabold uppercase text-[#162275]">
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
                  <p className="text-3xl font-extrabold uppercase text-white">02</p>
                  <p className="mt-2 text-xl font-extrabold uppercase text-white">
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
                  <p className="text-3xl font-extrabold uppercase text-white">03</p>
                  <p className="mt-2 text-xl font-extrabold uppercase text-white">
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

      <section id="why-choose-us" className="bg-white px-4 pb-16 pt-20 md:px-6 md:pb-20">
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="grid gap-14 lg:grid-cols-[320px_1fr] lg:items-start lg:gap-56">
            <div className="mt-20 lg:sticky lg:top-24 lg:flex lg:min-h-[500px] lg:items-center">
              <div>
                <h2 className="inline-block text-left uppercase">
                  <span className="block text-3xl font-bold text-black md:text-5xl lg:text-6xl">
                    {t.whyTitleLine1}
                  </span>
                  <span className="mt-1 block w-full text-7xl font-extrabold leading-none text-[#ED212F] md:text-9xl lg:text-[10rem]">
                    {t.whyTitleLine2}
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
                to="register"
                className="mt-8 inline-flex w-fit max-w-full items-center justify-center rounded-lg bg-[#ED212F] px-6 py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#d11824] md:px-8 md:text-base"
              >
                <span className="text-white !text-white">{t.aiCvPromoCta}</span>
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
          <h3 className="text-center text-2xl font-extrabold uppercase text-black md:text-3xl">
            {t.guideTitle}
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
                <h4 className="mt-3 text-xl font-extrabold leading-snug">{item.title}</h4>
                {item.desc ? (
                  <p className="mt-5 text-sm leading-relaxed text-white/95 md:mt-0 md:max-h-0 md:overflow-hidden md:opacity-0 md:transition-all md:duration-300 md:group-hover:mt-5 md:group-hover:max-h-[420px] md:group-hover:opacity-100">
                    {item.desc}
                  </p>
                ) : null}
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
                to="/landing/candidate/profile"
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
              { id: '01', title: t.feature1Title, points: t.feature1Points || [] },
              { id: '02', title: t.feature2Title, points: t.feature2Points || [] },
              { id: '03', title: t.feature3Title, points: t.feature3Points || [] },
              { id: '04', title: t.feature4Title, points: t.feature4Points || [] },
            ].map((feature) => (
              <article
                key={feature.id}
                className="flex w-[220px] min-h-[340px] shrink-0 flex-col rounded-xl border border-[#ED212F]/20 bg-white p-5 shadow-sm md:w-[240px] lg:w-[260px]"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#ED212F] text-xs font-bold text-white">
                  {feature.id}
                </span>
                <h4 className="mt-3 text-lg font-extrabold text-[#111827]">{feature.title}</h4>
                <ul className="mt-3 space-y-2">
                  {feature.points.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ED212F] text-xs font-bold text-white">
                        ✓
                      </span>
                      <span className="text-sm leading-relaxed text-[#4B5563]">{point}</span>
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
          <h3 className="mt-0 text-center text-2xl font-extrabold uppercase text-[#ED212F] md:text-3xl">
            {t.partnerTitle}
          </h3>
          <p className="mt-2 text-center text-sm text-[#4B5563]">
            {t.partnerSubtitle}
          </p>
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

      <section id="job-pickup" className="bg-white px-4 py-14 md:px-6 md:py-16">
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="flex justify-center">
            <h3 className="text-center text-3xl font-extrabold uppercase leading-tight text-[#111827] md:text-5xl">
              {t.jobPickupTitle}
            </h3>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pickupCards.map((job) => (
              <Link
                key={job.id}
                to={`/landing/candidate/jobs/${job.id}`}
                className={`flex h-full min-h-[280px] flex-col rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#ED212F]/30 hover:shadow-md md:p-5 ${
                  pickupLoading && pickupJobs.length === 0 ? 'animate-pulse bg-gray-50' : ''
                }`}
              >
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] md:h-16 md:w-16"
                  aria-hidden
                >
                  {job.logoUrl ? (
                    <img src={job.logoUrl} alt="" className="h-full w-full object-contain p-1.5" />
                  ) : (
                    <Building2 className="h-7 w-7 text-[#9CA3AF] md:h-8 md:w-8" />
                  )}
                </div>
                <p className="mt-3 text-xs font-semibold leading-snug text-[#6B7280] line-clamp-1">
                  {job.recruitingCompany}
                </p>
                <h4 className="mt-2 min-h-[2.75rem] text-sm font-bold uppercase leading-snug text-[#111827] line-clamp-3 md:text-base">
                  {job.title}
                </h4>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#4B5563] md:text-sm">{job.meta}</p>
                <span className="mt-auto inline-flex w-fit rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[11px] font-semibold text-[#374151] md:px-3 md:text-xs">
                  {job.tag}
                </span>
              </Link>
            ))}

            <Link
              to="/landing/candidate/jobs"
              className="flex h-full min-h-[280px] flex-col rounded-2xl border border-[#ED212F] bg-[#ED212F] p-4 shadow-sm md:p-5"
            >
              <p className="text-5xl font-extrabold leading-none tracking-tight text-white md:text-6xl">+481</p>
              <p className="mt-auto text-sm leading-relaxed text-white/90">
                {t.jobPickupStatLabel}{' '}
                <span className="font-semibold text-white">{t.jobPickupExploreAll} &#8250;</span>
              </p>
            </Link>
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
                to="/landing/candidate/profile"
                className="inline-flex h-10 w-full max-w-[280px] items-center justify-center rounded-lg bg-[#ED212F] px-5 text-sm font-semibold !text-white transition-colors hover:bg-[#d11824] hover:!text-white sm:w-auto sm:min-w-[132px]"
              >
                {t.footerBtnPrimary}
              </Link>
              <button
                type="button"
                onClick={() => setContactPopupOpen(true)}
                className="inline-flex h-10 w-full max-w-[280px] items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold !text-[#ED212F] transition-colors hover:bg-[#f4f4f5] hover:!text-[#ED212F] sm:w-auto sm:min-w-[132px]"
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
