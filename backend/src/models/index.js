import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * Định nghĩa các model Sequelize dựa trên cấu trúc DB trong schema/structure.sql
 * Lưu ý:
 * - tableName luôn dùng snake_case đúng theo DB
 * - timestamps dùng cột created_at / updated_at
 * - paranoid dùng cột deleted_at nếu bảng có cột này
 * - field trong từng attribute map snake_case <-> camelCase nếu controller đang dùng camelCase
 */

// Admins
export const Admin = sequelize.define(
  'Admin',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    emailVerifiedAt: {
      type: DataTypes.DATE,
      field: 'email_verified_at'
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING(255)
    },
    avatar: {
      type: DataTypes.STRING(255)
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active'
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    rememberToken: {
      type: DataTypes.STRING(100),
      field: 'remember_token'
    },
    role: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    groupId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'group_id'
    }
  },
  {
    tableName: 'admins',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Groups
export const Group = sequelize.define(
  'Group',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    code: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    referralCode: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'referral_code'
    },
    description: {
      type: DataTypes.TEXT
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    }
  },
  {
    tableName: 'groups',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Action Logs
export const ActionLog = sequelize.define(
  'ActionLog',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    adminId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'admin_id'
    },
    object: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    action: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    ip: {
      type: DataTypes.STRING(255)
    },
    before: {
      type: DataTypes.JSON
    },
    after: {
      type: DataTypes.JSON
    },
    description: {
      type: DataTypes.STRING(255)
    }
  },
  {
    tableName: 'action_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

// Rank Levels
export const RankLevel = sequelize.define(
  'RankLevel',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    percent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    pointsRequired: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'points_required'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active'
    }
  },
  {
    tableName: 'rank_levels',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Collaborators
export const Collaborator = sequelize.define(
  'Collaborator',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    code: {
      type: DataTypes.STRING(255)
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    emailVerifiedAt: {
      type: DataTypes.DATE,
      field: 'email_verified_at'
    },
    emailVerificationTokenHash: {
      type: DataTypes.STRING(128),
      field: 'email_verification_token_hash'
    },
    emailVerificationExpiresAt: {
      type: DataTypes.DATE,
      field: 'email_verification_expires_at'
    },
    emailVerificationSentAt: {
      type: DataTypes.DATE,
      field: 'email_verification_sent_at'
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING(255)
    },
    country: {
      type: DataTypes.STRING(255)
    },
    postCode: {
      type: DataTypes.STRING(255),
      field: 'post_code'
    },
    address: {
      type: DataTypes.TEXT
    },
    organizationType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'individual',
      field: 'organization_type'
    },
    companyName: {
      type: DataTypes.STRING(255),
      field: 'company_name'
    },
    taxCode: {
      type: DataTypes.STRING(255),
      field: 'tax_code'
    },
    website: {
      type: DataTypes.STRING(255)
    },
    businessAddress: {
      type: DataTypes.TEXT,
      field: 'business_address'
    },
    businessLicense: {
      type: DataTypes.STRING(255),
      field: 'business_license'
    },
    avatar: {
      type: DataTypes.STRING(255)
    },
    birthday: {
      type: DataTypes.DATEONLY
    },
    gender: {
      type: DataTypes.TINYINT
    },
    facebook: {
      type: DataTypes.STRING(255)
    },
    zalo: {
      type: DataTypes.STRING(255)
    },
    bankName: {
      type: DataTypes.STRING(255),
      field: 'bank_name'
    },
    bankAccount: {
      type: DataTypes.STRING(255),
      field: 'bank_account'
    },
    bankAccountName: {
      type: DataTypes.STRING(255),
      field: 'bank_account_name'
    },
    bankBranch: {
      type: DataTypes.STRING(255),
      field: 'bank_branch'
    },
    organizationLink: {
      type: DataTypes.STRING(255),
      field: 'organization_link'
    },
    points: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    rankLevelId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'rank_level_id',
      defaultValue: 1
    },
    description: {
      type: DataTypes.TEXT
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    approvedAt: {
      type: DataTypes.DATE,
      field: 'approved_at'
    },
    groupId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'group_id'
    },
    rememberToken: {
      type: DataTypes.STRING(100),
      field: 'remember_token'
    }
  },
  {
    tableName: 'collaborators',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Applicants
export const Applicant = sequelize.define(
  'Applicant',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING(255)
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    rememberToken: {
      type: DataTypes.STRING(100),
      field: 'remember_token'
    }
  },
  {
    tableName: 'applicants',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Companies
export const Company = sequelize.define(
  'Company',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255)
    },
    nameEn: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'name_en'
    },
    nameJp: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'name_jp'
    },
    logo: {
      type: DataTypes.STRING(255)
    },
    companyCode: {
      type: DataTypes.STRING(255),
      field: 'company_code'
    },
    type: {
      type: DataTypes.STRING(255)
    },
    address: {
      type: DataTypes.STRING(255)
    },
    phone: {
      type: DataTypes.STRING(255)
    },
    email: {
      type: DataTypes.STRING(255)
    },
    website: {
      type: DataTypes.STRING(255)
    },
    description: {
      type: DataTypes.TEXT
    },
    status: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  },
  {
    tableName: 'companies',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

// Company Business Fields
export const CompanyBusinessField = sequelize.define(
  'CompanyBusinessField',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    companyId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'id_company'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  },
  {
    tableName: 'company_business_fields',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Company Email Addresses
export const CompanyEmailAddress = sequelize.define(
  'CompanyEmailAddress',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    companyId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'company_id'
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false
    }
  },
  {
    tableName: 'company_email_addresses',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Company Offices
export const CompanyOffice = sequelize.define(
  'CompanyOffice',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    companyId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'id_company'
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    isHeadOffice: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_head_office'
    }
  },
  {
    tableName: 'company_offices',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Job Categories
export const JobCategory = sequelize.define(
  'JobCategory',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    nameEn: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'name_en'
    },
    nameJp: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'name_jp'
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    descriptionEn: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'description_en'
    },
    descriptionJp: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'description_jp'
    },
    parentId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'parent_id'
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    }
  },
  {
    tableName: 'job_categories',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Jobs
export const Job = sequelize.define(
  'Job',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at'
    },
    jobCode: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'job_code'
    },
    jobCategoryId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'job_category_id'
    },
    // Lĩnh vực (business sector key) được chọn trên form AdminAddJobPage
    businessSectorKey: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'business_sector_key'
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    titleEn: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'title_en'
    },
    titleJp: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'title_jp'
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    descriptionEn: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'description_en'
    },
    descriptionJp: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'description_jp'
    },
    instruction: {
      type: DataTypes.TEXT
    },
    instructionEn: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'instruction_en'
    },
    instructionJp: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'instruction_jp'
    },
    recruitmentReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'recruitment_reason'
    },
    recruitmentReasonEn: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'recruitment_reason_en'
    },
    recruitmentReasonJp: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'recruitment_reason_jp'
    },
    highlights: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Điểm nổi bật (nhập tay, nhiều dòng)'
    },
    interviewLocation: {
      type: DataTypes.TINYINT,
      field: 'interview_location',
      comment:
        'Địa điểm tuyển dụng (UI): 1=Từ VN, 2=Từ JP, 3=Tại JP và nước ngoài, 4=Từ nước ngoài',
    },
    numberOfHires: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'number_of_hires',
      comment: 'Số lượng tuyển dụng (VI)'
    },
    numberOfHiresEn: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'number_of_hires_en',
      comment: 'Số lượng tuyển dụng (EN)'
    },
    numberOfHiresJp: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'number_of_hires_jp',
      comment: 'Số lượng tuyển dụng (JP)'
    },
    bonus: {
      type: DataTypes.TEXT
    },
    bonusEn: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'bonus_en'
    },
    bonusJp: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'bonus_jp'
    },
    salaryReview: {
      type: DataTypes.TEXT,
      field: 'salary_review'
    },
    salaryReviewEn: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'salary_review_en'
    },
    salaryReviewJp: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'salary_review_jp'
    },
    holidays: {
      type: DataTypes.TEXT
    },
    holidaysEn: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'holidays_en'
    },
    holidaysJp: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'holidays_jp'
    },
    holidayDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'holiday_details',
      comment: 'Chi tiết ngày nghỉ (VI)'
    },
    holidayDetailsEn: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'holiday_details_en'
    },
    holidayDetailsJp: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'holiday_details_jp'
    },
    socialInsurance: {
      type: DataTypes.TEXT,
      field: 'social_insurance'
    },
    socialInsuranceEn: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'social_insurance_en'
    },
    socialInsuranceJp: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'social_insurance_jp'
    },
    transportation: {
      type: DataTypes.TEXT
    },
    transportationEn: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'transportation_en'
    },
    transportationJp: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'transportation_jp'
    },
    breakTime: {
      type: DataTypes.TEXT,
      field: 'break_time'
    },
    breakTimeEn: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'break_time_en'
    },
    breakTimeJp: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'break_time_jp'
    },
    overtime: {
      type: DataTypes.TEXT
    },
    overtimeEn: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'overtime_en'
    },
    overtimeJp: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'overtime_jp'
    },
    recruitmentType: {
      type: DataTypes.TINYINT,
      field: 'recruitment_type'
    },
    residenceStatus: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'residence_status'
    },
    residenceStatusEn: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'residence_status_en'
    },
    residenceStatusJp: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'residence_status_jp'
    },
    contractPeriod: {
      type: DataTypes.TEXT,
      field: 'contract_period'
    },
    contractPeriodEn: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'contract_period_en'
    },
    contractPeriodJp: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'contract_period_jp'
    },
    probationPeriod: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'probation_period'
    },
    probationPeriodEn: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'probation_period_en'
    },
    probationPeriodJp: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'probation_period_jp'
    },
    probationDetail: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'probation_detail'
    },
    probationDetailEn: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'probation_detail_en'
    },
    probationDetailJp: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'probation_detail_jp'
    },
    companyId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'company_id'
    },
    recruitmentProcess: {
      type: DataTypes.TEXT,
      field: 'recruitment_process'
    },
    recruitmentProcessEn: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'recruitment_process_en'
    },
    recruitmentProcessJp: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'recruitment_process_jp'
    },
    transferAbility: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'transfer_ability'
    },
    transferAbilityEn: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'transfer_ability_en'
    },
    transferAbilityJp: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'transfer_ability_jp'
    },
    viewsCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'views_count'
    },
    deadline: {
      type: DataTypes.DATEONLY
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    isPinned: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_pinned'
    },
    jdFile: {
      type: DataTypes.STRING(255),
      field: 'jd_file'
    },
    jdOriginalFilename: {
      type: DataTypes.STRING(255),
      field: 'jd_original_filename'
    },
    jdOriginalFile: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'jd_original_file'
    },
    jdFileEn: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'jd_file_en'
    },
    jdFileJp: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'jd_file_jp'
    },
    isHot: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_hot'
    },
    jobCommissionType: {
      type: DataTypes.ENUM('fixed', 'percent'),
      field: 'job_commission_type'
    },
    requiredCvForm: {
      type: DataTypes.STRING(255),
      field: 'required_cv_form'
    },
    requiredCvFormOriginalFilename: {
      type: DataTypes.STRING(255),
      field: 'required_cv_form_original_filename'
    },
    // Multi-language fields (EN)
    titleEn: {
      type: DataTypes.STRING(255),
      field: 'title_en'
    },
    descriptionEn: {
      type: DataTypes.TEXT,
      field: 'description_en'
    },
    instructionEn: {
      type: DataTypes.TEXT,
      field: 'instruction_en'
    },
    bonusEn: {
      type: DataTypes.TEXT,
      field: 'bonus_en'
    },
    salaryReviewEn: {
      type: DataTypes.TEXT,
      field: 'salary_review_en'
    },
    holidaysEn: {
      type: DataTypes.TEXT,
      field: 'holidays_en'
    },
    socialInsuranceEn: {
      type: DataTypes.TEXT,
      field: 'social_insurance_en'
    },
    transportationEn: {
      type: DataTypes.TEXT,
      field: 'transportation_en'
    },
    breakTimeEn: {
      type: DataTypes.TEXT,
      field: 'break_time_en'
    },
    overtimeEn: {
      type: DataTypes.TEXT,
      field: 'overtime_en'
    },
    contractPeriodEn: {
      type: DataTypes.TEXT,
      field: 'contract_period_en'
    },
    recruitmentProcessEn: {
      type: DataTypes.TEXT,
      field: 'recruitment_process_en'
    },
    // Multi-language fields (JP)
    titleJp: {
      type: DataTypes.STRING(255),
      field: 'title_jp'
    },
    descriptionJp: {
      type: DataTypes.TEXT,
      field: 'description_jp'
    },
    instructionJp: {
      type: DataTypes.TEXT,
      field: 'instruction_jp'
    },
    bonusJp: {
      type: DataTypes.TEXT,
      field: 'bonus_jp'
    },
    salaryReviewJp: {
      type: DataTypes.TEXT,
      field: 'salary_review_jp'
    },
    holidaysJp: {
      type: DataTypes.TEXT,
      field: 'holidays_jp'
    },
    socialInsuranceJp: {
      type: DataTypes.TEXT,
      field: 'social_insurance_jp'
    },
    transportationJp: {
      type: DataTypes.TEXT,
      field: 'transportation_jp'
    },
    breakTimeJp: {
      type: DataTypes.TEXT,
      field: 'break_time_jp'
    },
    overtimeJp: {
      type: DataTypes.TEXT,
      field: 'overtime_jp'
    },
    contractPeriodJp: {
      type: DataTypes.TEXT,
      field: 'contract_period_jp'
    },
    recruitmentProcessJp: {
      type: DataTypes.TEXT,
      field: 'recruitment_process_jp'
    }
    ,
    // Admin advise (multi-language)
    adminAdviseVi: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'admin_advise_vi'
    },
    adminAdviseEn: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'admin_advise_en'
    },
    adminAdviseJp: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'admin_advise_jp'
    }
  },
  {
    tableName: 'jobs',
    timestamps: true,
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Job Applications
export const JobApplication = sequelize.define(
  'JobApplication',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    jobId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'job_id'
    },
    collaboratorId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'collaborator_id'
    },
    adminId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'admin_id'
    },
    applicantId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'applicant_id',
      comment: 'Ứng viên (landing) khi đơn do ứng viên tự gửi'
    },
    adminResponsibleId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'admin_responsible_id'
    },
    title: {
      type: DataTypes.TEXT
    },
    status: {
      type: DataTypes.INTEGER
    },
    cvId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'cv_id'
    },
    cvCode: {
      type: DataTypes.STRING(255),
      field: 'cv_code'
    },
    cvPath: {
      type: DataTypes.STRING(1024),
      field: 'cv_path'
    },
    monthlySalary: {
      type: DataTypes.DECIMAL(15, 2),
      field: 'monthly_salary'
    },
    yearlySalary: {
      type: DataTypes.DECIMAL(15, 2),
      field: 'yearly_salary'
    },
    appliedAt: {
      type: DataTypes.DATE,
      field: 'applied_at'
    },
    interviewDate: {
      type: DataTypes.DATE,
      field: 'interview_date'
    },
    interviewRound2Date: {
      type: DataTypes.DATE,
      field: 'interview_round2_date'
    },
    nyushaDate: {
      type: DataTypes.DATEONLY,
      field: 'nyusha_date'
    },
    expectedPaymentDate: {
      type: DataTypes.DATEONLY,
      field: 'expected_payment_date'
    },
    assignmentNote: {
      type: DataTypes.TEXT,
      field: 'assignment_note'
    },
    memo: {
      type: DataTypes.TEXT,
      field: 'memo'
    },
    rejectNote: {
      type: DataTypes.TEXT,
      field: 'reject_note'
    }
  },
  {
    tableName: 'job_applications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Payment Requests
export const PaymentRequest = sequelize.define(
  'PaymentRequest',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    collaboratorId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'collaborator_id'
    },
    jobApplicationId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'job_application_id'
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0
    },
    note: {
      type: DataTypes.TEXT
    },
    approvedAt: {
      type: DataTypes.DATE,
      field: 'approved_at'
    },
    rejectedAt: {
      type: DataTypes.DATE,
      field: 'rejected_at'
    },
    rejectedReason: {
      type: DataTypes.TEXT,
      field: 'rejected_reason'
    },
    filePath: {
      type: DataTypes.STRING(255),
      field: 'file_path'
    }
  },
  {
    tableName: 'payment_requests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Posts
export const Post = sequelize.define(
  'Post',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    image: {
      type: DataTypes.STRING(255)
    },
    thumbnail: {
      type: DataTypes.STRING(255)
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    type: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    /** Bitmask: 1=agent CTV home, 2=public CTV landing, 4=public candidate landing */
    visibilityMask: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 7,
      field: 'visibility_mask'
    },
    categoryId: {
      type: DataTypes.STRING(255),
      field: 'category_id'
    },
    authorId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'author_id'
    },
    viewCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'view_count'
    },
    likeCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'like_count'
    },
    tag: {
      type: DataTypes.STRING(255)
    },
    metaTitle: {
      type: DataTypes.STRING(255),
      field: 'meta_title'
    },
    metaDescription: {
      type: DataTypes.STRING(255),
      field: 'meta_description'
    },
    metaKeywords: {
      type: DataTypes.STRING(255),
      field: 'meta_keywords'
    },
    metaImage: {
      type: DataTypes.STRING(255),
      field: 'meta_image'
    },
    metaUrl: {
      type: DataTypes.STRING(255),
      field: 'meta_url'
    },
    publishedAt: {
      type: DataTypes.DATE,
      field: 'published_at'
    },
    titleEn: {
      type: DataTypes.STRING(255),
      field: 'title_en'
    },
    titleJp: {
      type: DataTypes.STRING(255),
      field: 'title_jp'
    },
    contentEn: {
      type: DataTypes.TEXT,
      field: 'content_en'
    },
    contentJp: {
      type: DataTypes.TEXT,
      field: 'content_jp'
    },
    metaTitleEn: {
      type: DataTypes.STRING(255),
      field: 'meta_title_en'
    },
    metaTitleJp: {
      type: DataTypes.STRING(255),
      field: 'meta_title_jp'
    },
    metaDescriptionEn: {
      type: DataTypes.STRING(255),
      field: 'meta_description_en'
    },
    metaDescriptionJp: {
      type: DataTypes.STRING(255),
      field: 'meta_description_jp'
    }
  },
  {
    tableName: 'posts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Events (sự kiện)
export const Event = sequelize.define(
  'Event',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    startAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'start_at'
    },
    endAt: {
      type: DataTypes.DATE,
      field: 'end_at'
    },
    location: {
      type: DataTypes.STRING(255)
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    createdBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'created_by'
    }
  },
  {
    tableName: 'events',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Event Participants (người tham gia sự kiện)
export const EventParticipant = sequelize.define(
  'EventParticipant',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    eventId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'event_id'
    },
    adminId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'admin_id'
    },
    collaboratorId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'collaborator_id'
    },
    email: {
      type: DataTypes.STRING(255)
    },
    name: {
      type: DataTypes.STRING(255)
    },
    phone: {
      type: DataTypes.STRING(50)
    },
    isInternal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_internal'
    }
  },
  {
    tableName: 'event_participants',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Posts – Event (junction: bài viết gắn sự kiện)
export const PostEvent = sequelize.define(
  'PostEvent',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    postId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'post_id'
    },
    eventId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'event_id'
    }
  },
  {
    tableName: 'posts_event',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

// Posts – Campaign (junction: bài viết gắn chiến dịch)
export const PostCampaign = sequelize.define(
  'PostCampaign',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    postId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'post_id'
    },
    campaignId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'campaign_id'
    }
  },
  {
    tableName: 'posts_campaign',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

// Categories (CMS)
export const Category = sequelize.define(
  'Category',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    color: {
      type: DataTypes.STRING(7),
      allowNull: false,
      defaultValue: '#007bff'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active'
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'sort_order'
    },
    showInDashboard: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'show_in_dashboard'
    }
  },
  {
    tableName: 'categories',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// FAQs
export const FAQ = sequelize.define(
  'FAQ',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    question: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    answer: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    }
  },
  {
    tableName: 'faqs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

// Collaborator Notifications
export const CollaboratorNotification = sequelize.define(
  'CollaboratorNotification',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    collaboratorId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'collaborator_id'
    },
    adminId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'admin_id'
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    jobId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'job_id'
    },
    url: {
      type: DataTypes.STRING(255)
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_read'
    }
  },
  {
    tableName: 'collaborator_notifications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

// Campaigns
export const Campaign = sequelize.define(
  'Campaign',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    nameEn: { type: DataTypes.STRING(255), field: 'name_en' },
    nameJp: { type: DataTypes.STRING(255), field: 'name_jp' },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    descriptionEn: { type: DataTypes.TEXT, field: 'description_en' },
    descriptionJp: { type: DataTypes.TEXT, field: 'description_jp' },
    coverUrl: {
      type: DataTypes.STRING(512),
      allowNull: true,
      field: 'cover_url'
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'start_date'
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'end_date'
    },
    maxCv: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'max_cv'
    },
    percent: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0
    }
  },
  {
    tableName: 'campaigns',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Campaign Applications
export const CampaignApplication = sequelize.define(
  'CampaignApplication',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    campaignId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'campaign_id'
    },
    collaboratorId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'collaborator_id'
    },
    jobId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'job_id'
    },
    coverLetter: {
      type: DataTypes.TEXT,
      field: 'cover_letter'
    },
    cvFile: {
      type: DataTypes.STRING(255),
      field: 'cv_file'
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0
    },
    notes: {
      type: DataTypes.TEXT
    },
    appliedAt: {
      type: DataTypes.DATE,
      field: 'applied_at'
    }
  },
  {
    tableName: 'campaign_applications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// CV Storages (kho CV)
export const CVStorage = sequelize.define(
  'CVStorage',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    collaboratorId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'collaborator_id'
    },
    applicantId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'applicant_id'
    },
    adminId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'admin_id'
    },
    jobCategoryId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'job_category_id'
    },
    code: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    furigana: {
      type: DataTypes.STRING(255)
    },
    name: {
      type: DataTypes.STRING(255)
    },
    email: {
      type: DataTypes.STRING(255)
    },
    phone: {
      type: DataTypes.STRING(255)
    },
    birthDate: {
      type: DataTypes.DATEONLY,
      field: 'birth_date'
    },
    gender: {
      type: DataTypes.TINYINT
    },
    ages: {
      type: DataTypes.STRING(255)
    },
    addressOrigin: {
      type: DataTypes.STRING(255),
      field: 'address_origin'
    },
    passport: {
      type: DataTypes.TINYINT
    },
    currentResidence: {
      type: DataTypes.TINYINT,
      field: 'current_residence'
    },
    jpResidenceStatus: {
      type: DataTypes.TINYINT,
      field: 'jp_residence_status'
    },
    visaExpirationDate: {
      type: DataTypes.DATE,
      field: 'visa_expiration_date'
    },
    otherCountry: {
      type: DataTypes.STRING(255),
      field: 'other_country'
    },
    addressCurrent: {
      type: DataTypes.STRING(255),
      field: 'address_current'
    },
    postalCode: {
      type: DataTypes.STRING(20),
      field: 'postal_code'
    },
    spouse: {
      type: DataTypes.TINYINT
    },
    currentIncome: {
      type: DataTypes.INTEGER,
      field: 'current_income'
    },
    desiredIncome: {
      type: DataTypes.INTEGER,
      field: 'desired_income'
    },
    desiredWorkLocation: {
      type: DataTypes.STRING(255),
      field: 'desired_work_location'
    },
    desiredPosition: {
      type: DataTypes.STRING(255),
      field: 'desired_position'
    },
    nyushaTime: {
      type: DataTypes.STRING(255),
      field: 'nyusha_time'
    },
    interviewTime: {
      type: DataTypes.STRING(255),
      field: 'interview_time'
    },
    learnedTools: {
      type: DataTypes.JSON,
      field: 'learned_tools'
    },
    experienceTools: {
      type: DataTypes.JSON,
      field: 'experience_tools'
    },
    jlptLevel: {
      type: DataTypes.TINYINT,
      field: 'jlpt_level'
    },
    experienceYears: {
      type: DataTypes.TINYINT,
      field: 'experience_years'
    },
    specialization: {
      type: DataTypes.TINYINT
    },
    qualification: {
      type: DataTypes.TINYINT
    },
    educations: {
      type: DataTypes.JSON
    },
    workExperiences: {
      type: DataTypes.JSON,
      field: 'work_experiences'
    },
    technicalSkills: {
      type: DataTypes.TEXT,
      field: 'technical_skills'
    },
    certificates: {
      type: DataTypes.JSON
    },
    careerSummary: {
      type: DataTypes.TEXT,
      field: 'career_summary'
    },
    strengths: {
      type: DataTypes.TEXT
    },
    motivation: {
      type: DataTypes.TEXT
    },
    otherDocuments: {
      type: DataTypes.STRING(255),
      field: 'other_documents'
    },
    curriculumVitae: {
      type: DataTypes.STRING(255),
      field: 'curriculum_vitae'
    },
    cvOriginalPath: {
      type: DataTypes.STRING(255),
      field: 'cv_original_path'
    },
    cvCareerHistoryPath: {
      type: DataTypes.STRING(255),
      field: 'cv_career_history_path'
    },
    /** Ảnh chân dung — cùng snapshot với CV_original / CV_Template (S3 key hoặc path local) */
    avatarPhotoPath: {
      type: DataTypes.STRING(512),
      allowNull: true,
      field: 'avatar_photo_path'
    },
    notes: {
      type: DataTypes.TEXT
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    isDuplicate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_duplicate'
    },
    duplicateWithCvId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'duplicate_with_cv_id'
    },
    isParse: {
      type: DataTypes.BOOLEAN,
      field: 'is_parse',
      allowNull: false,
      defaultValue: false
    },
    lastTimeParsed: {
      type: DataTypes.BOOLEAN,
      field: 'last_time_parsed',
      allowNull: false,
      defaultValue: false
    },
    completionState: {
      type: DataTypes.STRING(50),
      field: 'completion_state',
      allowNull: false,
      defaultValue: 'ready_for_parse'
    },
    vectorSyncStatus: {
      type: DataTypes.STRING(30),
      field: 'vector_sync_status',
      allowNull: false,
      defaultValue: 'pending'
    },
    vectorSyncRequestedAt: {
      type: DataTypes.DATE,
      field: 'vector_sync_requested_at',
      allowNull: true
    },
    vectorSyncCompletedAt: {
      type: DataTypes.DATE,
      field: 'vector_sync_completed_at',
      allowNull: true
    },
    vectorSyncLastError: {
      type: DataTypes.TEXT,
      field: 'vector_sync_last_error',
      allowNull: true
    },
    vectorSyncRetryCount: {
      type: DataTypes.INTEGER.UNSIGNED,
      field: 'vector_sync_retry_count',
      allowNull: false,
      defaultValue: 0
    },
    /** Bố cục cột/hàng bảng CV (preview/PDF) — map key -> { cols: number[], rows?: Record<index, px> } */
    cvTableLayout: {
      type: DataTypes.JSON,
      field: 'cv_table_layout',
      allowNull: true
    },
    /** Admin gửi yêu cầu bổ sung — lưu id admin cần nhận thông báo khi CTV cập nhật (BIGINT) */
    adminNote: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'admin_note',
      allowNull: true
    },
    /** Các vùng đánh dấu (fieldKey, start, end, id, …) */
    adminSupplementMarks: {
      type: DataTypes.JSON,
      field: 'admin_supplement_marks',
      allowNull: true
    }
  },
  {
    tableName: 'cv_storages',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Mail Settings
export const MailSetting = sequelize.define(
  'MailSetting',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    type: {
      type: DataTypes.TINYINT,
      allowNull: false
    },
    note: {
      type: DataTypes.STRING(255)
    }
  },
  {
    tableName: 'mail_settings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

// Email Templates
export const EmailTemplate = sequelize.define(
  'EmailTemplate',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    subject: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    type: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active'
    },
    description: {
      type: DataTypes.TEXT
    },
    createdBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'created_by'
    }
  },
  {
    tableName: 'email_templates',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Email Newsletters
export const EmailNewsletter = sequelize.define(
  'EmailNewsletter',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    subject: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    sentAt: {
      type: DataTypes.DATE,
      field: 'sent_at'
    },
    scheduledAt: {
      type: DataTypes.DATE,
      field: 'scheduled_at'
    },
    createdBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'created_by'
    },
    recipients: {
      type: DataTypes.JSON
    },
    recipientsCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'recipients_count'
    },
    notes: {
      type: DataTypes.TEXT
    },
    type: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    groupId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'group_id'
    },
    fileAttachment: {
      type: DataTypes.STRING(255),
      field: 'file_attachment'
    },
    fileAttachmentOriginalName: {
      type: DataTypes.STRING(255),
      field: 'file_attachment_original_name'
    }
  },
  {
    tableName: 'email_newsletters',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Email To Collaborator
export const EmailToCollaborator = sequelize.define(
  'EmailToCollaborator',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    collaboratorId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'collaborator_id'
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    subject: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    recipients: {
      type: DataTypes.JSON
    },
    recipientsDetail: {
      type: DataTypes.JSON,
      field: 'recipients_detail'
    },
    recipientType: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'specific',
      field: 'recipient_type'
    },
    attachments: {
      type: DataTypes.JSON
    },
    status: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'draft'
    },
    sentAt: {
      type: DataTypes.DATE,
      field: 'sent_at'
    },
    recipientsCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'recipients_count'
    },
    fileAttachmentPath: {
      type: DataTypes.STRING(255),
      field: 'file_attachment_path'
    },
    fileAttachmentOriginalName: {
      type: DataTypes.STRING(255),
      field: 'file_attachment_original_name'
    },
    createdBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'created_by'
    }
  },
  {
    tableName: 'email_to_collaborator',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Email To Company
export const EmailToCompany = sequelize.define(
  'EmailToCompany',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    emailCompanyId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'email_company_id'
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    subject: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    recipients: {
      type: DataTypes.JSON
    },
    recipientsDetail: {
      type: DataTypes.JSON,
      field: 'recipients_detail'
    },
    recipientType: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'specific',
      field: 'recipient_type'
    },
    attachments: {
      type: DataTypes.JSON
    },
    status: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'draft'
    },
    sentAt: {
      type: DataTypes.DATE,
      field: 'sent_at'
    },
    recipientsCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'recipients_count'
    },
    fileAttachmentPath: {
      type: DataTypes.STRING(255),
      field: 'file_attachment_path'
    },
    fileAttachmentOriginalName: {
      type: DataTypes.STRING(255),
      field: 'file_attachment_original_name'
    },
    createdBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'created_by'
    }
  },
  {
    tableName: 'email_to_companies',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Email To Group
export const EmailToGroup = sequelize.define(
  'EmailToGroup',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    groupId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'group_id'
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    subject: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    recipients: {
      type: DataTypes.JSON
    },
    recipientsDetail: {
      type: DataTypes.JSON,
      field: 'recipients_detail'
    },
    recipientType: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'specific',
      field: 'recipient_type'
    },
    attachments: {
      type: DataTypes.JSON
    },
    status: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'draft'
    },
    sentAt: {
      type: DataTypes.DATE,
      field: 'sent_at'
    },
    recipientsCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'recipients_count'
    },
    fileAttachmentPath: {
      type: DataTypes.STRING(255),
      field: 'file_attachment_path'
    },
    fileAttachmentOriginalName: {
      type: DataTypes.STRING(255),
      field: 'file_attachment_original_name'
    },
    createdBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'created_by'
    }
  },
  {
    tableName: 'email_to_group',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Home Setting Jobs
export const HomeSettingJob = sequelize.define(
  'HomeSettingJob',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    postId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'post_id'
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    color: {
      type: DataTypes.STRING(20)
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    thumbnail: {
      type: DataTypes.STRING(255)
    },
    description: {
      type: DataTypes.TEXT
    },
    requirement: {
      type: DataTypes.STRING(255)
    },
    salary: {
      type: DataTypes.INTEGER
    },
    salaryUnit: {
      type: DataTypes.STRING(255),
      field: 'salary_unit'
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0
    },
    popup: {
      type: DataTypes.TEXT
    }
  },
  {
    tableName: 'home_setting_jobs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

// Home Setting Partners
export const HomeSettingPartner = sequelize.define(
  'HomeSettingPartner',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    url: {
      type: DataTypes.STRING(255)
    },
    logo: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0
    }
  },
  {
    tableName: 'home_setting_partners',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

// Job Pickups
export const JobPickup = sequelize.define(
  'JobPickup',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    nameEn: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'name_en'
    },
    nameJp: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'name_jp'
    },
    coverUrl: {
      type: DataTypes.STRING(512),
      allowNull: true,
      field: 'cover_url'
    }
  },
  {
    tableName: 'job_pickups',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Job Pickups Id (mapping job_pickups - jobs)
export const JobPickupId = sequelize.define(
  'JobPickupId',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    jobPickupId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'id_job_pickups'
    },
    jobId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'id_job'
    }
  },
  {
    tableName: 'job_pickups_id',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Job Campaigns (mapping campaigns - jobs)
export const JobCampaign = sequelize.define(
  'JobCampaign',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    campaignId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'campaign_id'
    },
    jobId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'job_id'
    }
  },
  {
    tableName: 'job_campaigns',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Working Locations
export const WorkingLocation = sequelize.define(
  'WorkingLocation',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    jobId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'job_id'
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    country: {
      type: DataTypes.STRING(255)
    },
    locationEn: { type: DataTypes.STRING(255), field: 'location_en' },
    countryEn: { type: DataTypes.STRING(255), field: 'country_en' },
    locationJp: { type: DataTypes.STRING(255), field: 'location_jp' },
    countryJp: { type: DataTypes.STRING(255), field: 'country_jp' }
  },
  {
    tableName: 'working_locations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Salary Ranges
export const SalaryRange = sequelize.define(
  'SalaryRange',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    jobId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'job_id'
    },
    salaryRange: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'salary_range'
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    salaryRangeEn: { type: DataTypes.STRING(255), field: 'salary_range_en' },
    typeEn: { type: DataTypes.STRING(50), field: 'type_en' },
    salaryRangeJp: { type: DataTypes.STRING(255), field: 'salary_range_jp' },
    typeJp: { type: DataTypes.STRING(50), field: 'type_jp' }
  },
  {
    tableName: 'salary_ranges',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Salary Range Details
export const SalaryRangeDetail = sequelize.define(
  'SalaryRangeDetail',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    jobId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'job_id'
    },
    content: {
      type: DataTypes.TEXT
    },
    contentEn: { type: DataTypes.TEXT, field: 'content_en' },
    contentJp: { type: DataTypes.TEXT, field: 'content_jp' }
  },
  {
    tableName: 'salary_range_details',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Overtime Allowances
export const OvertimeAllowance = sequelize.define(
  'OvertimeAllowance',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    jobId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'job_id'
    },
    overtimeAllowanceRange: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'overtime_allowance_range'
    },
    overtimeAllowanceRangeEn: { type: DataTypes.STRING(255), field: 'overtime_allowance_range_en' },
    overtimeAllowanceRangeJp: { type: DataTypes.STRING(255), field: 'overtime_allowance_range_jp' }
  },
  {
    tableName: 'overtime_allowances',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Overtime Allowance Details
export const OvertimeAllowanceDetail = sequelize.define(
  'OvertimeAllowanceDetail',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    jobId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'job_id'
    },
    content: {
      type: DataTypes.TEXT
    },
    contentEn: { type: DataTypes.TEXT, field: 'content_en' },
    contentJp: { type: DataTypes.TEXT, field: 'content_jp' }
  },
  {
    tableName: 'overtime_allowance_details',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Benefits
export const Benefit = sequelize.define(
  'Benefit',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    jobId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'job_id'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    contentEn: { type: DataTypes.TEXT, field: 'content_en' },
    contentJp: { type: DataTypes.TEXT, field: 'content_jp' }
  },
  {
    tableName: 'benefits',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Requirements
export const Requirement = sequelize.define(
  'Requirement',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    jobId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'job_id'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    contentEn: { type: DataTypes.TEXT, field: 'content_en' },
    typeEn: { type: DataTypes.STRING(50), field: 'type_en' },
    statusEn: { type: DataTypes.STRING(50), field: 'status_en' },
    contentJp: { type: DataTypes.TEXT, field: 'content_jp' },
    typeJp: { type: DataTypes.STRING(50), field: 'type_jp' },
    statusJp: { type: DataTypes.STRING(50), field: 'status_jp' }
  },
  {
    tableName: 'requirements',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Smoking Policies
export const SmokingPolicy = sequelize.define(
  'SmokingPolicy',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    jobId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'job_id'
    },
    allow: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    }
  },
  {
    tableName: 'smoking_policies',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Smoking Policy Details
export const SmokingPolicyDetail = sequelize.define(
  'SmokingPolicyDetail',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    jobId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'job_id'
    },
    content: {
      type: DataTypes.TEXT
    },
    contentEn: { type: DataTypes.TEXT, field: 'content_en' },
    contentJp: { type: DataTypes.TEXT, field: 'content_jp' }
  },
  {
    tableName: 'smoking_policy_details',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Working Hours
export const WorkingHour = sequelize.define(
  'WorkingHour',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    jobId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'job_id'
    },
    workingHours: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'working_hours'
    },
    workingHoursEn: { type: DataTypes.STRING(255), field: 'working_hours_en' },
    workingHoursJp: { type: DataTypes.STRING(255), field: 'working_hours_jp' }
  },
  {
    tableName: 'working_hours',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Working Hours Details
export const WorkingHourDetail = sequelize.define(
  'WorkingHourDetail',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    jobId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'job_id'
    },
    content: {
      type: DataTypes.TEXT
    },
    contentEn: { type: DataTypes.TEXT, field: 'content_en' },
    contentJp: { type: DataTypes.TEXT, field: 'content_jp' }
  },
  {
    tableName: 'working_hours_details',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Working Location Details
export const WorkingLocationDetail = sequelize.define(
  'WorkingLocationDetail',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    jobId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'job_id'
    },
    content: {
      type: DataTypes.TEXT
    },
    contentEn: { type: DataTypes.TEXT, field: 'content_en' },
    contentJp: { type: DataTypes.TEXT, field: 'content_jp' }
  },
  {
    tableName: 'working_location_details',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Types (Settings for job attributes)
export const Type = sequelize.define(
  'Type',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    typename: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'typename'
    },
    cvField: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'cv_field',
      comment: 'Tên field trong CV để so sánh (ví dụ: jlptLevel, experienceYears, specialization, qualification)'
    },
    typenameEn: { type: DataTypes.STRING(255), allowNull: true, field: 'typename_en' },
    typenameJp: { type: DataTypes.STRING(255), allowNull: true, field: 'typename_jp' }
  },
  {
    tableName: 'types',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Values (Values for types)
export const Value = sequelize.define(
  'Value',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    typeId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'id_typename'
    },
    valuename: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'valuename'
    },
    comparisonOperator: {
      type: DataTypes.STRING(10),
      allowNull: true,
      field: 'comparison_operator',
      comment: 'Toán tử so sánh: >=, <=, >, <, =, between'
    },
    comparisonValue: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'comparison_value',
      comment: 'Giá trị để so sánh (ví dụ: 3 cho N3, 3 cho 3 năm)'
    },
    comparisonValueEnd: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'comparison_value_end',
      comment: 'Giá trị kết thúc cho between (ví dụ: 5 cho "từ 2 đến 5")'
    },
    valuenameEn: { type: DataTypes.STRING(255), field: 'valuename_en' },
    comparisonOperatorEn: { type: DataTypes.STRING(10), field: 'comparison_operator_en' },
    comparisonValueEn: { type: DataTypes.STRING(255), field: 'comparison_value_en' },
    comparisonValueEndEn: { type: DataTypes.STRING(255), field: 'comparison_value_end_en' },
    valuenameJp: { type: DataTypes.STRING(255), field: 'valuename_jp' },
    comparisonOperatorJp: { type: DataTypes.STRING(10), field: 'comparison_operator_jp' },
    comparisonValueJp: { type: DataTypes.STRING(255), field: 'comparison_value_jp' },
    comparisonValueEndJp: { type: DataTypes.STRING(255), field: 'comparison_value_end_jp' }
  },
  {
    tableName: 'values',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Job Values (Mapping jobs with values)
export const JobValue = sequelize.define(
  'JobValue',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    jobId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'job_id'
    },
    typeId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'id_typename'
    },
    valueId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'id_value'
    },
    value: {
      type: DataTypes.STRING(255)
    },
    isRequired: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_required'
    },
    viewOnCollaborator: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
      field: 'view_on_collaborator'
    }
  },
  {
    tableName: 'job_values',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Calendars (Lịch hẹn)
export const Calendar = sequelize.define(
  'Calendar',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    jobApplicationId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'job_application_id'
    },
    adminId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'admin_id'
    },
    collaboratorId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'collaborator_id'
    },
    eventType: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
      field: 'event_type'
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    startAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'start_at'
    },
    endAt: {
      type: DataTypes.DATE,
      field: 'end_at'
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0
    }
  },
  {
    tableName: 'calendars',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Messages (Tin nhắn)
export const JobApplicationMemo = sequelize.define(
  'JobApplicationMemo',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    jobApplicationId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'job_application_id'
    },
    jobId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'job_id'
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    createdBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'created_by'
    }
  },
  {
    tableName: 'job_application_memos',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

export const Message = sequelize.define(
  'Message',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    jobApplicationId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'job_application_id'
    },
    adminId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'admin_id'
    },
    collaboratorId: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'collaborator_id'
    },
    applicantId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'applicant_id'
    },
    senderType: {
      type: DataTypes.TINYINT,
      allowNull: false,
      field: 'sender_type'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    attachmentName: {
      type: DataTypes.STRING(255),
      field: 'attachment_name'
    },
    attachmentKey: {
      type: DataTypes.STRING(512),
      field: 'attachment_key'
    },
    attachmentMimeType: {
      type: DataTypes.STRING(100),
      field: 'attachment_mime_type'
    },
    attachmentSize: {
      type: DataTypes.BIGINT.UNSIGNED,
      field: 'attachment_size'
    },
    isReadByAdmin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_read_by_admin'
    },
    isReadByCollaborator: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_read_by_collaborator'
    },
    isReadByApplicant: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_read_by_applicant'
    }
  },
  {
    tableName: 'messages',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Collaborator Assignments (Phân công hồ sơ ứng viên cho AdminBackOffice - lưu cv_storage_id)
export const CollaboratorAssignment = sequelize.define(
  'CollaboratorAssignment',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    cvStorageId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'cv_storage_id'
    },
    adminId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'admin_id'
    },
    assignedBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'assigned_by'
    },
    notes: {
      type: DataTypes.TEXT
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    }
  },
  {
    tableName: 'collaborator_assignments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Associations
Admin.belongsTo(Group, { as: 'group', foreignKey: 'groupId' });
Group.hasMany(Admin, { as: 'admins', foreignKey: 'groupId' });

ActionLog.belongsTo(Admin, { as: 'admin', foreignKey: 'adminId' });
Admin.hasMany(ActionLog, { as: 'actionLogs', foreignKey: 'adminId' });

Collaborator.belongsTo(RankLevel, { as: 'rankLevel', foreignKey: 'rankLevelId' });
RankLevel.hasMany(Collaborator, { as: 'collaborators', foreignKey: 'rankLevelId' });

Collaborator.belongsTo(Group, { as: 'group', foreignKey: 'groupId' });
Group.hasMany(Collaborator, { as: 'collaborators', foreignKey: 'groupId' });

// Collaborator Assignment associations (phân công hồ sơ CV cho AdminBackOffice)
CollaboratorAssignment.belongsTo(CVStorage, { as: 'cvStorage', foreignKey: 'cvStorageId' });
CVStorage.hasMany(CollaboratorAssignment, { as: 'assignments', foreignKey: 'cvStorageId' });

CollaboratorAssignment.belongsTo(Admin, { as: 'admin', foreignKey: 'adminId' });
Admin.hasMany(CollaboratorAssignment, { as: 'collaboratorAssignments', foreignKey: 'adminId' });

CollaboratorAssignment.belongsTo(Admin, { as: 'assignedByAdmin', foreignKey: 'assignedBy' });
Admin.hasMany(CollaboratorAssignment, { as: 'assignedCollaborators', foreignKey: 'assignedBy' });

Job.belongsTo(JobCategory, { as: 'category', foreignKey: 'jobCategoryId' });
JobCategory.hasMany(Job, { as: 'jobs', foreignKey: 'jobCategoryId' });

// JobCategory self-referencing (parent-child)
JobCategory.belongsTo(JobCategory, { as: 'parent', foreignKey: 'parentId' });
JobCategory.hasMany(JobCategory, { as: 'children', foreignKey: 'parentId' });

Job.belongsTo(Company, { as: 'company', foreignKey: 'companyId' });
Company.hasMany(Job, { as: 'jobs', foreignKey: 'companyId' });

// Company associations
// Note: CompanyBusinessField uses 'id_company' field, CompanyOffice uses 'id_company' field
Company.hasMany(CompanyBusinessField, { as: 'businessFields', foreignKey: 'companyId' });
CompanyBusinessField.belongsTo(Company, { as: 'company', foreignKey: 'companyId' });

Company.hasMany(CompanyEmailAddress, { as: 'emailAddresses', foreignKey: 'companyId' });
CompanyEmailAddress.belongsTo(Company, { as: 'company', foreignKey: 'companyId' });

Company.hasMany(CompanyOffice, { as: 'offices', foreignKey: 'companyId' });
CompanyOffice.belongsTo(Company, { as: 'company', foreignKey: 'companyId' });

JobApplication.belongsTo(Job, { as: 'job', foreignKey: 'jobId' });
Job.hasMany(JobApplication, { as: 'applications', foreignKey: 'jobId' });

JobApplication.belongsTo(Collaborator, { as: 'collaborator', foreignKey: 'collaboratorId' });
Collaborator.hasMany(JobApplication, { as: 'jobApplications', foreignKey: 'collaboratorId' });

JobApplication.belongsTo(Admin, { as: 'admin', foreignKey: 'adminId' });
Admin.hasMany(JobApplication, { as: 'jobApplications', foreignKey: 'adminId' });

JobApplication.belongsTo(Admin, { as: 'adminResponsible', foreignKey: 'adminResponsibleId' });
Admin.hasMany(JobApplication, { as: 'responsibleJobApplications', foreignKey: 'adminResponsibleId' });

JobApplication.belongsTo(CVStorage, { as: 'cv', foreignKey: 'cvId' });
CVStorage.hasMany(JobApplication, { as: 'jobApplications', foreignKey: 'cvId' });

JobApplication.belongsTo(Applicant, { as: 'applicant', foreignKey: 'applicantId' });
Applicant.hasMany(JobApplication, { as: 'jobApplications', foreignKey: 'applicantId' });

PaymentRequest.belongsTo(Collaborator, { as: 'collaborator', foreignKey: 'collaboratorId' });
Collaborator.hasMany(PaymentRequest, { as: 'paymentRequests', foreignKey: 'collaboratorId' });

PaymentRequest.belongsTo(JobApplication, { as: 'jobApplication', foreignKey: 'jobApplicationId' });
JobApplication.hasMany(PaymentRequest, { as: 'paymentRequests', foreignKey: 'jobApplicationId' });

CampaignApplication.belongsTo(Campaign, { as: 'campaign', foreignKey: 'campaignId' });
Campaign.hasMany(CampaignApplication, { as: 'applications', foreignKey: 'campaignId' });

CampaignApplication.belongsTo(Collaborator, { as: 'collaborator', foreignKey: 'collaboratorId' });
Collaborator.hasMany(CampaignApplication, { as: 'campaignApplications', foreignKey: 'collaboratorId' });

CampaignApplication.belongsTo(Job, { as: 'job', foreignKey: 'jobId' });
Job.hasMany(CampaignApplication, { as: 'campaignApplications', foreignKey: 'jobId' });

CollaboratorNotification.belongsTo(Collaborator, { as: 'collaborator', foreignKey: 'collaboratorId' });
Collaborator.hasMany(CollaboratorNotification, { as: 'notifications', foreignKey: 'collaboratorId' });

CollaboratorNotification.belongsTo(Admin, { as: 'admin', foreignKey: 'adminId' });
Admin.hasMany(CollaboratorNotification, { as: 'collaboratorNotifications', foreignKey: 'adminId' });

CollaboratorNotification.belongsTo(Job, { as: 'job', foreignKey: 'jobId' });
Job.hasMany(CollaboratorNotification, { as: 'notifications', foreignKey: 'jobId' });

HomeSettingJob.belongsTo(Post, { as: 'post', foreignKey: 'postId' });
Post.hasMany(HomeSettingJob, { as: 'homeSettings', foreignKey: 'postId' });

EmailTemplate.belongsTo(Admin, { as: 'creator', foreignKey: 'createdBy' });
Admin.hasMany(EmailTemplate, { as: 'emailTemplates', foreignKey: 'createdBy' });

EmailNewsletter.belongsTo(Admin, { as: 'creator', foreignKey: 'createdBy' });
Admin.hasMany(EmailNewsletter, { as: 'emailNewsletters', foreignKey: 'createdBy' });

EmailNewsletter.belongsTo(Group, { as: 'group', foreignKey: 'groupId' });
Group.hasMany(EmailNewsletter, { as: 'emailNewsletters', foreignKey: 'groupId' });

// EmailToCollaborator associations
EmailToCollaborator.belongsTo(Collaborator, { as: 'collaborator', foreignKey: 'collaboratorId' });
Collaborator.hasMany(EmailToCollaborator, { as: 'emails', foreignKey: 'collaboratorId' });

EmailToCollaborator.belongsTo(Admin, { as: 'creator', foreignKey: 'createdBy' });
Admin.hasMany(EmailToCollaborator, { as: 'emailsToCollaborators', foreignKey: 'createdBy' });

// EmailToCompany associations (bảng chính cho email gửi công ty)
EmailToCompany.belongsTo(Admin, { as: 'creator', foreignKey: 'createdBy' });
Admin.hasMany(EmailToCompany, { as: 'emailsToCompanies', foreignKey: 'createdBy' });

// EmailToGroup associations
EmailToGroup.belongsTo(Group, { as: 'group', foreignKey: 'groupId' });
Group.hasMany(EmailToGroup, { as: 'emails', foreignKey: 'groupId' });

EmailToGroup.belongsTo(Admin, { as: 'creator', foreignKey: 'createdBy' });
Admin.hasMany(EmailToGroup, { as: 'emailsToGroups', foreignKey: 'createdBy' });

Post.belongsTo(Admin, { as: 'author', foreignKey: 'authorId' });
Admin.hasMany(Post, { as: 'posts', foreignKey: 'authorId' });

Post.belongsTo(Category, { as: 'category', foreignKey: 'categoryId' });
Category.hasMany(Post, { as: 'posts', foreignKey: 'categoryId' });

// Event & EventParticipant associations
Event.belongsTo(Admin, { as: 'creator', foreignKey: 'createdBy' });
Admin.hasMany(Event, { as: 'events', foreignKey: 'createdBy' });

EventParticipant.belongsTo(Event, { as: 'event', foreignKey: 'eventId' });
Event.hasMany(EventParticipant, { as: 'participants', foreignKey: 'eventId' });

EventParticipant.belongsTo(Admin, { as: 'admin', foreignKey: 'adminId' });
Admin.hasMany(EventParticipant, { as: 'eventParticipations', foreignKey: 'adminId' });

EventParticipant.belongsTo(Collaborator, { as: 'collaborator', foreignKey: 'collaboratorId' });
Collaborator.hasMany(EventParticipant, { as: 'eventParticipations', foreignKey: 'collaboratorId' });

// Post – Event (many-to-many)
Post.belongsToMany(Event, { through: PostEvent, foreignKey: 'postId', otherKey: 'eventId' });
Event.belongsToMany(Post, { through: PostEvent, foreignKey: 'eventId', otherKey: 'postId' });
PostEvent.belongsTo(Post, { foreignKey: 'postId' });
Post.hasMany(PostEvent, { foreignKey: 'postId' });
PostEvent.belongsTo(Event, { foreignKey: 'eventId' });
Event.hasMany(PostEvent, { foreignKey: 'eventId' });

// Post – Campaign (many-to-many)
Post.belongsToMany(Campaign, { through: PostCampaign, foreignKey: 'postId', otherKey: 'campaignId' });
Campaign.belongsToMany(Post, { through: PostCampaign, foreignKey: 'campaignId', otherKey: 'postId' });
PostCampaign.belongsTo(Post, { foreignKey: 'postId' });
Post.hasMany(PostCampaign, { foreignKey: 'postId' });
PostCampaign.belongsTo(Campaign, { foreignKey: 'campaignId' });
Campaign.hasMany(PostCampaign, { foreignKey: 'campaignId' });

JobPickupId.belongsTo(JobPickup, { as: 'pickup', foreignKey: 'jobPickupId' });
JobPickup.hasMany(JobPickupId, { as: 'jobPickupIds', foreignKey: 'jobPickupId' });

JobPickupId.belongsTo(Job, { as: 'job', foreignKey: 'jobId' });
Job.hasMany(JobPickupId, { as: 'jobPickupIds', foreignKey: 'jobId' });

// JobApplicationMemo associations
JobApplicationMemo.belongsTo(JobApplication, { as: 'jobApplication', foreignKey: 'jobApplicationId' });
JobApplication.hasMany(JobApplicationMemo, { as: 'memos', foreignKey: 'jobApplicationId' });

JobApplicationMemo.belongsTo(Job, { as: 'job', foreignKey: 'jobId' });
Job.hasMany(JobApplicationMemo, { as: 'memos', foreignKey: 'jobId' });

JobApplicationMemo.belongsTo(Admin, { as: 'creator', foreignKey: 'createdBy' });
Admin.hasMany(JobApplicationMemo, { as: 'jobApplicationMemos', foreignKey: 'createdBy' });

// JobCampaign associations
JobCampaign.belongsTo(Campaign, { as: 'campaign', foreignKey: 'campaignId' });
Campaign.hasMany(JobCampaign, { as: 'jobCampaigns', foreignKey: 'campaignId' });

JobCampaign.belongsTo(Job, { as: 'job', foreignKey: 'jobId' });
Job.hasMany(JobCampaign, { as: 'jobCampaigns', foreignKey: 'jobId' });

WorkingLocation.belongsTo(Job, { as: 'job', foreignKey: 'jobId' });
Job.hasMany(WorkingLocation, { as: 'workingLocations', foreignKey: 'jobId' });

WorkingLocationDetail.belongsTo(Job, { as: 'job', foreignKey: 'jobId' });
Job.hasMany(WorkingLocationDetail, { as: 'workingLocationDetails', foreignKey: 'jobId' });

SalaryRange.belongsTo(Job, { as: 'job', foreignKey: 'jobId' });
Job.hasMany(SalaryRange, { as: 'salaryRanges', foreignKey: 'jobId' });

SalaryRangeDetail.belongsTo(Job, { as: 'job', foreignKey: 'jobId' });
Job.hasMany(SalaryRangeDetail, { as: 'salaryRangeDetails', foreignKey: 'jobId' });

OvertimeAllowance.belongsTo(Job, { as: 'job', foreignKey: 'jobId' });
Job.hasMany(OvertimeAllowance, { as: 'overtimeAllowances', foreignKey: 'jobId' });

OvertimeAllowanceDetail.belongsTo(Job, { as: 'job', foreignKey: 'jobId' });
Job.hasMany(OvertimeAllowanceDetail, { as: 'overtimeAllowanceDetails', foreignKey: 'jobId' });

Requirement.belongsTo(Job, { as: 'job', foreignKey: 'jobId' });
Job.hasMany(Requirement, { as: 'requirements', foreignKey: 'jobId' });

Benefit.belongsTo(Job, { as: 'job', foreignKey: 'jobId' });
Job.hasMany(Benefit, { as: 'benefits', foreignKey: 'jobId' });

SmokingPolicy.belongsTo(Job, { as: 'job', foreignKey: 'jobId' });
Job.hasMany(SmokingPolicy, { as: 'smokingPolicies', foreignKey: 'jobId' });

SmokingPolicyDetail.belongsTo(Job, { as: 'job', foreignKey: 'jobId' });
Job.hasMany(SmokingPolicyDetail, { as: 'smokingPolicyDetails', foreignKey: 'jobId' });

WorkingHour.belongsTo(Job, { as: 'job', foreignKey: 'jobId' });
Job.hasMany(WorkingHour, { as: 'workingHours', foreignKey: 'jobId' });

WorkingHourDetail.belongsTo(Job, { as: 'job', foreignKey: 'jobId' });
Job.hasMany(WorkingHourDetail, { as: 'workingHourDetails', foreignKey: 'jobId' });

// Type and Value associations
Value.belongsTo(Type, { as: 'type', foreignKey: 'typeId' });
Type.hasMany(Value, { as: 'values', foreignKey: 'typeId' });

// JobValue associations
JobValue.belongsTo(Job, { as: 'job', foreignKey: 'jobId' });
Job.hasMany(JobValue, { as: 'jobValues', foreignKey: 'jobId' });

JobValue.belongsTo(Type, { as: 'type', foreignKey: 'typeId' });
Type.hasMany(JobValue, { as: 'jobValues', foreignKey: 'typeId' });

JobValue.belongsTo(Value, { as: 'valueRef', foreignKey: 'valueId' });
Value.hasMany(JobValue, { as: 'jobValues', foreignKey: 'valueId' });

CVStorage.belongsTo(Collaborator, { as: 'collaborator', foreignKey: 'collaboratorId' });
Collaborator.hasMany(CVStorage, { as: 'cvStorages', foreignKey: 'collaboratorId' });

CVStorage.belongsTo(Admin, { as: 'admin', foreignKey: 'adminId' });
Admin.hasMany(CVStorage, { as: 'cvStorages', foreignKey: 'adminId' });

CVStorage.belongsTo(Applicant, { as: 'applicant', foreignKey: 'applicantId' });
Applicant.hasMany(CVStorage, { as: 'cvStorages', foreignKey: 'applicantId' });

CVStorage.belongsTo(JobCategory, { as: 'jobCategory', foreignKey: 'jobCategoryId' });
JobCategory.hasMany(CVStorage, { as: 'cvStorages', foreignKey: 'jobCategoryId' });

// Calendar associations
Calendar.belongsTo(JobApplication, { as: 'jobApplication', foreignKey: 'jobApplicationId' });
JobApplication.hasMany(Calendar, { as: 'calendars', foreignKey: 'jobApplicationId' });

Calendar.belongsTo(Admin, { as: 'admin', foreignKey: 'adminId' });
Admin.hasMany(Calendar, { as: 'calendars', foreignKey: 'adminId' });

Calendar.belongsTo(Collaborator, { as: 'collaborator', foreignKey: 'collaboratorId' });
Collaborator.hasMany(Calendar, { as: 'calendars', foreignKey: 'collaboratorId' });

// Message associations
Message.belongsTo(JobApplication, { as: 'jobApplication', foreignKey: 'jobApplicationId' });
JobApplication.hasMany(Message, { as: 'messages', foreignKey: 'jobApplicationId' });

Message.belongsTo(Admin, { as: 'admin', foreignKey: 'adminId' });
Admin.hasMany(Message, { as: 'messages', foreignKey: 'adminId' });

Message.belongsTo(Collaborator, { as: 'collaborator', foreignKey: 'collaboratorId' });
Collaborator.hasMany(Message, { as: 'messages', foreignKey: 'collaboratorId' });

Message.belongsTo(Applicant, { as: 'applicant', foreignKey: 'applicantId' });
Applicant.hasMany(Message, { as: 'messages', foreignKey: 'applicantId' });

// Outlook Email Connection
export const OutlookConnection = sequelize.define(
  'OutlookConnection',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    adminId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'admin_id'
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: false
    },
    accessToken: {
      type: DataTypes.TEXT,
      field: 'access_token'
    },
    refreshToken: {
      type: DataTypes.TEXT,
      field: 'refresh_token'
    },
    expiresAt: {
      type: DataTypes.DATE,
      field: 'expires_at'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active'
    },
    lastSyncAt: {
      type: DataTypes.DATE,
      field: 'last_sync_at'
    },
    syncEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'sync_enabled'
    }
  },
  {
    tableName: 'outlook_connections',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

// Synced Emails
export const SyncedEmail = sequelize.define(
  'SyncedEmail',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    outlookConnectionId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'outlook_connection_id'
    },
    messageId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: 'message_id'
    },
    conversationId: {
      type: DataTypes.STRING(255),
      field: 'conversation_id'
    },
    internetMessageId: {
      type: DataTypes.STRING(255),
      field: 'internet_message_id'
    },
    subject: {
      type: DataTypes.STRING(500)
    },
    body: {
      type: DataTypes.TEXT
    },
    bodyPreview: {
      type: DataTypes.TEXT,
      field: 'body_preview'
    },
    fromEmail: {
      type: DataTypes.STRING(255),
      field: 'from_email'
    },
    fromName: {
      type: DataTypes.STRING(255),
      field: 'from_name'
    },
    toRecipients: {
      type: DataTypes.JSON,
      field: 'to_recipients'
    },
    ccRecipients: {
      type: DataTypes.JSON,
      field: 'cc_recipients'
    },
    bccRecipients: {
      type: DataTypes.JSON,
      field: 'bcc_recipients'
    },
    receivedDateTime: {
      type: DataTypes.DATE,
      field: 'received_date_time'
    },
    sentDateTime: {
      type: DataTypes.DATE,
      field: 'sent_date_time'
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_read'
    },
    hasAttachments: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'has_attachments'
    },
    importance: {
      type: DataTypes.STRING(50)
    },
    folder: {
      type: DataTypes.STRING(100),
      defaultValue: 'inbox'
    },
    direction: {
      type: DataTypes.ENUM('inbound', 'outbound'),
      allowNull: false,
      defaultValue: 'inbound'
    }
  },
  {
    tableName: 'synced_emails',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['outlook_connection_id', 'received_date_time']
      },
      {
        fields: ['message_id']
      },
      {
        fields: ['folder', 'is_read']
      }
    ]
  }
);

