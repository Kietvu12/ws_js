import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, Loader2 } from 'lucide-react';
import CandidateAuthShell from './CandidateAuthShell';
import { useLanguage } from '../../../context/LanguageContext';
import apiService from '../../../services/api';

const STR = {
  vi: {
    title: 'Đặt lại mật khẩu',
    subtitle: 'Nhập mật khẩu mới cho tài khoản ứng viên của bạn.',
    newPassword: 'Mật khẩu mới',
    newPasswordPlaceholder: 'Tối thiểu 8 ký tự',
    confirmPassword: 'Xác nhận mật khẩu',
    confirmPasswordPlaceholder: 'Nhập lại mật khẩu',
    submit: 'Đặt lại mật khẩu',
    resetting: 'Đang xử lý...',
    backToLogin: '\u2190 Quay lại đăng nhập',
    successMsg: 'Mật khẩu đã được đặt lại thành công!',
    passwordMismatch: 'Mật khẩu xác nhận không khớp',
    passwordTooShort: 'Mật khẩu phải có ít nhất 8 ký tự',
    errorGeneric: 'Có lỗi xảy ra. Vui lòng thử lại.',
  },
  en: {
    title: 'Reset Password',
    subtitle: 'Enter a new password for your candidate account.',
    newPassword: 'New Password',
    newPasswordPlaceholder: 'Minimum 8 characters',
    confirmPassword: 'Confirm Password',
    confirmPasswordPlaceholder: 'Re-enter password',
    submit: 'Reset Password',
    resetting: 'Processing...',
    backToLogin: '\u2190 Back to sign in',
    successMsg: 'Your password has been reset successfully!',
    passwordMismatch: 'Passwords do not match',
    passwordTooShort: 'Password must be at least 8 characters',
    errorGeneric: 'Something went wrong. Please try again.',
  },
  ja: {
    title: 'パスワードリセット',
    subtitle: '応募者アカウントの新しいパスワードを入力してください。',
    newPassword: '新しいパスワード',
    newPasswordPlaceholder: '8文字以上',
    confirmPassword: 'パスワード確認',
    confirmPasswordPlaceholder: 'パスワードを再入力',
    submit: 'パスワードをリセット',
    resetting: '処理中...',
    backToLogin: '\u2190 ログインに戻る',
    successMsg: 'パスワードが正常にリセットされました！',
    passwordMismatch: 'パスワードが一致しません',
    passwordTooShort: 'パスワードは8文字以上必要です',
    errorGeneric: 'エラーが発生しました。もう一度お試しください。',
  },
};

export default function CandidateResetPasswordPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const { language } = useLanguage();
  const t = STR[language] || STR.vi;

  const prefix = pathname.startsWith('/landing/candidate') ? '/landing/candidate' : '/candidate';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError(t.passwordTooShort);
      return;
    }
    if (password !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    setLoading(true);
    try {
      const res = await apiService.resetPasswordApplicant(token, password);
      if (res.success) {
        setSuccess(true);
      } else {
        setError(res.message || t.errorGeneric);
      }
    } catch (err) {
      setError(err.message || t.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CandidateAuthShell formTitle={t.title} formSubtitle={t.subtitle}>
      <Helmet>
        <title>{t.title} | Workstation JobShare</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {success ? (
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-3 py-3 text-sm text-green-700">
            <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span>{t.successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => navigate(`${prefix}/login`)}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition-colors hover:bg-blue-700"
          >
            {t.backToLogin}
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </div>
          ) : null}

          <div>
            <label htmlFor="cand-reset-pw" className="mb-1.5 block text-sm font-medium text-slate-700">
              {t.newPassword}
            </label>
            <div className="relative">
              <input
                id="cand-reset-pw"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }}
                placeholder={t.newPasswordPlaceholder}
                required
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-4 pr-11 text-sm text-slate-900 outline-none transition-shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="cand-reset-pw-confirm" className="mb-1.5 block text-sm font-medium text-slate-700">
              {t.confirmPassword}
            </label>
            <div className="relative">
              <input
                id="cand-reset-pw-confirm"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError(''); }}
                placeholder={t.confirmPasswordPlaceholder}
                required
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-4 pr-11 text-sm text-slate-900 outline-none transition-shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t.resetting}</span>
              </span>
            ) : (
              t.submit
            )}
          </button>

          <Link
            to={`${prefix}/login`}
            className="block text-center text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            {t.backToLogin}
          </Link>
        </form>
      )}
    </CandidateAuthShell>
  );
}
