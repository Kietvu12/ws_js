-- ============================================================================
-- COMPANY MODULE EXTENSION SCHEMA
-- Mở rộng cho module Company portal (Doanh nghiệp)
-- KHÔNG sửa đổi bất kỳ bảng nào trong schema.sql gốc
-- Tái sử dụng: companies, jobs, job_applications, cv_storages, collaborators,
--   point_wallets, point_transactions, unlocked_candidates, headhunt_requests,
--   service_packages, package_orders, recruitment_pages, messages
-- ============================================================================

-- =============================================================
-- 1. COMPANY USERS (Thành viên công ty - đăng nhập portal)
-- =============================================================

CREATE TABLE company_users (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id  BIGINT UNSIGNED NOT NULL,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    password    VARCHAR(255) NOT NULL,
    phone       VARCHAR(50) NULL,
    avatar      VARCHAR(512) NULL,
    role        ENUM('owner','manager','recruiter','viewer') NOT NULL DEFAULT 'recruiter'
                COMMENT 'owner: chủ DN, manager: quản lý tuyển dụng, recruiter: HR, viewer: chỉ xem',
    is_active   TINYINT(1) NOT NULL DEFAULT 1,
    last_login_at DATETIME NULL,
    remember_token VARCHAR(100) NULL,
    created_at  TIMESTAMP NULL DEFAULT NULL,
    updated_at  TIMESTAMP NULL DEFAULT NULL,
    deleted_at  TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_company_users_email (email),
    KEY idx_company_users_company (company_id),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- 2. COMPANY NOTIFICATIONS (Thông báo Dashboard)
-- =============================================================

CREATE TABLE company_notifications (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id      BIGINT UNSIGNED NOT NULL,
    recipient_id    BIGINT UNSIGNED NULL COMMENT 'company_users.id, NULL = toàn công ty',
    type            VARCHAR(50) NOT NULL DEFAULT 'info'
                    COMMENT 'info, alert, candidate_match, jd_warning, payment, system',
    title           VARCHAR(500) NULL,
    content         TEXT NOT NULL,
    reference_type  VARCHAR(50) NULL COMMENT 'job, job_application, cv_storage, request, invoice',
    reference_id    BIGINT UNSIGNED NULL COMMENT 'ID của đối tượng liên quan',
    is_read         TINYINT(1) NOT NULL DEFAULT 0,
    read_at         DATETIME NULL,
    created_at      TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_cn_company_read (company_id, is_read, created_at),
    KEY idx_cn_recipient (recipient_id),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES company_users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- 3. RECRUITMENT HEALTH SNAPSHOTS (Sức khỏe tuyển dụng - Dashboard)
--    Lưu snapshot định kỳ (daily/weekly) để theo dõi xu hướng
-- =============================================================

CREATE TABLE company_recruitment_health (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id      BIGINT UNSIGNED NOT NULL,
    snapshot_date   DATE NOT NULL,
    supply_score    TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0-100: Nguồn ứng viên',
    performance_score TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0-100: Hiệu suất',
    quality_score   TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0-100: Chất lượng',
    speed_score     TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0-100: Tốc độ',
    overall_score   TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0-100: Tổng hợp',
    active_jd_count     INT UNSIGNED NOT NULL DEFAULT 0,
    new_candidates_7d   INT UNSIGNED NOT NULL DEFAULT 0,
    matched_candidates  INT UNSIGNED NOT NULL DEFAULT 0,
    unlocks_7d          INT UNSIGNED NOT NULL DEFAULT 0,
    pending_requests    INT UNSIGNED NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_crh_company_date (company_id, snapshot_date),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- 4. JD SERVICES (Dịch vụ gắn với từng JD)
--    Theo dõi JD đang dùng dịch vụ nào
--    Tái sử dụng: jobs (JD chính)
-- =============================================================

CREATE TABLE company_jd_services (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    job_id      BIGINT UNSIGNED NOT NULL COMMENT 'FK -> jobs.id',
    company_id  BIGINT UNSIGNED NOT NULL,
    service_type ENUM('scout_credit','scout_performance','saiyo_branding','ctv_marketplace')
                NOT NULL,
    status      ENUM('active','paused','completed','cancelled') NOT NULL DEFAULT 'active',
    detail      VARCHAR(500) NULL COMMENT 'Chi tiết: "Đã unlock: 56 hồ sơ"',
    activated_at DATETIME NULL,
    deactivated_at DATETIME NULL,
    created_at  TIMESTAMP NULL DEFAULT NULL,
    updated_at  TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_cjs_job_service (job_id, service_type),
    KEY idx_cjs_company (company_id),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- 5. JD HEALTH (Sức khỏe từng JD - CompanyJDDetail)
-- =============================================================

CREATE TABLE company_jd_health (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    job_id          BIGINT UNSIGNED NOT NULL,
    company_id      BIGINT UNSIGNED NOT NULL,
    snapshot_date   DATE NOT NULL,
    supply_score    TINYINT UNSIGNED NOT NULL DEFAULT 0,
    quality_score   TINYINT UNSIGNED NOT NULL DEFAULT 0,
    performance_score TINYINT UNSIGNED NOT NULL DEFAULT 0,
    speed_score     TINYINT UNSIGNED NOT NULL DEFAULT 0,
    total_candidates    INT UNSIGNED NOT NULL DEFAULT 0,
    matched_candidates  INT UNSIGNED NOT NULL DEFAULT 0,
    efficiency_pct      DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Hiệu quả tuyển dụng %',
    created_at      TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_cjh_job_date (job_id, snapshot_date),
    KEY idx_cjh_company (company_id),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- 6. AI MATCH RESULTS (Kết quả AI matching cho JD)
--    Tái sử dụng: jobs, cv_storages
-- =============================================================

CREATE TABLE company_ai_matches (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    job_id      BIGINT UNSIGNED NOT NULL,
    cv_id       BIGINT UNSIGNED NOT NULL COMMENT 'FK -> cv_storages.id',
    match_score TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0-100',
    skill_match JSON NULL COMMENT '{"matched":["React","TS"],"missing":["AWS"]}',
    summary     TEXT NULL COMMENT 'AI-generated summary',
    created_at  TIMESTAMP NULL DEFAULT NULL,
    updated_at  TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_cam_job_cv (job_id, cv_id),
    KEY idx_cam_score (job_id, match_score),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (cv_id) REFERENCES cv_storages(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- 7. CANDIDATE TRACKING (Theo dõi ứng viên của DN - CompanyCandidates)
--    Tái sử dụng: job_applications (nguồn gốc nomination)
-- =============================================================

CREATE TABLE company_candidate_tracking (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id      BIGINT UNSIGNED NOT NULL,
    cv_id           BIGINT UNSIGNED NOT NULL COMMENT 'FK -> cv_storages.id',
    job_id          BIGINT UNSIGNED NULL COMMENT 'FK -> jobs.id (JD liên quan)',
    job_application_id BIGINT UNSIGNED NULL COMMENT 'FK -> job_applications.id',
    source          ENUM('scout_credit','scout_performance','ctv_marketplace','branding_lp','direct')
                    NOT NULL DEFAULT 'direct',
    status          ENUM('new','contacted','processing','interviewing','offered','hired','rejected','withdrawn')
                    NOT NULL DEFAULT 'new',
    phase           VARCHAR(255) NULL COMMENT 'Mô tả chi tiết phase hiện tại',
    match_score     TINYINT UNSIGNED NULL COMMENT 'AI match score 0-100',
    internal_note   TEXT NULL COMMENT 'Ghi chú nội bộ của DN',
    assigned_to     BIGINT UNSIGNED NULL COMMENT 'company_users.id phụ trách',
    entry_date      DATE NULL,
    created_at      TIMESTAMP NULL DEFAULT NULL,
    updated_at      TIMESTAMP NULL DEFAULT NULL,
    deleted_at      TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_cct_company_status (company_id, status),
    KEY idx_cct_job (job_id),
    KEY idx_cct_cv (cv_id),
    KEY idx_cct_assigned (assigned_to),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (cv_id) REFERENCES cv_storages(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (job_application_id) REFERENCES job_applications(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES company_users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- 8. COMPANY MESSAGES (Tin nhắn DN - CompanyMessages)
--    Mở rộng hệ thống tin nhắn cho Company portal
--    Tái sử dụng: messages (tin nhắn admin/CTV/applicant cũ)
-- =============================================================

CREATE TABLE company_chat_sessions (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id      BIGINT UNSIGNED NOT NULL,
    channel         ENUM('candidate_lp','candidate_scout','ctv','ws') NOT NULL
                    COMMENT 'lp=ứng viên từ Landing, scout=từ Scout, ctv=CTV, ws=WS team',
    participant_cv_id       BIGINT UNSIGNED NULL COMMENT 'Ứng viên (cv_storages.id)',
    participant_collaborator_id BIGINT UNSIGNED NULL COMMENT 'CTV (collaborators.id)',
    participant_admin_id    BIGINT UNSIGNED NULL COMMENT 'WS admin (admins.id)',
    job_id          BIGINT UNSIGNED NULL COMMENT 'JD liên quan',
    subject         VARCHAR(500) NULL,
    last_message_at DATETIME NULL,
    unread_count    INT UNSIGNED NOT NULL DEFAULT 0,
    is_archived     TINYINT(1) NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NULL DEFAULT NULL,
    updated_at      TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_ccs_company_channel (company_id, channel, last_message_at),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (participant_cv_id) REFERENCES cv_storages(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (participant_collaborator_id) REFERENCES collaborators(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (participant_admin_id) REFERENCES admins(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE company_chat_messages (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    session_id      BIGINT UNSIGNED NOT NULL,
    sender_type     ENUM('company','candidate','ctv','ws','system') NOT NULL,
    sender_user_id  BIGINT UNSIGNED NULL COMMENT 'company_users.id nếu sender=company',
    content         TEXT NOT NULL,
    attachment_url  VARCHAR(1024) NULL,
    attachment_name VARCHAR(255) NULL,
    attachment_size BIGINT UNSIGNED NULL,
    is_read         TINYINT(1) NOT NULL DEFAULT 0,
    read_at         DATETIME NULL,
    created_at      TIMESTAMP NULL DEFAULT NULL,
    deleted_at      TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_ccm_session_created (session_id, created_at),
    FOREIGN KEY (session_id) REFERENCES company_chat_sessions(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (sender_user_id) REFERENCES company_users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- 9. CTV MARKETPLACE - SÀN CTV (CompanySanCTV)
--    Tái sử dụng: jobs, collaborators
-- =============================================================

CREATE TABLE company_ctv_postings (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id      BIGINT UNSIGNED NOT NULL,
    job_id          BIGINT UNSIGNED NOT NULL,
    commission_type ENUM('fixed','percent') NOT NULL DEFAULT 'percent',
    commission_value DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT 'Giá trị hoa hồng (VND hoặc %)',
    commission_note VARCHAR(500) NULL COMMENT 'Mô tả: "Thường 15-60,000,000đ"',
    status          ENUM('pending_review','active','paused','closed') NOT NULL DEFAULT 'pending_review',
    ctv_interested  INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Số CTV quan tâm',
    nominations     INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Số đơn tiến cử',
    deadline        DATE NULL,
    created_at      TIMESTAMP NULL DEFAULT NULL,
    updated_at      TIMESTAMP NULL DEFAULT NULL,
    deleted_at      TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_ccp_company_job (company_id, job_id),
    KEY idx_ccp_status (status),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE company_ctv_nominations (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    posting_id      BIGINT UNSIGNED NOT NULL COMMENT 'FK -> company_ctv_postings.id',
    collaborator_id BIGINT UNSIGNED NOT NULL COMMENT 'CTV tiến cử',
    cv_id           BIGINT UNSIGNED NOT NULL COMMENT 'Ứng viên được tiến cử',
    job_application_id BIGINT UNSIGNED NULL COMMENT 'FK -> job_applications.id khi đã tạo',
    status          ENUM('submitted','reviewing','interviewing','offered','hired','rejected')
                    NOT NULL DEFAULT 'submitted',
    note            TEXT NULL,
    created_at      TIMESTAMP NULL DEFAULT NULL,
    updated_at      TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_ccn_posting (posting_id),
    KEY idx_ccn_collaborator (collaborator_id),
    FOREIGN KEY (posting_id) REFERENCES company_ctv_postings(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (collaborator_id) REFERENCES collaborators(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (cv_id) REFERENCES cv_storages(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (job_application_id) REFERENCES job_applications(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE company_ctv_payments (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id      BIGINT UNSIGNED NOT NULL,
    nomination_id   BIGINT UNSIGNED NOT NULL COMMENT 'FK -> company_ctv_nominations.id',
    collaborator_id BIGINT UNSIGNED NOT NULL,
    amount          DECIMAL(15,2) NOT NULL DEFAULT 0,
    status          ENUM('pending','processing','paid','cancelled') NOT NULL DEFAULT 'pending',
    paid_at         DATETIME NULL,
    note            TEXT NULL,
    created_at      TIMESTAMP NULL DEFAULT NULL,
    updated_at      TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_ccpay_company (company_id),
    KEY idx_ccpay_nomination (nomination_id),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (nomination_id) REFERENCES company_ctv_nominations(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (collaborator_id) REFERENCES collaborators(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- 10. SAIYO BRANDING (CompanySaiyoBranding)
--     Mở rộng recruitment_pages với tracking hiệu quả
--     Tái sử dụng: recruitment_pages (LP cơ bản)
-- =============================================================

CREATE TABLE company_branding_stats (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    recruitment_page_id BIGINT UNSIGNED NOT NULL COMMENT 'FK -> recruitment_pages.id',
    company_id          BIGINT UNSIGNED NOT NULL,
    snapshot_date       DATE NOT NULL,
    views               INT UNSIGNED NOT NULL DEFAULT 0,
    form_submissions    INT UNSIGNED NOT NULL DEFAULT 0,
    candidates_generated INT UNSIGNED NOT NULL DEFAULT 0,
    conversion_rate     DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    created_at          TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_cbs_page_date (recruitment_page_id, snapshot_date),
    KEY idx_cbs_company (company_id),
    FOREIGN KEY (recruitment_page_id) REFERENCES recruitment_pages(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE company_branding_services (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id      BIGINT UNSIGNED NOT NULL,
    service_name    VARCHAR(255) NOT NULL COMMENT 'Quảng cáo, Seminar, Company Profile, Website...',
    description     TEXT NULL,
    status          ENUM('active','completed','cancelled') NOT NULL DEFAULT 'active',
    created_at      TIMESTAMP NULL DEFAULT NULL,
    updated_at      TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_cbsvc_company (company_id),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- 11. KNOWLEDGE HUB (CompanyKnowledge)
-- =============================================================

CREATE TABLE company_knowledge_categories (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(255) NOT NULL,
    icon        VARCHAR(50) NULL COMMENT 'Emoji hoặc icon name',
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMP NULL DEFAULT NULL,
    updated_at  TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_ckc_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE company_knowledge_articles (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    category_id     BIGINT UNSIGNED NOT NULL,
    title           VARCHAR(500) NOT NULL,
    slug            VARCHAR(500) NOT NULL,
    content         LONGTEXT NULL,
    thumbnail       VARCHAR(512) NULL,
    read_time_min   SMALLINT UNSIGNED NOT NULL DEFAULT 5,
    view_count      INT UNSIGNED NOT NULL DEFAULT 0,
    is_featured     TINYINT(1) NOT NULL DEFAULT 0,
    status          ENUM('draft','published','archived') NOT NULL DEFAULT 'published',
    published_at    DATETIME NULL,
    author_admin_id BIGINT UNSIGNED NULL COMMENT 'Admin viết bài',
    created_at      TIMESTAMP NULL DEFAULT NULL,
    updated_at      TIMESTAMP NULL DEFAULT NULL,
    deleted_at      TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_cka_category (category_id),
    KEY idx_cka_featured (is_featured, published_at),
    FOREIGN KEY (category_id) REFERENCES company_knowledge_categories(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (author_admin_id) REFERENCES admins(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE company_knowledge_documents (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    category_id     BIGINT UNSIGNED NOT NULL,
    title           VARCHAR(500) NOT NULL,
    file_type       VARCHAR(20) NOT NULL COMMENT 'PDF, DOCX, Excel, PPTX',
    file_url        VARCHAR(1024) NOT NULL,
    file_size       BIGINT UNSIGNED NULL COMMENT 'bytes',
    download_count  INT UNSIGNED NOT NULL DEFAULT 0,
    uploaded_by     BIGINT UNSIGNED NULL COMMENT 'admins.id',
    created_at      TIMESTAMP NULL DEFAULT NULL,
    updated_at      TIMESTAMP NULL DEFAULT NULL,
    deleted_at      TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_ckd_category (category_id),
    FOREIGN KEY (category_id) REFERENCES company_knowledge_categories(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES admins(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- 12. REPORTS & INSIGHTS (CompanyReports)
-- =============================================================

CREATE TABLE company_report_snapshots (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id      BIGINT UNSIGNED NOT NULL,
    report_month    DATE NOT NULL COMMENT 'Tháng báo cáo (ngày 1)',
    total_jd_posted     INT UNSIGNED NOT NULL DEFAULT 0,
    total_nominations   INT UNSIGNED NOT NULL DEFAULT 0,
    total_interviews    INT UNSIGNED NOT NULL DEFAULT 0,
    total_hired         INT UNSIGNED NOT NULL DEFAULT 0,
    total_cost          DECIMAL(15,2) NOT NULL DEFAULT 0,
    conversion_rate     DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    avg_hiring_days     SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Thời gian tuyển trung bình (ngày)',
    source_scout_credit_pct  DECIMAL(5,2) NOT NULL DEFAULT 0,
    source_ctv_pct           DECIMAL(5,2) NOT NULL DEFAULT 0,
    source_scout_perf_pct    DECIMAL(5,2) NOT NULL DEFAULT 0,
    source_branding_pct      DECIMAL(5,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_crs_company_month (company_id, report_month),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE company_custom_reports (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id      BIGINT UNSIGNED NOT NULL,
    title           VARCHAR(500) NOT NULL,
    file_type       VARCHAR(20) NOT NULL DEFAULT 'PDF',
    file_url        VARCHAR(1024) NULL,
    generated_by    BIGINT UNSIGNED NULL COMMENT 'company_users.id',
    created_at      TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_ccr_company (company_id),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (generated_by) REFERENCES company_users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- 13. SERVICE REQUESTS (Yêu cầu dịch vụ - CompanyBilling)
--     Tái sử dụng: headhunt_requests (Scout Performance)
-- =============================================================

CREATE TABLE company_service_requests (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id      BIGINT UNSIGNED NOT NULL,
    request_code    VARCHAR(50) NOT NULL COMMENT 'VD: SP-2405-012',
    request_type    ENUM('scout_performance','landing_page_premium','buy_credit','marketplace_support','invoice','other')
                    NOT NULL,
    job_id          BIGINT UNSIGNED NULL COMMENT 'JD liên quan (nếu có)',
    cv_id           BIGINT UNSIGNED NULL COMMENT 'Ứng viên liên quan (nếu có)',
    description     TEXT NULL,
    status          ENUM('pending','processing','completed','waiting_response','cancelled')
                    NOT NULL DEFAULT 'pending',
    ws_assigned_id  BIGINT UNSIGNED NULL COMMENT 'Admin WS phụ trách',
    requested_by    BIGINT UNSIGNED NULL COMMENT 'company_users.id tạo request',
    created_at      TIMESTAMP NULL DEFAULT NULL,
    updated_at      TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_csr_code (request_code),
    KEY idx_csr_company_status (company_id, status),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (cv_id) REFERENCES cv_storages(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (ws_assigned_id) REFERENCES admins(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES company_users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- 14. INVOICES (Hóa đơn - CompanyBilling)
--     Tái sử dụng: point_wallets, point_transactions (credit)
-- =============================================================

CREATE TABLE company_invoices (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id      BIGINT UNSIGNED NOT NULL,
    invoice_code    VARCHAR(50) NOT NULL COMMENT 'VD: INV-2405-028',
    amount          DECIMAL(15,2) NOT NULL DEFAULT 0,
    currency        VARCHAR(10) NOT NULL DEFAULT 'VND',
    description     TEXT NULL,
    status          ENUM('draft','pending','paid','overdue','cancelled') NOT NULL DEFAULT 'pending',
    due_date        DATE NULL,
    paid_at         DATETIME NULL,
    payment_method  VARCHAR(100) NULL,
    file_url        VARCHAR(1024) NULL COMMENT 'Link file PDF hóa đơn',
    created_at      TIMESTAMP NULL DEFAULT NULL,
    updated_at      TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_ci_code (invoice_code),
    KEY idx_ci_company_status (company_id, status),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- 15. SERVICE SUBSCRIPTIONS (Dịch vụ đang hoạt động)
--     Tái sử dụng: service_packages, package_orders
-- =============================================================

CREATE TABLE company_active_services (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id      BIGINT UNSIGNED NOT NULL,
    package_order_id BIGINT UNSIGNED NULL COMMENT 'FK -> package_orders.id',
    service_name    VARCHAR(255) NOT NULL,
    status          ENUM('active','processing','expired','cancelled') NOT NULL DEFAULT 'active',
    detail          VARCHAR(500) NULL COMMENT 'Chi tiết: "Đã unlock: 56 hồ sơ"',
    started_at      DATETIME NULL,
    expires_at      DATETIME NULL,
    created_at      TIMESTAMP NULL DEFAULT NULL,
    updated_at      TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_cas_company (company_id, status),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (package_order_id) REFERENCES package_orders(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- 16. COMPANY SETTINGS (Cài đặt - CompanySettings)
-- =============================================================

CREATE TABLE company_settings (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id      BIGINT UNSIGNED NOT NULL,
    setting_key     VARCHAR(100) NOT NULL,
    setting_value   TEXT NULL,
    created_at      TIMESTAMP NULL DEFAULT NULL,
    updated_at      TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_cs_company_key (company_id, setting_key),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- 17. ACTION LOGS cho Company (Audit trail)
-- =============================================================

CREATE TABLE company_action_logs (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id      BIGINT UNSIGNED NOT NULL,
    user_id         BIGINT UNSIGNED NULL COMMENT 'company_users.id thực hiện',
    object_type     VARCHAR(100) NOT NULL COMMENT 'Tên entity: jd, candidate, message, request...',
    object_id       BIGINT UNSIGNED NULL,
    action          VARCHAR(50) NOT NULL COMMENT 'create, update, delete, view, unlock, send_message...',
    ip_address      VARCHAR(45) NULL,
    description     VARCHAR(500) NULL,
    metadata        JSON NULL COMMENT 'Dữ liệu bổ sung',
    created_at      TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_cal_company (company_id, created_at),
    KEY idx_cal_user (user_id),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES company_users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