// Outlook Email Associations
OutlookConnection.belongsTo(Admin, { as: 'admin', foreignKey: 'adminId' });
Admin.hasOne(OutlookConnection, { as: 'outlookConnection', foreignKey: 'adminId' });

OutlookConnection.hasMany(SyncedEmail, { as: 'syncedEmails', foreignKey: 'outlookConnectionId' });
SyncedEmail.belongsTo(OutlookConnection, { as: 'outlookConnection', foreignKey: 'outlookConnectionId' });

export {
  sequelize
};

export default {
  sequelize,
  Admin,
  Group,
  ActionLog,
  RankLevel,
  Collaborator,
  Applicant,
  Company,
  CompanyBusinessField,
  CompanyEmailAddress,
  CompanyOffice,
  JobCategory,
  Job,
  JobApplication,
  PaymentRequest,
  Post,
  Event,
  EventParticipant,
  PostEvent,
  PostCampaign,
  Category,
  FAQ,
  CollaboratorNotification,
  Campaign,
  CampaignApplication,
  CVStorage,
  MailSetting,
  EmailTemplate,
  EmailNewsletter,
  EmailToCollaborator,
  EmailToCompany,
  EmailToGroup,
  HomeSettingJob,
  HomeSettingPartner,
  JobPickup,
  JobPickupId,
  JobApplicationMemo,
  JobCampaign,
  WorkingLocation,
  WorkingLocationDetail,
  SalaryRange,
  SalaryRangeDetail,
  OvertimeAllowance,
  OvertimeAllowanceDetail,
  Benefit,
  Requirement,
  SmokingPolicy,
  SmokingPolicyDetail,
  WorkingHour,
  WorkingHourDetail,
  Type,
  Value,
  JobValue,
  Calendar,
  Message,
  OutlookConnection,
  SyncedEmail
};

