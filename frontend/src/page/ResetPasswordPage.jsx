import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, AlertCircle, Loader2, Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations/translations';
import logoImage from '../assets/Login_files/logo-removebg-preview-C0FMBBYQ.png';
import apiService from '../services/api';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const userType = (searchParams.get('userType') || 'ctv').toLowerCase();
  const isAdminReset = userType === 'admin';
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
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
      const response = isAdminReset
        ? await apiService.resetPasswordAdmin(token, password)
        : await apiService.resetPasswordCTV(token, password);
      if (response.success) {
        setSuccess(true);
      } else {
        setError(response.message || t.loginFailed);
      }
    } catch (err) {
      setError(err.message || t.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center relative py-8" style={{ fontFamily: '"Myriad Pro", sans-serif' }}>
      <div className="w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-black">
        <div className="p-8 lg:p-12">
          <div className="flex justify-center mb-8">
            <img alt="JobShare Logo" className="h-20 w-auto object-contain" src={logoImage} />
          </div>

          <h2 className="text-2xl font-semibold text-gray-900 mb-2 text-center" style={{ fontFamily: '"Myriad Pro", sans-serif' }}>
            {t.resetPasswordTitle}
          </h2>

          {success ? (
            <div className="space-y-5 mt-6">
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{t.resetPasswordTitle} — OK!</span>
              </div>
              <button
                type="button"
                onClick={() => navigate(isAdminReset ? '/login?type=admin' : '/login')}
                className="w-full py-3.5 rounded-lg font-semibold shadow-md transition-all duration-200 hover:bg-red-700"
                style={{ fontFamily: '"Myriad Pro", sans-serif', backgroundColor: '#dc2626', color: 'white' }}
              >
                {t.backToLogin}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 mt-6">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-900 mb-2">{t.newPassword}</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }}
                    placeholder={t.newPasswordPlaceholder}
                    className="w-full pl-12 pr-12 py-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all text-gray-900 placeholder-gray-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-red-700 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-900 mb-2">{t.confirmPassword}</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError(''); }}
                    placeholder={t.confirmPasswordPlaceholder}
                    className="w-full pl-12 pr-12 py-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all text-gray-900 placeholder-gray-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-red-700 transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 rounded-lg font-semibold shadow-md transition-all duration-200 hover:bg-red-700 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{ fontFamily: '"Myriad Pro", sans-serif', backgroundColor: '#dc2626', color: 'white' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t.resetting}</span>
                  </span>
                ) : (
                  t.resetPassword
                )}
              </button>

              <div className="text-center">
                <Link
                  to={isAdminReset ? '/login?type=admin' : '/login'}
                  className="text-sm text-gray-600 hover:text-red-700 underline transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 inline mr-1" />
                  {t.backToLogin}
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
