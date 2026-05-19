import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiService from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import LandingPersonaSwitcher from '../component/Layout/LandingPersonaSwitcher';
import LegalPoliciesSlidePanel from '../component/Shared/LegalPoliciesSlidePanel';

const HEADER_I18N = {
  vi: {
    navHome: 'Trang chủ',
    navJobs: 'Danh sách việc làm',
    navAbout: 'Về chúng tôi',
    navPartners: 'Đối tác',
    navFaq: 'Hỏi và đáp',
    navBlog: 'Blog',
    login: 'Đăng nhập',
    register: 'Đăng ký',
  },
  en: {
    navHome: 'Home',
    navJobs: 'Job Listings',
    navAbout: 'About Us',
    navPartners: 'Partners',
    navFaq: 'Q&A',
    navBlog: 'Blog',
    login: 'Log in',
    register: 'Sign up',
  },
  ja: {
    navHome: 'ホーム',
    navJobs: '求人一覧',
    navAbout: '私たちについて',
    navPartners: 'パートナー',
    navFaq: 'Q&A',
    navBlog: 'ブログ',
    login: 'ログイン',
    register: '登録',
  },
};

const LANGUAGE_OPTIONS = ['vi', 'en', 'ja'];

const PAGE_I18N = {
  vi: {
    heroTitle: 'Đăng ký Cộng tác viên',
    heroSub: 'Điền đầy đủ thông tin bên dưới để trở thành cộng tác viên JobShare.',
    personalInfo: '1. Thông tin cá nhân',
    orgType: '2. Hình thức tổ chức',
    extraInfo: '3. Thông tin bổ sung',
    companyInfo: '3. Thông tin doanh nghiệp',
    loginPassword: 'Mật khẩu đăng nhập',
    bankInfo: 'Thông tin ngân hàng',
    bankOptional: '(tùy chọn)',
    fullName: 'Họ và tên',
    birthDate: 'Ngày sinh',
    email: 'Email',
    phone: 'Số điện thoại',
    phoneHint: 'Vui lòng điền số điện thoại liên lạc thường xuyên nhất',
    socialLink: 'Facebook / LinkedIn',
    currentCountry: 'Nơi sống hiện tại',
    country: 'Quốc gia',
    postalCode: 'Mã bưu chính',
    addressDetail: 'Địa chỉ chi tiết',
    individual: 'Cá nhân',
    company: 'Tổ chức – Doanh nghiệp',
    expQuestion: 'Bạn đã có kinh nghiệm làm cộng tác viên tuyển dụng chưa?',
    noExp: 'Chưa có kinh nghiệm',
    yesExp: 'Đã có kinh nghiệm',
    yearsExp: 'Số năm kinh nghiệm:',
    choose: 'Chọn',
    networkField: 'Bạn có network ứng viên nhiều nhất trong lĩnh vực nào?',
    introSelf: 'Giới thiệu bản thân',
    introSelfHint: 'Tuỳ ý – giúp chúng tôi hiểu hơn về bạn',
    introSelfPlaceholder: 'Chia sẻ một chút về bản thân, kinh nghiệm hoặc mục tiêu của bạn…',
    companyName: 'Tên công ty',
    website: 'Website',
    taxCode: 'Mã số thuế (MST)',
    businessAddress: 'Địa chỉ hoạt động hiện tại',
    businessLicense: 'Giấy phép kinh doanh',
    filePdf: 'File PDF',
    uploadHere: 'Nhấn để tải lên',
    orDrop: 'hoặc kéo thả file vào đây',
    pdfOnly: 'Chỉ chấp nhận file PDF · Tối đa 10MB',
    companyNetwork: 'Doanh nghiệp có network ứng viên trong lĩnh vực nào?',
    introCompany: 'Giới thiệu về doanh nghiệp',
    introCompanyHint: 'Tuỳ ý',
    introCompanyPlaceholder: 'Chia sẻ về lĩnh vực hoạt động, quy mô và thế mạnh của doanh nghiệp…',
    password: 'Mật khẩu',
    passwordConfirm: 'Xác nhận mật khẩu',
    passwordHint: 'Ít nhất 8 ký tự',
    confirmPasswordPlaceholder: 'Nhập lại mật khẩu',
    bankName: 'Tên ngân hàng',
    bankAccount: 'Số tài khoản',
    bankAccountName: 'Chủ tài khoản',
    termsText: 'Tôi đã đọc và đồng ý với',
    termsLink: 'Quy định &amp; chính sách sử dụng nền tảng Workstation JobShare',
    submit: 'Đăng ký',
    submitting: 'Đang xử lý...',
    haveAccount: 'Đã có tài khoản?',
    login: 'Đăng nhập',
    successTitle: 'Đăng ký thành công!',
    successBody: 'Cảm ơn bạn đã đăng ký. Vui lòng mở email để bấm link xác thực, hệ thống sẽ tự động kích hoạt tài khoản cho bạn.',
    successLogin: 'Đăng nhập',
  },
  en: {
    heroTitle: 'Collaborator Registration',
    heroSub: 'Fill in the information below to become a JobShare collaborator.',
    personalInfo: '1. Personal Information',
    orgType: '2. Organization Type',
    extraInfo: '3. Additional Information',
    companyInfo: '3. Company Information',
    loginPassword: 'Login Password',
    bankInfo: 'Bank Information',
    bankOptional: '(optional)',
    fullName: 'Full name',
    birthDate: 'Date of birth',
    email: 'Email',
    phone: 'Phone number',
    phoneHint: 'Please provide the phone number you use most often',
    socialLink: 'Facebook / LinkedIn',
    currentCountry: 'Current location',
    country: 'Country',
    postalCode: 'Postal code',
    addressDetail: 'Detailed address',
    individual: 'Individual',
    company: 'Organization / Company',
    expQuestion: 'Have you ever worked as a recruitment collaborator?',
    noExp: 'No experience yet',
    yesExp: 'Experienced',
    yearsExp: 'Years of experience:',
    choose: 'Choose',
    networkField: 'Which field do you have the strongest candidate network in?',
    introSelf: 'Introduce yourself',
    introSelfHint: 'Optional – helps us get to know you better',
    introSelfPlaceholder: 'Share a little about yourself, your experience, or your goals…',
    companyName: 'Company name',
    website: 'Website',
    taxCode: 'Tax code',
    businessAddress: 'Current business address',
    businessLicense: 'Business license',
    filePdf: 'PDF file',
    uploadHere: 'Click to upload',
    orDrop: 'or drop the file here',
    pdfOnly: 'PDF only · Max 10MB',
    companyNetwork: 'Which field does your company recruit in?',
    introCompany: 'Introduce your company',
    introCompanyHint: 'Optional',
    introCompanyPlaceholder: 'Share your business field, size, and strengths…',
    password: 'Password',
    passwordConfirm: 'Confirm password',
    passwordHint: 'At least 8 characters',
    confirmPasswordPlaceholder: 'Re-enter password',
    bankName: 'Bank name',
    bankAccount: 'Account number',
    bankAccountName: 'Account holder',
    termsText: 'I have read and agree to',
    termsLink: 'the Workstation JobShare platform terms and policies',
    submit: 'Sign up',
    submitting: 'Processing...',
    haveAccount: 'Already have an account?',
    login: 'Log in',
    successTitle: 'Registration successful!',
    successBody: 'Thank you for registering. Please open your email and click the verification link; the system will activate your account automatically.',
    successLogin: 'Log in',
  },
  ja: {
    heroTitle: 'CTV登録',
    heroSub: '下記の情報を入力して、JobShareのCTVになりましょう。',
    personalInfo: '1. 個人情報',
    orgType: '2. 組織形態',
    extraInfo: '3. 追加情報',
    companyInfo: '3. 企業情報',
    loginPassword: 'ログインパスワード',
    bankInfo: '銀行情報',
    bankOptional: '(任意)',
    fullName: '氏名',
    birthDate: '生年月日',
    email: 'メールアドレス',
    phone: '電話番号',
    phoneHint: '普段ご利用の連絡先を入力してください',
    socialLink: 'Facebook / LinkedIn',
    currentCountry: '現在の居住地',
    country: '国',
    postalCode: '郵便番号',
    addressDetail: '住所詳細',
    individual: '個人',
    company: '企業 / 法人',
    expQuestion: '求人紹介の協力者としての経験はありますか？',
    noExp: '経験なし',
    yesExp: '経験あり',
    yearsExp: '経験年数:',
    choose: '選択',
    networkField: 'どの分野の候補者ネットワークが最もありますか？',
    introSelf: '自己紹介',
    introSelfHint: '任意 – あなたをよりよく知るために',
    introSelfPlaceholder: 'ご自身のこと、経験、目標などを自由にご記入ください…',
    companyName: '会社名',
    website: 'Webサイト',
    taxCode: '税番号',
    businessAddress: '事業所住所',
    businessLicense: '営業許可証',
    filePdf: 'PDFファイル',
    uploadHere: 'クリックしてアップロード',
    orDrop: 'またはここにドラッグ＆ドロップ',
    pdfOnly: 'PDFのみ · 最大10MB',
    companyNetwork: 'どの分野の候補者ネットワークがありますか？',
    introCompany: '会社紹介',
    introCompanyHint: '任意',
    introCompanyPlaceholder: '事業内容、規模、強みなどをご紹介ください…',
    password: 'パスワード',
    passwordConfirm: 'パスワード確認',
    passwordHint: '8文字以上',
    confirmPasswordPlaceholder: 'パスワードを再入力',
    bankName: '銀行名',
    bankAccount: '口座番号',
    bankAccountName: '口座名義',
    termsText: '私は以下に同意します：',
    termsLink: 'Workstation JobShare の利用規約とポリシー',
    submit: '登録',
    submitting: '処理中...',
    haveAccount: 'すでにアカウントをお持ちですか？',
    login: 'ログイン',
    successTitle: '登録が完了しました！',
    successBody: 'ご登録ありがとうございます。メールを開いて認証リンクをクリックしてください。システムが自動でアカウントを有効化します。',
    successLogin: 'ログイン',
  },
};