// Search History (Lịch sử tìm kiếm của CTV)
export const SearchHistory = sequelize.define(
  'SearchHistory',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    collaboratorId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'collaborator_id',
      references: {
        model: 'collaborators',
        key: 'id'
      }
    },
    keyword: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Từ khóa tìm kiếm'
    },
    filters: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Các điều kiện lọc đã chọn (JSON)'
    },
    resultCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      field: 'result_count',
      comment: 'Số lượng kết quả tìm được'
    }
  },
  {
    tableName: 'search_history',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['collaborator_id', 'created_at']
      }
    ]
  }
);

// Associations for SearchHistory
SearchHistory.belongsTo(Collaborator, {
  foreignKey: 'collaboratorId',
  as: 'collaborator'
});

// Collaborator Saved Search Criteria (Tiêu chí tìm kiếm đã lưu của CTV)
export const CollaboratorSavedSearchCriteria = sequelize.define(
  'CollaboratorSavedSearchCriteria',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    collaboratorId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'collaborator_id',
      references: {
        model: 'collaborators',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Tên gợi nhớ (VD: Tìm kiếm IT Tokyo)'
    },
    filters: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'JSON: keyword, locations[], fieldIds[], jobTypeIds[], age, salaryMin, salaryMax, employmentType, highlights[], booleans'
    }
  },
  {
    tableName: 'collaborator_saved_search_criteria',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['collaborator_id'] }
    ]
  }
);

