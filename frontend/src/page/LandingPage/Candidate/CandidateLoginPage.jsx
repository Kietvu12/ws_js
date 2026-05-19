import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, Loader2 } from 'lucide-react';
import CandidateAuthShell from './CandidateAuthShell';
import { useCandidateAuth } from '../../../context/CandidateAuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import apiService from '../../../services/api';

const seoMeta = {
  vi: { title: 'Đăng nhập ứng viên | Workstation JobShare', description: 'Đăng nhập tài khoản ứng viên JobShare để tìm việc kỹ sư tại Nhật Bản, quản lý hồ sơ và theo dõi ứng tuyển.' },
  en: { title: 'Candidate Sign In | Workstation JobShare', description: 'Sign in to your JobShare candidate account to find engineering jobs in Japan, manage your profile and track applications.' },
  ja: { title: '応募者ログイン | Workstation JobShare', description: 'JobShareの応募者アカウントにログインして、日本のエンジニア求人を検索し、プロフィール管理や応募状況を確認しましょう。' },
};

const STR = {
  vi: {
    formTitle: 'Đăng nhập',
    formSubtitle: 'Tiếp tục với tài khoản ứng viên của bạn',
    email: 'Email',
    password: 'Mật khẩu',
    forgot: 'Quên mật khẩu?',
    submit: 'Đăng nhập',
    noAccount: 'Chưa có tài khoản?',
    signUp: 'Đăng ký',
    errorGeneric: 'Đăng nhập thất bại. Vui lòng thử lại.',
    forgotTitle: 'Quên mật khẩu',
    forgotSubtitle: 'Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.',
    sendResetLink: 'Gửi liên kết đặt lại',
    sending: 'Đang gửi...',
    backToLogin: '\u2190 Quay lại đăng nhập',
    forgotSuccessMsg: 'Nếu email tồn tại, bạn sẽ nhận được liên kết đặt lại mật khẩu trong hộp thư.',
  },
  en: {
    formTitle: 'Sign in',
    formSubtitle: 'Continue with your candidate account',
    email: 'Email',
    password: 'Password',
    forgot: 'Forgot password?',
    submit: 'Sign in',
    noAccount: "Don\u2019t have an account?",
    signUp: 'Sign up',
    errorGeneric: 'Sign-in failed. Please try again.',
    forgotTitle: 'Forgot Password',
    forgotSubtitle: 'Enter your registered email to receive a password reset link.',
    sendResetLink: 'Send Reset Link',
    sending: 'Sending...',
    backToLogin: '\u2190 Back to sign in',
    forgotSuccessMsg: 'If that email exists, you will receive a password reset link in your inbox.',
  },
  ja: {
    formTitle: 'ログイン',
    formSubtitle: '応募者アカウントで続行',
    email: 'メール',
    password: 'パスワード',
    forgot: 'パスワードをお忘れですか？',
    submit: 'ログイン',
    noAccount: 'アカウントをお持ちでない方',
    signUp: '新規登録',
    errorGeneric: 'ログインに失敗しました。もう一度お試しください。',
    forgotTitle: 'パスワードをお忘れの場合',
    forgotSubtitle: '登録したメールアドレスを入力して、パスワードリセットリンクを受け取ってください。',
    sendResetLink: 'リセットリンクを送信',
    sending: '送信中...',
    backToLogin: '\u2190 ログインに戻る',
    forgotSuccessMsg: 'メールアドレスが存在する場合、パスワードリセットリンクが届きます。',
  },
};

export default function CandidateLoginPage() {
  const location = useLocation();
  const { pathname } = location;
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = STR[language] || STR.vi;
  const { setAuth } = useCandidateAuth();

  const prefix = pathname.startsWith('/landing/candidate') ? '/landing/candidate' : '/candidate';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [view, setView] = useState('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiService.loginApplicant({
        email: email.trim(),
        password,
      });
      if (res.success && res.data?.token && res.data?.applicant) {
        setAuth(res.data.token, res.data.applicant);
        const dest = location.state && typeof location.state.from === 'string' ? location.state.from : null;
        navigate(typeof dest === 'string' && dest.startsWith('/') ? dest : prefix, { replace: true });
        return;
      }
      setError(res.message || t.errorGeneric);
    } catch (err) {
      setError(err.message || t.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  const onForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!forgotEmail.trim()) return;
    setLoading(true);
    try {
      const res = await apiService.forgotPasswordApplicant(forgotEmail.trim());
      if (res.success) {
        setForgotSuccess(true);
      } else {
        setError(res.message || t.errorGeneric);
      }
    } catch (err) {
      setError(err.message || t.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  const switchToForgot = () => {
    setView('forgot');
    setError('');
    setForgotSuccess(false);
    setForgotEmail('');
  };

  const switchToLogin = () => {
    setView('login');
    setError('');
    setForgotSuccess(false);
  };

  const seo = seoMeta[language] || seoMeta.vi;
  const formTitle = view === 'login' ? t.formTitle : t.forgotTitle;
  const formSubtitle = view === 'login' ? t.formSubtitle : t.forgotSubtitle;

  return (
    <CandidateAuthShell formTitle={formTitle} formSubtitle={formSubtitle}>
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {view === 'login' ? (
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </div>
          ) : null}

          <div>
            <label htmlFor="cand-login-email" className="mb-1.5 block text-sm font-medium text-slate-700">
              {t.email}
            </label>
            <input
              id="cand-login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label htmlFor="cand-login-password" className="mb-1.5 block text-sm font-medium text-slate-700">
              {t.password}
            </label>
            <div className="relative">
              <input
                id="cand-login-password"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-4 pr-11 text-sm text-slate-900 outline-none transition-shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-1.5 text-right">
              <button
                type="button"
                onClick={switchToForgot}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-transparent border-none cursor-pointer p-0"
              >
                {t.forgot}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? '\u2026' : t.submit}
          </button>

          <p className="text-center text-sm text-slate-600">
            {t.noAccount}{' '}
            <Link to={`${prefix}/register`} className="font-semibold text-blue-600 hover:text-blue-800">
              {t.signUp}
            </Link>
          </p>
        </form>
      ) : (
        <div className="flex flex-col gap-5">
          {forgotSuccess ? (
            <>
              <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-3 py-3 text-sm text-green-700">
                <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span>{t.forgotSuccessMsg}</span>
              </div>
              <button
                type="button"
                onClick={switchToLogin}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition-colors hover:bg-blue-700"
              >
                {t.backToLogin}
              </button>
            </>
          ) : (
            <form onSubmit={onForgotSubmit} className="flex flex-col gap-5">
              {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {error}
                </div>
              ) : null}

              <div>
                <label htmlFor="cand-forgot-email" className="mb-1.5 block text-sm font-medium text-slate-700">
                  {t.email}
                </label>
                <input
                  id="cand-forgot-email"
                  type="email"
                  autoComplete="email"
                  value={forgotEmail}
                  onChange={(e) => { setForgotEmail(e.target.value); if (error) setError(''); }}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t.sending}</span>
                  </span>
                ) : (
                  t.sendResetLink
                )}
              </button>

              <button
                type="button"
                onClick={switchToLogin}
                className="text-center text-sm font-medium text-blue-600 hover:text-blue-800 bg-transparent border-none cursor-pointer"
              >
                {t.backToLogin}
              </button>
            </form>
          )}
        </div>
      )}
    </CandidateAuthShell>
  );
}