// Danh sách lĩnh vực (theo form mẫu)
const LINH_VUC = [
  'Kinh doanh – Sales',
  'Kế hoạch – Quản lý',
  'IT (SE / Hạ tầng / Web)',
  'Kỹ thuật lập trình nhúng',
  'Kỹ thuật cơ khí – Điện – Điện tử',
  'Kỹ thuật hóa học – vật liệu – mỹ phẩm – sản phẩm tiêu dùng',
  'Kỹ thuật thực phẩm – hương liệu – thức ăn chăn nuôi',
  'Nhân sự',
  'Tài chính – Kế toán',
  'Hành chính – Văn phòng',
  'Lĩnh vực khác',
];

const NAM_KN_OPTIONS = ['Dưới 1 năm', '1~3 năm', 'Trên 3 năm'];
const QUOC_GIA_OPTIONS = ['Việt Nam', 'Nhật Bản', 'Khác'];

// Màu & style (theo form mẫu)
const C = {
  red: '#c61414',
  redLt: '#fdf2f2',
  gray: '#4a4a4a',
  blue: '#1c8ae7',
  green: '#00bf63',
  white: '#ffffff',
  bg: '#f5f5f5',
  border: '#dddddd',
};

const css = {
  root: {
    fontFamily: "'Barlow', sans-serif",
    background: C.white,
    minHeight: '100vh',
  },
  header: {
    background: '#000',
    padding: '0 40px',
    minHeight: 56,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 12px rgba(0,0,0,.25)',
  },
  logoWrap: {
    display: 'flex', alignItems: 'center', textDecoration: 'none', color: C.white,
  },
  hero: {
    background: C.white,
    padding: '48px 40px 56px',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  heroTitle: {
    fontSize: 28, fontWeight: 700, color: C.gray, marginBottom: 8,
  },
  heroSub: {
    fontSize: 15, color: '#6b7280', maxWidth: 480, margin: '0 auto', lineHeight: 1.5,
  },
  wrapper: {
    maxWidth: 760, margin: '-28px auto 60px', padding: '0 20px',
  },
  card: {
    background: C.white, borderRadius: 16,
    boxShadow: '0 4px 24px rgba(0,0,0,.09)', padding: '40px 48px',
  },
  sectionTitle: {
    fontSize: 13, fontWeight: 700, letterSpacing: '1.2px',
    textTransform: 'uppercase', color: C.red,
    borderLeft: `3px solid ${C.red}`, paddingLeft: 10, marginBottom: 20,
  },
  divider: {
    border: 'none', borderTop: `1px solid ${C.border}`, margin: '32px 0',
  },
  field: { marginBottom: 20 },
  label: {
    display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: C.gray,
  },
  req: { color: C.red, marginLeft: 3 },
  hint: { fontSize: 11, fontWeight: 400, color: '#999', marginLeft: 6 },
  input: {
    width: '100%', padding: '11px 14px',
    fontFamily: "'Barlow', sans-serif", fontSize: 14, color: C.gray,
    background: '#fafafa', border: `1.5px solid ${C.border}`,
    borderRadius: 10, outline: 'none', boxSizing: 'border-box',
    transition: 'border .2s, box-shadow .2s',
  },
  inputFocus: {
    borderColor: C.red,
    boxShadow: '0 0 0 3px rgba(198,20,20,.1)',
    background: C.white,
  },
  inputError: { borderColor: C.red },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 16 },
  toggleGroup: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  toggleOption: (checked) => ({
    flex: 1, minWidth: 160,
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '12px 18px',
    border: `2px solid ${checked ? C.red : C.border}`,
    borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 500,
    background: checked ? C.redLt : C.white,
    color: checked ? C.red : C.gray,
    transition: 'all .2s', userSelect: 'none',
  }),
  radioCircle: (checked) => ({
    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
    border: `2px solid ${checked ? C.red : C.border}`,
    background: checked ? C.red : 'transparent',
    boxShadow: checked ? `inset 0 0 0 3px ${C.white}` : 'none',
    transition: 'all .2s',
  }),
  checkGroup: { display: 'flex', flexDirection: 'column', gap: 8 },
  checkItem: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 },
  multiSelectWrap: { position: 'relative', width: '100%' },
  multiSelectTrigger: {
    width: '100%', padding: '11px 14px', paddingRight: 36,
    fontFamily: "'Barlow', sans-serif", fontSize: 14, color: C.gray,
    background: '#fafafa', border: `1.5px solid ${C.border}`,
    borderRadius: 10, outline: 'none', boxSizing: 'border-box',
    cursor: 'pointer', textAlign: 'left',
  },
  multiSelectTriggerOpen: {
    borderColor: C.red, boxShadow: '0 0 0 3px rgba(198,20,20,.1)', background: C.white,
  },
  multiSelectDropdown: {
    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
    background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 10,
    boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 50, maxHeight: 280, overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
  },
  multiSelectSearch: {
    padding: 10, borderBottom: `1px solid ${C.border}`,
    fontFamily: "'Barlow', sans-serif", fontSize: 14,
    border: 'none', outline: 'none', background: '#fafafa',
  },
  multiSelectList: { overflow: 'auto', maxHeight: 220, padding: '6px 0' },
  multiSelectOption: (selected) => ({
    padding: '10px 14px', cursor: 'pointer', fontSize: 13,
    background: selected ? C.redLt : 'transparent',
    color: selected ? C.red : C.gray,
    display: 'flex', alignItems: 'center', gap: 8,
  }),
  multiSelectTags: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  multiSelectTag: {
    fontSize: 12, padding: '4px 10px', borderRadius: 20,
    background: C.redLt, color: C.red, display: 'inline-flex', alignItems: 'center', gap: 6,
  },
  multiSelectTagRemove: { cursor: 'pointer', opacity: 0.8 },
  expInline: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingLeft: 24 },
  uploadZone: (hasFile) => ({
    border: `2px dashed ${hasFile ? C.red : C.border}`,
    borderRadius: 10, padding: 24, textAlign: 'center', cursor: 'pointer',
    background: hasFile ? C.redLt : 'transparent',
    transition: 'border .2s, background .2s',
  }),
  upIcon: { fontSize: 28, marginBottom: 8 },
  upText: { fontSize: 13, color: '#999' },
  upHint: { fontSize: 11, color: '#bbb', marginTop: 4 },
  subDesc: { fontSize: 13, color: '#888', marginBottom: 20 },
  submitRow: {
    marginTop: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
  },
  agreeLabel: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    fontSize: 13.5, color: C.gray, cursor: 'pointer',
    maxWidth: 500, lineHeight: 1.6,
  },
  agreeLink: { color: C.blue, textDecoration: 'underline' },
  btnSubmit: (disabled) => ({
    background: disabled ? '#ccc' : C.red,
    color: C.white, fontFamily: "'Barlow', sans-serif",
    fontSize: 16, fontWeight: 700, padding: '14px 56px',
    border: 'none', borderRadius: 50, cursor: disabled ? 'not-allowed' : 'pointer',
    letterSpacing: '.5px',
    boxShadow: disabled ? 'none' : '0 4px 16px rgba(198,20,20,.4)',
    transition: 'background .2s, box-shadow .2s',
  }),
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)',
    zIndex: 100, display: 'grid', placeItems: 'center',
  },
  successBox: {
    background: C.white, borderRadius: 20, padding: '48px 56px',
    textAlign: 'center', maxWidth: 420,
    boxShadow: '0 12px 40px rgba(0,0,0,.2)',
  },
  checkCircle: {
    width: 72, height: 72, background: C.green, borderRadius: '50%',
    display: 'grid', placeItems: 'center', margin: '0 auto 20px',
  },
  errText: { fontSize: 12, color: C.red, marginTop: 4 },
};