// Collaborator Saved List (Playlist / danh sách việc làm yêu thích của CTV)
export const CollaboratorSavedList = sequelize.define(
  'CollaboratorSavedList',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    collaboratorId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'collaborator_id',
      references: {
        model: 'collaborators',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Tên playlist (VD: Việc làm IT yêu thích)'
    }
  },
  {
    tableName: 'collaborator_saved_lists',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['collaborator_id'] }
    ]
  }
);

// Collaborator Saved List Job (Job nằm trong playlist)
export const CollaboratorSavedListJob = sequelize.define(
  'CollaboratorSavedListJob',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    savedListId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'saved_list_id',
      references: {
        model: 'collaborator_saved_lists',
        key: 'id'
      }
    },
    jobId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'job_id',
      references: {
        model: 'jobs',
        key: 'id'
      }
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'sort_order',
      comment: 'Thứ tự hiển thị trong list'
    }
  },
  {
    tableName: 'collaborator_saved_list_jobs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      { unique: true, fields: ['saved_list_id', 'job_id'] },
      { fields: ['saved_list_id'] },
      { fields: ['job_id'] }
    ]
  }
);

// Associations for CollaboratorSavedSearchCriteria
CollaboratorSavedSearchCriteria.belongsTo(Collaborator, {
  foreignKey: 'collaboratorId',
  as: 'collaborator'
});
Collaborator.hasMany(CollaboratorSavedSearchCriteria, {
  as: 'savedSearchCriteria',
  foreignKey: 'collaboratorId'
});

// Associations for CollaboratorSavedList
CollaboratorSavedList.belongsTo(Collaborator, {
  foreignKey: 'collaboratorId',
  as: 'collaborator'
});
Collaborator.hasMany(CollaboratorSavedList, {
  as: 'savedLists',
  foreignKey: 'collaboratorId'
});

CollaboratorSavedList.hasMany(CollaboratorSavedListJob, {
  as: 'savedListJobs',
  foreignKey: 'savedListId'
});
CollaboratorSavedListJob.belongsTo(CollaboratorSavedList, {
  foreignKey: 'savedListId',
  as: 'savedList'
});

CollaboratorSavedListJob.belongsTo(Job, {
  foreignKey: 'jobId',
  as: 'job'
});
Job.hasMany(CollaboratorSavedListJob, {
  as: 'savedListJobEntries',
  foreignKey: 'jobId'
});

// Job Recruiting Company (Công ty tuyển dụng thực tế trong JD)
export const JobRecruitingCompany = sequelize.define(
  'JobRecruitingCompany',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    jobId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'job_id'
    },
    companyName: {
      type: DataTypes.STRING(255),
      field: 'company_name'
    },
    revenue: {
      type: DataTypes.STRING(255)
    },
    numberOfEmployees: {
      type: DataTypes.STRING(255),
      field: 'number_of_employees'
    },
    headquarters: {
      type: DataTypes.STRING(255)
    },
    headquartersEn: {
      type: DataTypes.STRING(255),
      field: 'headquarters_en'
    },
    headquartersJp: {
      type: DataTypes.STRING(255),
      field: 'headquarters_jp'
    },
    companyIntroduction: {
      type: DataTypes.TEXT,
      field: 'company_introduction'
    },
    companyIntroductionEn: {
      type: DataTypes.TEXT,
      field: 'company_introduction_en'
    },
    companyIntroductionJp: {
      type: DataTypes.TEXT,
      field: 'company_introduction_jp'
    },
    stockExchangeInfo: {
      type: DataTypes.STRING(255),
      field: 'stock_exchange_info'
    },
    stockExchangeInfoEn: {
      type: DataTypes.STRING(255),
      field: 'stock_exchange_info_en'
    },
    stockExchangeInfoJp: {
      type: DataTypes.STRING(255),
      field: 'stock_exchange_info_jp'
    },
    investmentCapital: {
      type: DataTypes.STRING(255),
      field: 'investment_capital'
    },
    investmentCapitalEn: {
      type: DataTypes.STRING(255),
      field: 'investment_capital_en'
    },
    investmentCapitalJp: {
      type: DataTypes.STRING(255),
      field: 'investment_capital_jp'
    },
    establishedDate: {
      type: DataTypes.STRING(255),
      field: 'established_date'
    },
    companyNameEn: { type: DataTypes.STRING(255), field: 'company_name_en' },
    companyNameJp: { type: DataTypes.STRING(255), field: 'company_name_jp' },
    revenueEn: { type: DataTypes.STRING(255), field: 'revenue_en' },
    revenueJp: { type: DataTypes.STRING(255), field: 'revenue_jp' },
    numberOfEmployeesEn: { type: DataTypes.STRING(255), field: 'number_of_employees_en' },
    numberOfEmployeesJp: { type: DataTypes.STRING(255), field: 'number_of_employees_jp' },
    headquartersEn: { type: DataTypes.STRING(255), field: 'headquarters_en' },
    headquartersJp: { type: DataTypes.STRING(255), field: 'headquarters_jp' },
    companyIntroductionEn: { type: DataTypes.TEXT, field: 'company_introduction_en' },
    companyIntroductionJp: { type: DataTypes.TEXT, field: 'company_introduction_jp' },
    establishedDateEn: { type: DataTypes.STRING(255), field: 'established_date_en' },
    establishedDateJp: { type: DataTypes.STRING(255), field: 'established_date_jp' }
  },
  {
    tableName: 'job_recruiting_companies',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Job Recruiting Company Service
export const JobRecruitingCompanyService = sequelize.define(
  'JobRecruitingCompanyService',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    jobRecruitingCompanyId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'job_recruiting_company_id'
    },
    serviceName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'service_name'
    },
    serviceNameEn: {
      type: DataTypes.STRING(255),
      field: 'service_name_en'
    },
    serviceNameJp: {
      type: DataTypes.STRING(255),
      field: 'service_name_jp'
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  },
  {
    tableName: 'job_recruiting_company_services',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Job Recruiting Company Business Sector
export const JobRecruitingCompanyBusinessSector = sequelize.define(
  'JobRecruitingCompanyBusinessSector',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    jobRecruitingCompanyId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'job_recruiting_company_id'
    },
    sectorName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'sector_name'
    },
    sectorNameEn: {
      type: DataTypes.STRING(255),
      field: 'sector_name_en'
    },
    sectorNameJp: {
      type: DataTypes.STRING(255),
      field: 'sector_name_jp'
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  },
  {
    tableName: 'job_recruiting_company_business_sectors',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  }
);