// ─── Input với focus highlight ─────────────────────────────────────────────
function FInput({ style, error, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      style={{
        ...css.input,
        ...(focused ? css.inputFocus : {}),
        ...(error ? css.inputError : {}),
        ...style,
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      {...props}
    />
  );
}

function FSelect({ style, error, children, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      style={{
        ...css.input,
        ...(focused ? css.inputFocus : {}),
        ...(error ? css.inputError : {}),
        ...style,
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      {...props}
    >
      {children}
    </select>
  );
}

function FTextarea({ style, error, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      style={{
        ...css.input,
        minHeight: 100,
        resize: 'vertical',
        ...(focused ? css.inputFocus : {}),
        ...(error ? css.inputError : {}),
        ...style,
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      {...props}
    />
  );
}

function SearchableMultiSelect({ options, value = [], onChange, placeholder = 'Gõ để tìm, chọn...' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);
  const q = search.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  const toggle = (item) => {
    const next = value.includes(item) ? value.filter((v) => v !== item) : [...value, item];
    onChange(next);
  };
  const remove = (e, item) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== item));
  };
  const displayText = value.length ? `${value.length} lĩnh vực đã chọn` : placeholder;
  return (
    <div style={css.multiSelectWrap} ref={wrapRef}>
      <div
        role="combobox"
        aria-expanded={open}
        style={{
          ...css.multiSelectTrigger,
          ...(open ? css.multiSelectTriggerOpen : {}),
        }}
        onClick={() => setOpen(!open)}
      >
        {displayText}
        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 10 }}>
          {open ? '▲' : '▼'}
        </span>
      </div>
      {open && (
        <div style={css.multiSelectDropdown}>
          <input
            type="text"
            placeholder="🔍 Gõ để tìm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            style={css.multiSelectSearch}
            autoFocus
          />
          <div style={css.multiSelectList} role="listbox">
            {filtered.length ? (
              filtered.map((opt) => {
                const selected = value.includes(opt);
                return (
                  <div
                    key={opt}
                    role="option"
                    aria-selected={selected}
                    style={css.multiSelectOption(selected)}
                    onClick={() => toggle(opt)}
                  >
                    {selected && '✓ '}
                    {opt}
                  </div>
                );
              })
            ) : (
              <div style={{ padding: 14, color: '#999', fontSize: 13 }}>Không có kết quả</div>
            )}
          </div>
        </div>
      )}
      {value.length > 0 && (
        <div style={css.multiSelectTags}>
          {value.map((v) => (
            <span key={v} style={css.multiSelectTag}>
              {v}
              <span style={css.multiSelectTagRemove} onClick={(e) => remove(e, v)} aria-label="Bỏ chọn">
                ×
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const RegisterPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    hoTen: '',
    ngaySinh: '',
    email: '',
    soDienThoai: '',
    loaiSdt: 'Zalo',
    facebookLinkedin: '',
    quocGia: '',
    zipCode: '',
    diaChi: '',
    loaiCtv: 'ca_nhan',
    kinhNghiem: '',
    namKinhNghiem: '',
    linhVucCaNhan: [],
    gioiThieuCaNhan: '',
    tenCongTy: '',
    website: '',
    mst: '',
    diaChiDN: '',
    giayphepFile: null,
    linhVucDN: [],
    gioiThieuDN: '',
    password: '',
    confirmPassword: '',
    bankName: '',
    bankAccount: '',
    bankAccountName: '',
    agreeTerms: false,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [legalPanelOpen, setLegalPanelOpen] = useState(false);

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      setForm((prev) => ({ ...prev, giayphepFile: file }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const trimmedEmail = (form.email || '').trim();
    const phone = String(form.soDienThoai || '').replace(/\D/g, '').replace(/\s/g, '');

    if (!(form.hoTen || '').trim()) newErrors.hoTen = 'Họ tên là bắt buộc';
    if (!trimmedEmail) newErrors.email = 'Email là bắt buộc';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) newErrors.email = 'Email không đúng định dạng';
    if (!phone) newErrors.soDienThoai = 'Số điện thoại là bắt buộc';
    else if (!/^0[0-9]{9,10}$/.test(phone)) newErrors.soDienThoai = 'Số điện thoại 10–11 số, bắt đầu bằng 0';
    if (!form.password) newErrors.password = 'Mật khẩu là bắt buộc';
    else if (form.password.length < 8) newErrors.password = 'Mật khẩu ít nhất 8 ký tự';
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    if (form.bankAccount && !form.bankName) newErrors.bankName = 'Nhập tên ngân hàng khi có số tài khoản';

    if (form.loaiCtv === 'ca_nhan') {
      if (!form.kinhNghiem) newErrors.kinhNghiem = 'Vui lòng chọn mức độ kinh nghiệm';
    } else {
      if (!(form.tenCongTy || '').trim()) newErrors.tenCongTy = 'Tên công ty là bắt buộc';
      if (!(form.mst || '').trim()) newErrors.mst = 'Mã số thuế là bắt buộc';
      if (!(form.diaChiDN || '').trim()) newErrors.diaChiDN = 'Địa chỉ doanh nghiệp là bắt buộc';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildApiPayload = () => {
    const isCompany = form.loaiCtv === 'to_chuc';
    const phone = String(form.soDienThoai || '').replace(/\D/g, '').replace(/\s/g, '').slice(0, 11);

    let description = '';
    if (isCompany) {
      const parts = [];
      if (form.linhVucDN?.length) parts.push('Lĩnh vực: ' + form.linhVucDN.join(', '));
      if ((form.gioiThieuDN || '').trim()) parts.push(form.gioiThieuDN.trim());
      description = parts.join('\n\n');
    } else {
      const parts = [];
      if (form.kinhNghiem === '0') parts.push('Kinh nghiệm: Chưa có kinh nghiệm');
      if (form.kinhNghiem === '1') {
        if (form.namKinhNghiem) parts.push('Số năm kinh nghiệm: ' + form.namKinhNghiem);
        parts.push('Kinh nghiệm: Đã có kinh nghiệm');
      }
      if (form.linhVucCaNhan?.length) parts.push('Lĩnh vực network: ' + form.linhVucCaNhan.join(', '));
      if ((form.gioiThieuCaNhan || '').trim()) parts.push(form.gioiThieuCaNhan.trim());
      description = parts.join('\n\n');
    }

    if (isCompany) {
      const payload = new FormData();
      payload.append('name', (form.hoTen || '').trim());
      payload.append('email', (form.email || '').trim());
      payload.append('password', form.password);
      payload.append('phone', phone);
      if (form.quocGia) payload.append('country', form.quocGia);
      if ((form.zipCode || '').trim()) payload.append('postCode', (form.zipCode || '').trim());
      if ((form.diaChi || '').trim()) payload.append('address', (form.diaChi || '').trim());
      payload.append('organizationType', 'company');
      if (form.ngaySinh) payload.append('birthday', form.ngaySinh);
      if (form.loaiSdt === 'Zalo') payload.append('zalo', phone);
      if ((form.facebookLinkedin || '').trim()) payload.append('organizationLink', (form.facebookLinkedin || '').trim());
      if ((form.bankName || '').trim()) payload.append('bankName', (form.bankName || '').trim());
      if ((form.bankAccount || '').trim()) payload.append('bankAccount', (form.bankAccount || '').trim());
      if ((form.bankAccountName || '').trim()) payload.append('bankAccountName', (form.bankAccountName || '').trim());
      if (description) payload.append('description', description);
      if ((form.tenCongTy || '').trim()) payload.append('companyName', (form.tenCongTy || '').trim());
      if ((form.mst || '').trim()) payload.append('taxCode', (form.mst || '').trim());
      if ((form.website || '').trim()) payload.append('website', (form.website || '').trim());
      if ((form.diaChiDN || '').trim()) payload.append('businessAddress', (form.diaChiDN || '').trim());
      if (form.giayphepFile) payload.append('businessLicenseFile', form.giayphepFile);
      if (form.linhVucDN?.length) payload.append('companySectors', JSON.stringify(form.linhVucDN));
      return payload;
    }

    return {
      name: (form.hoTen || '').trim(),
      email: (form.email || '').trim(),
      password: form.password,
      phone,
      country: form.quocGia || undefined,
      postCode: (form.zipCode || '').trim() || undefined,
      address: (form.diaChi || '').trim() || undefined,
      organizationType: 'individual',
      birthday: form.ngaySinh || undefined,
      zalo: form.loaiSdt === 'Zalo' ? phone : undefined,
      organizationLink: (form.facebookLinkedin || '').trim() || undefined,
      bankName: (form.bankName || '').trim() || undefined,
      bankAccount: (form.bankAccount || '').trim() || undefined,
      bankAccountName: (form.bankAccountName || '').trim() || undefined,
      description: description || undefined,
      hasExperience: form.kinhNghiem,
      yearsExperience: form.namKinhNghiem || undefined,
      sectors: form.linhVucCaNhan?.length ? form.linhVucCaNhan : undefined,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.agreeTerms) {
      alert('Vui lòng đồng ý với Quy định & chính sách sử dụng nền tảng.');
      return;
    }
    if (!validateForm()) return;
    try {
      setLoading(true);
      const payload = buildApiPayload();
      const response = await apiService.registerCTV(payload);
      if (response.success) {
        setSubmitted(true);
      } else {
        alert(response.message || 'Đăng ký thất bại. Vui lòng thử lại.');
      }
    } catch (error) {
      alert(error.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const isCaNhan = form.loaiCtv === 'ca_nhan';
  const { language, changeLanguage } = useLanguage();
  const ht = HEADER_I18N[language] || HEADER_I18N.vi;
  const pt = PAGE_I18N[language] || PAGE_I18N.vi;
  const prefix = '/landing/collaborator';
  const navLinks = [
    { to: prefix, label: ht.navHome },
    { to: `${prefix}/jobs`, label: ht.navJobs },
    { href: '#', label: ht.navAbout },
    { href: '#', label: ht.navPartners },
    { href: '#', label: ht.navFaq },
    { to: `${prefix}/blog`, label: ht.navBlog },
  ];

  return (
    <div style={css.root}>
      <link
        href="https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white shadow-sm">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-3 md:px-6">
          <div className="flex items-center justify-between gap-4">
            <Link to={prefix} className="flex-shrink-0">
              <img
                src="/logo.png"
                alt="Job Share"
                className="h-6 w-auto md:h-7"
              />
            </Link>

            <nav className="hidden items-center gap-6 lg:flex">
              {navLinks.map((item) =>
                item.to != null ? (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="text-xs font-semibold text-neutral-900 transition-colors hover:text-neutral-600"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <a
                    key={item.label}
                    href={item.href}
                    className="text-xs font-semibold text-neutral-900 transition-colors hover:text-neutral-600"
                  >
                    {item.label}
                  </a>
                ),
              )}
            </nav>

            <div className="flex flex-wrap items-center justify-end gap-2 md:gap-3">
              <div className="flex items-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 p-0.5">
                {LANGUAGE_OPTIONS.map((lang) => {
                  const isActive = language === lang;
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => changeLanguage(lang)}
                      className={`h-7 min-w-9 rounded-md px-2 text-[10px] font-bold uppercase transition-colors ${
                        isActive
                          ? 'bg-neutral-900 text-white'
                          : 'text-neutral-700 hover:bg-neutral-200/80'
                      }`}
                      aria-label={`Chuyển sang ngôn ngữ ${lang}`}
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>
              <LandingPersonaSwitcher variant="candidate" />
              <Link
                to="/login"
                className="inline-flex h-8 min-w-[96px] items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 text-[11px] font-semibold text-neutral-900 transition-colors hover:bg-neutral-50"
              >
                {ht.login}
              </Link>
              <Link
                to="/register"
                className="inline-flex h-8 min-w-[96px] items-center justify-center rounded-lg bg-neutral-900 px-3 text-[11px] font-semibold !text-white transition-colors hover:bg-neutral-800"
              >
                {ht.register}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div style={css.hero}>
        <h1 style={css.heroTitle}>{pt.heroTitle}</h1>
        <p style={css.heroSub}>{pt.heroSub}</p>
      </div>

      <div style={css.wrapper}>
        <div style={css.card}>
          <form onSubmit={handleSubmit} noValidate>
            {/* 1. Thông tin cá nhân */}
            <div style={css.sectionTitle}>{pt.personalInfo}</div>

            <div style={css.field}>
              <label style={css.label}>{pt.fullName} <span style={css.req}>*</span></label>
              <FInput type="text" placeholder="Nguyễn Văn A" value={form.hoTen} onChange={set('hoTen')} error={!!errors.hoTen} />
              {errors.hoTen && <p style={css.errText}>{errors.hoTen}</p>}
            </div>

            <div style={css.grid2}>
              <div style={css.field}>
                <label style={css.label}>{pt.birthDate} <span style={css.req}>*</span></label>
                <FInput type="date" value={form.ngaySinh} onChange={set('ngaySinh')} error={!!errors.ngaySinh} />
              </div>
              <div style={css.field}>
                <label style={css.label}>{pt.email} <span style={css.req}>*</span></label>
                <FInput type="email" placeholder="example@email.com" value={form.email} onChange={set('email')} error={!!errors.email} />
                {errors.email && <p style={css.errText}>{errors.email}</p>}
              </div>
            </div>

            <div style={css.field}>
              <label style={css.label}>
                {pt.phone} <span style={css.req}>*</span>
                <span style={css.hint}>{pt.phoneHint}</span>
              </label>
              <div style={css.grid2}>
                <FSelect value={form.loaiSdt} onChange={set('loaiSdt')} style={{ minWidth: 120 }} error={!!errors.soDienThoai}>
                  <option value="Zalo">Zalo</option>
                  <option value="Line">Line</option>
                </FSelect>
                <FInput
                  type="tel"
                  placeholder={form.loaiSdt === 'Zalo' ? 'Số Zalo' : 'Số Line'}
                  value={form.soDienThoai}
                  onChange={set('soDienThoai')}
                  error={!!errors.soDienThoai}
                />
              </div>
              {errors.soDienThoai && <p style={css.errText}>{errors.soDienThoai}</p>}
            </div>

            <div style={css.field}>
              <label style={css.label}>
                {pt.socialLink} <span style={css.hint}>Link hồ sơ (nếu có)</span>
              </label>
              <FInput type="url" placeholder="https://facebook.com/... hoặc linkedin.com/in/..." value={form.facebookLinkedin} onChange={set('facebookLinkedin')} />
            </div>

            <div style={css.field}>
              <label style={css.label}>{pt.currentCountry} <span style={css.req}>*</span></label>
              <div style={css.grid3}>
                <FSelect value={form.quocGia} onChange={set('quocGia')} error={!!errors.quocGia}>
                  <option value="">{pt.country}</option>
                  {QUOC_GIA_OPTIONS.map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </FSelect>
                <FInput type="text" placeholder={pt.postalCode} value={form.zipCode} onChange={set('zipCode')} />
                <FInput type="text" placeholder={pt.addressDetail} value={form.diaChi} onChange={set('diaChi')} />
              </div>
            </div>

            <hr style={css.divider} />

            {/* 2. Hình thức tổ chức */}
            <div style={css.sectionTitle}>{pt.orgType}</div>

            <div style={{ ...css.field, ...css.toggleGroup }}>
              {[
                { value: 'ca_nhan', label: pt.individual },
                { value: 'to_chuc', label: pt.company },
              ].map((opt) => {
                const checked = form.loaiCtv === opt.value;
                return (
                  <label
                    key={opt.value}
                    style={css.toggleOption(checked)}
                    onClick={() => setForm((p) => ({ ...p, loaiCtv: opt.value }))}
                  >
                    <div style={css.radioCircle(checked)} />
                    {opt.label}
                  </label>
                );
              })}
            </div>

            {/* 3a. Cá nhân */}
            {isCaNhan && (
              <>
                <hr style={css.divider} />
                <div style={css.sectionTitle}>{pt.extraInfo}</div>
                <p style={css.subDesc}>{language === 'ja' ? 'いくつかの情報をご回答いただき、あなたをより理解できるようにご協力ください。' : pt.introSelfHint}</p>

                <div style={css.field}>
                  <label style={css.label}>
                    {pt.expQuestion} <span style={css.req}>*</span>
                  </label>
                  <div style={{ ...css.checkGroup, gap: 12 }}>
                    <label style={css.checkItem}>
                      <input type="radio" name="kinhNghiem" value="0" checked={form.kinhNghiem === '0'} onChange={set('kinhNghiem')} style={{ accentColor: C.red }} />
                      <span>{pt.noExp}</span>
                    </label>
                    <div>
                      <label style={{ ...css.checkItem, marginBottom: 10 }}>
                        <input type="radio" name="kinhNghiem" value="1" checked={form.kinhNghiem === '1'} onChange={set('kinhNghiem')} style={{ accentColor: C.red }} />
                        <span>{pt.yesExp}</span>
                      </label>
                      {form.kinhNghiem === '1' && (
                        <div style={css.expInline}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{pt.yearsExp}</span>
                          <FSelect value={form.namKinhNghiem} onChange={set('namKinhNghiem')} style={{ width: 'auto', minWidth: 160 }}>
                            <option value="">{pt.choose}</option>
                            {NAM_KN_OPTIONS.map((y) => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </FSelect>
                        </div>
                      )}
                    </div>
                  </div>
                  {errors.kinhNghiem && <p style={css.errText}>{errors.kinhNghiem}</p>}
                </div>

                <div style={css.field}>
                  <label style={css.label}>{pt.networkField}</label>
                  <SearchableMultiSelect
                    options={LINH_VUC}
                    value={form.linhVucCaNhan}
                    onChange={(arr) => setForm((p) => ({ ...p, linhVucCaNhan: arr }))}
                    placeholder="Gõ để tìm, chọn nhiều lĩnh vực..."
                  />
                </div>

                <div style={css.field}>
                  <label style={css.label}>
                    {pt.introSelf} <span style={css.hint}>{pt.introSelfHint}</span>
                  </label>
                  <FTextarea
                    placeholder={pt.introSelfPlaceholder}
                    value={form.gioiThieuCaNhan}
                    onChange={set('gioiThieuCaNhan')}
                  />
                </div>
              </>
            )}

            {/* 3b. Doanh nghiệp */}
            {!isCaNhan && (
              <>
                <hr style={css.divider} />
                <div style={css.sectionTitle}>{pt.companyInfo}</div>

                <div style={css.grid2}>
                  <div style={css.field}>
                    <label style={css.label}>{pt.companyName} <span style={css.req}>*</span></label>
                    <FInput type="text" placeholder="Tên đầy đủ của công ty" value={form.tenCongTy} onChange={set('tenCongTy')} error={!!errors.tenCongTy} />
                    {errors.tenCongTy && <p style={css.errText}>{errors.tenCongTy}</p>}
                  </div>
                  <div style={css.field}>
                    <label style={css.label}>{pt.website}</label>
                    <FInput type="url" placeholder="https://company.com" value={form.website} onChange={set('website')} />
                  </div>
                </div>

                <div style={css.grid2}>
                  <div style={css.field}>
                    <label style={css.label}>{pt.taxCode} <span style={css.req}>*</span></label>
                    <FInput type="text" placeholder="0123456789" value={form.mst} onChange={set('mst')} error={!!errors.mst} />
                    {errors.mst && <p style={css.errText}>{errors.mst}</p>}
                  </div>
                  <div style={css.field}>
                    <label style={css.label}>{pt.businessAddress} <span style={css.req}>*</span></label>
                    <FInput type="text" placeholder="Địa chỉ trụ sở chính" value={form.diaChiDN} onChange={set('diaChiDN')} error={!!errors.diaChiDN} />
                    {errors.diaChiDN && <p style={css.errText}>{errors.diaChiDN}</p>}
                  </div>
                </div>

                <div style={css.field}>
                  <label style={css.label}>
                    {pt.businessLicense} <span style={css.req}>*</span>
                    <span style={css.hint}>{pt.filePdf}</span>
                  </label>
                  <label style={css.uploadZone(!!uploadedFileName)}>
                    <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleFile} />
                    <div style={css.upIcon}>📄</div>
                    {uploadedFileName ? (
                      <p style={{ ...css.upText, color: C.red }}>
                        <strong>{uploadedFileName}</strong> đã được chọn
                      </p>
                    ) : (
                      <>
                        <p style={css.upText}>
                          <strong style={{ color: C.red }}>{pt.uploadHere}</strong> {pt.orDrop}
                        </p>
                        <p style={css.upHint}>{pt.pdfOnly}</p>
                      </>
                    )}
                  </label>
                </div>

                <div style={css.field}>
                  <label style={css.label}>{pt.companyNetwork}</label>
                  <SearchableMultiSelect
                    options={LINH_VUC}
                    value={form.linhVucDN}
                    onChange={(arr) => setForm((p) => ({ ...p, linhVucDN: arr }))}
                    placeholder="Gõ để tìm, chọn nhiều lĩnh vực..."
                  />
                </div>

                <div style={css.field}>
                  <label style={css.label}>{pt.introCompany} <span style={css.hint}>{pt.introCompanyHint}</span></label>
                  <FTextarea
                    placeholder={pt.introCompanyPlaceholder}
                    value={form.gioiThieuDN}
                    onChange={set('gioiThieuDN')}
                  />
                </div>
              </>
            )}

            {/* Mật khẩu đăng nhập */}
            <hr style={css.divider} />
            <div style={css.sectionTitle}>{pt.loginPassword}</div>
            <div style={css.grid2}>
              <div style={css.field}>
                <label style={css.label}>{pt.password} <span style={css.req}>*</span></label>
                <FInput type="password" placeholder={pt.passwordHint} value={form.password} onChange={set('password')} error={!!errors.password} />
                {errors.password && <p style={css.errText}>{errors.password}</p>}
              </div>
              <div style={css.field}>
                <label style={css.label}>{pt.passwordConfirm} <span style={css.req}>*</span></label>
                <FInput type="password" placeholder={pt.confirmPasswordPlaceholder} value={form.confirmPassword} onChange={set('confirmPassword')} error={!!errors.confirmPassword} />
                {errors.confirmPassword && <p style={css.errText}>{errors.confirmPassword}</p>}
              </div>
            </div>

            {/* Thông tin ngân hàng (tùy chọn) */}
            <div style={css.field}>
              <div style={{ ...css.sectionTitle, marginBottom: 12 }}>{pt.bankInfo} <span style={css.hint}>{pt.bankOptional}</span></div>
              <div style={css.grid2}>
                <div style={css.field}>
                  <label style={css.label}>{pt.bankName}</label>
                  <FInput type="text" placeholder="VD: Vietcombank" value={form.bankName} onChange={set('bankName')} error={!!errors.bankName} />
                  {errors.bankName && <p style={css.errText}>{errors.bankName}</p>}
                </div>
                <div style={css.field}>
                  <label style={css.label}>{pt.bankAccount}</label>
                  <FInput type="text" placeholder={pt.bankOptional} value={form.bankAccount} onChange={set('bankAccount')} />
                </div>
              </div>
              <div style={css.field}>
                <label style={css.label}>{pt.bankAccountName}</label>
                <FInput type="text" placeholder={pt.bankOptional} value={form.bankAccountName} onChange={set('bankAccountName')} />
              </div>
            </div>

            {/* Đồng ý + Nút gửi */}
            <div style={css.submitRow}>
              <label style={css.agreeLabel}>
                <input
                  type="checkbox"
                  style={{ marginTop: 3, width: 16, height: 16, accentColor: C.red, flexShrink: 0, cursor: 'pointer' }}
                  checked={form.agreeTerms}
                  onChange={(e) => setForm((p) => ({ ...p, agreeTerms: e.target.checked }))}
                />
                <span>
                  {pt.termsText}{' '}
                  <button
                    type="button"
                    onClick={() => setLegalPanelOpen(true)}
                    style={{ ...css.agreeLink, background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}
                  >
                    {pt.termsLink}
                  </button>
                </span>
              </label>
              <button type="submit" style={css.btnSubmit(!form.agreeTerms || loading)} disabled={!form.agreeTerms || loading}>
                {loading ? pt.submitting : pt.submit}
              </button>
            </div>
          </form>
        </div>
      </div>

      <p style={{ textAlign: 'center', fontSize: 14, color: C.gray, marginTop: 24, marginBottom: 40 }}>
        {pt.haveAccount} <Link to="/login" style={css.agreeLink}>{pt.login}</Link>
      </p>

      {/* Success overlay */}
      <LegalPoliciesSlidePanel
        open={legalPanelOpen}
        onClose={() => setLegalPanelOpen(false)}
        mode="threeTabs"
        initialTab="privacy"
      />

      {submitted && (
        <div style={css.overlay} onClick={() => { setSubmitted(false); navigate('/login'); }}>
          <div style={css.successBox} onClick={(e) => e.stopPropagation()}>
            <div style={css.checkCircle}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 style={{ fontSize: 22, color: C.gray, marginBottom: 10 }}>{pt.successTitle}</h2>
            <p style={{ fontSize: 14, color: '#999', lineHeight: 1.6 }}>
              {pt.successBody}
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{ ...css.btnSubmit(false), marginTop: 20 }}
            >
              {pt.successLogin}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterPage;