// Associations for JobRecruitingCompany
JobRecruitingCompany.belongsTo(Job, { as: 'job', foreignKey: 'jobId' });
Job.hasOne(JobRecruitingCompany, { as: 'recruitingCompany', foreignKey: 'jobId' });

JobRecruitingCompany.hasMany(JobRecruitingCompanyService, { 
  as: 'services', 
  foreignKey: 'jobRecruitingCompanyId' 
});
JobRecruitingCompanyService.belongsTo(JobRecruitingCompany, { 
  as: 'recruitingCompany', 
  foreignKey: 'jobRecruitingCompanyId' 
});

JobRecruitingCompany.hasMany(JobRecruitingCompanyBusinessSector, { 
  as: 'businessSectors', 
  foreignKey: 'jobRecruitingCompanyId' 
});
JobRecruitingCompanyBusinessSector.belongsTo(JobRecruitingCompany, { 
  as: 'recruitingCompany', 
  foreignKey: 'jobRecruitingCompanyId' 
});

// Public CTV landing chat (không đăng nhập)
export const PublicCtvChatSession = sequelize.define(
  'PublicCtvChatSession',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    sessionToken: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      unique: true,
      field: 'session_token'
    },
    visitorLabel: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'visitor_label'
    },
    collaboratorId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'collaborator_id'
    },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'open'
    },
    lastMessageAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_message_at'
    },
    lastVisitorMessageAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_visitor_message_at'
    },
    adminLastSeenAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'admin_last_seen_at'
    }
  },
  {
    tableName: 'public_ctv_chat_sessions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

export const PublicCtvChatMessage = sequelize.define(
  'PublicCtvChatMessage',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    sessionId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'session_id'
    },
    senderType: {
      type: DataTypes.ENUM('visitor', 'admin'),
      allowNull: false,
      field: 'sender_type'
    },
    adminId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'admin_id'
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  },
  {
    tableName: 'public_ctv_chat_messages',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  }
);

PublicCtvChatSession.hasMany(PublicCtvChatMessage, { as: 'messages', foreignKey: 'sessionId' });
PublicCtvChatMessage.belongsTo(PublicCtvChatSession, { as: 'session', foreignKey: 'sessionId' });
PublicCtvChatMessage.belongsTo(Admin, { as: 'admin', foreignKey: 'adminId' });
PublicCtvChatSession.belongsTo(Collaborator, { as: 'collaborator', foreignKey: 'collaboratorId' });
Collaborator.hasMany(PublicCtvChatSession, { as: 'publicCtvChatSessions', foreignKey: 'collaboratorId' });

// Public candidate landing chat (không đăng nhập)
export const PublicCandidateChatSession = sequelize.define(
  'PublicCandidateChatSession',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    sessionToken: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      unique: true,
      field: 'session_token'
    },
    visitorLabel: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'visitor_label'
    },
    applicantId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'applicant_id'
    },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'open'
    },
    lastMessageAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_message_at'
    },
    lastVisitorMessageAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_visitor_message_at'
    },
    adminLastSeenAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'admin_last_seen_at'
    }
  },
  {
    tableName: 'public_candidate_chat_sessions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

export const PublicCandidateChatMessage = sequelize.define(
  'PublicCandidateChatMessage',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    sessionId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'session_id'
    },
    senderType: {
      type: DataTypes.ENUM('visitor', 'admin'),
      allowNull: false,
      field: 'sender_type'
    },
    adminId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'admin_id'
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  },
  {
    tableName: 'public_candidate_chat_messages',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  }
);

PublicCandidateChatSession.hasMany(PublicCandidateChatMessage, { as: 'messages', foreignKey: 'sessionId' });
PublicCandidateChatMessage.belongsTo(PublicCandidateChatSession, { as: 'session', foreignKey: 'sessionId' });
PublicCandidateChatMessage.belongsTo(Admin, { as: 'admin', foreignKey: 'adminId' });
PublicCandidateChatSession.belongsTo(Applicant, { as: 'applicant', foreignKey: 'applicantId' });
Applicant.hasMany(PublicCandidateChatSession, { as: 'publicCandidateChatSessions', foreignKey: 'applicantId' });

