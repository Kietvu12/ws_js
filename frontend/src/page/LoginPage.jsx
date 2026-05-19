import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Loader2, Eye, EyeOff, Globe, MessageCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations/translations';
import logoImage from '../assets/Login_files/logo-removebg-preview-C0FMBBYQ.png';
import apiService from '../services/api';

const LoginPage = ({ defaultUserType = 'ctv' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, changeLanguage } = useLanguage();
  const t = translations[language] || translations.vi;
  
  // Xác định userType mặc định dựa trên route
  const initialUserType = location.pathname === '/admin/login' ? 'admin' : (defaultUserType || 'ctv');
  const [userType, setUserType] = useState(initialUserType);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const languageMenuRef = useRef(null);
  const [isLanguageButtonHovered, setIsLanguageButtonHovered] = useState(false);
  const [hoveredLanguageItem, setHoveredLanguageItem] = useState(null);
  const [isSubmitButtonHovered, setIsSubmitButtonHovered] = useState(false);
  const [isChatButtonHovered, setIsChatButtonHovered] = useState(false);
  const [isEyeButtonHovered, setIsEyeButtonHovered] = useState(false);

  // Forgot password state
  const [view, setView] = useState('login'); // 'login' | 'forgotPassword'
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const languages = [
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
  ];

  // Cập nhật userType khi route thay đổi
  useEffect(() => {
    const newUserType = location.pathname === '/admin/login' ? 'admin' : (defaultUserType || 'ctv');
    setUserType(newUserType);
    setError(''); // Reset error khi chuyển route
  }, [location.pathname, defaultUserType]);

  // Kiểm tra nếu đã đăng nhập thì redirect về trang tương ứng
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUserType = localStorage.getItem('userType');
    
    if (token && storedUserType) {
      if (storedUserType === 'ctv') {
        navigate('/agent', { replace: true });
      } else if (storedUserType === 'admin') {
        navigate('/admin', { replace: true });
      }
    }
  }, [navigate]);

  // Close language menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target)) {
        setShowLanguageMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Xóa lỗi khi người dùng bắt đầu nhập
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate
      if (!formData.email || !formData.password) {
        setError(t.pleaseEnterEmailPassword);
        setLoading(false);
        return;
      }

      // Gọi API đăng nhập
      let response;
      if (userType === 'ctv') {
        response = await apiService.loginCTV({
          email: formData.email,
          password: formData.password,
        });
      } else {
        response = await apiService.loginAdmin({
          email: formData.email,
          password: formData.password,
        });
      }

      // Lưu token vào localStorage
      // Backend trả về: { success: true, message: '...', data: { token, collaborator/admin } }
      // handleResponse trả về: { success: true, message: '...', data: { token, ... } }
      if (response.success && response.data?.token) {
        localStorage.setItem('token', response.data.token);
        
        // Lưu thông tin user
        if (userType === 'ctv') {
          localStorage.setItem('userType', 'ctv');
          if (response.data.collaborator) {
            localStorage.setItem('user', JSON.stringify(response.data.collaborator));
          }
          navigate('/agent');
        } else {
          localStorage.setItem('userType', 'admin');
          if (response.data.admin) {
            localStorage.setItem('user', JSON.stringify(response.data.admin));
          }
          navigate('/admin');
        }
      } else {
        setError(response.message || t.loginFailed);
      }
    } catch (err) {
      setError(err.message || t.loginFailedCheck);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToAdmin = () => {
    navigate('/admin/login');
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!forgotEmail) {
      setError(t.pleaseEnterEmailPassword);
      return;
    }
    setLoading(true);
    try {
      const response = userType === 'admin'
        ? await apiService.forgotPasswordAdmin(forgotEmail)
        : await apiService.forgotPasswordCTV(forgotEmail);
      if (response.success) {
        setForgotSuccess(true);
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
      {/* Language Switcher - Top Left */}
      <div className="fixed top-6 left-6 z-50">
        <div className="relative" ref={languageMenuRef}>
          <button
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
            onMouseEnter={() => setIsLanguageButtonHovered(true)}
            onMouseLeave={() => setIsLanguageButtonHovered(false)}
            className="border-2 rounded-lg px-4 py-2 flex items-center gap-2 shadow-md transition-colors"
            style={{ 
              fontFamily: '"Myriad Pro", sans-serif',
              backgroundColor: isLanguageButtonHovered ? '#dc2626' : 'white',
              borderColor: '#dc2626'
            }}
          >
            <Globe className="text-xl transition-colors" style={{ color: isLanguageButtonHovered ? 'white' : '#1f2937' }} />
            <span className="text-sm font-medium transition-colors" style={{ color: isLanguageButtonHovered ? 'white' : '#1f2937' }}>
              {languages.find(lang => lang.code === language)?.flag} {languages.find(lang => lang.code === language)?.name}
            </span>
          </button>
          {showLanguageMenu && (
            <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    changeLanguage(lang.code);
                    setShowLanguageMenu(false);
                  }}
                  onMouseEnter={() => setHoveredLanguageItem(lang.code)}
                  onMouseLeave={() => setHoveredLanguageItem(null)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left transition-colors"
                  style={{
                    backgroundColor: hoveredLanguageItem === lang.code ? '#f9fafb' : (language === lang.code ? '#fef2f2' : 'transparent'),
                    color: language === lang.code ? '#dc2626' : '#374151'
                  }}
                >
                  <span>{lang.flag}</span>
                  <span className="text-sm font-medium">{lang.name}</span>
                  {language === lang.code && (
                    <span className="ml-auto" style={{ color: '#dc2626' }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-5xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-black">
        <div className="flex flex-col lg:flex-row">
          {/* Left Column - Logo and Links */}
          <div className="bg-white p-8 lg:p-12 flex flex-col justify-center items-center lg:items-start lg:w-2/5 relative" style={{ fontFamily: '"Myriad Pro", sans-serif' }}>
            <Link
              to="/"
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-red-600 transition-colors mb-6 w-full justify-center lg:justify-start no-underline"
              style={{ fontFamily: '"Myriad Pro", sans-serif' }}
            >
              <ArrowLeft className="w-4 h-4 flex-shrink-0" />
              Quay lại trang chủ
            </Link>
            <div className="mb-8 lg:mb-12 w-full">
              <div className="flex justify-center lg:justify-start mb-8">
                <img 
                  alt="JobShare Logo" 
                  className="h-20 lg:h-24 w-auto object-contain" 
                  src={logoImage}
                />
              </div>
            </div>
            <div className="space-y-3 w-full mt-auto">
              {view === 'login' ? (
                <>
                  <button
                    type="button"
                    onClick={() => { setView('forgotPassword'); setError(''); setForgotSuccess(false); setForgotEmail(''); }}
                    className="block text-black hover:text-red-700 text-sm transition-colors text-center lg:text-left underline bg-transparent border-none cursor-pointer p-0 w-full lg:w-auto"
                    style={{ fontFamily: '"Myriad Pro", sans-serif' }}
                  >
                    {t.forgotPassword}
                  </button>
                  <Link
                    to="/register"
                    className="block text-black hover:text-red-700 text-sm transition-colors text-center lg:text-left underline"
                    style={{ fontFamily: '"Myriad Pro", sans-serif' }}
                  >
                    {t.newRegistration}
                  </Link>
                  {userType === 'admin' && (
                    <a
                      href="/login"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate('/login');
                      }}
                      className="block text-black hover:text-red-700 text-sm transition-colors text-center lg:text-left underline"
                      style={{ fontFamily: '"Myriad Pro", sans-serif' }}
                    >
                      {t.loginAsAgent}
                    </a>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => { setView('login'); setError(''); setForgotSuccess(false); }}
                  className="block text-black hover:text-red-700 text-sm transition-colors text-center lg:text-left underline bg-transparent border-none cursor-pointer p-0 w-full lg:w-auto"
                  style={{ fontFamily: '"Myriad Pro", sans-serif' }}
                >
                  {t.backToLogin}
                </button>
              )}
            </div>
          </div>

          {/* Right Column - Login Form / Forgot Password Form */}
          <div className="bg-white p-8 lg:p-12 flex-1 lg:w-3/5" style={{ fontFamily: '"Myriad Pro", sans-serif' }}>
            {view === 'login' ? (
              <form onSubmit={handleSubmit} className="max-w-md mx-auto lg:mx-0">
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2" style={{ fontFamily: '"Myriad Pro", sans-serif' }}>
                    {userType === 'ctv' ? t.loginAgent : t.loginAdmin}
                  </h2>
                </div>

                <div className="space-y-5">
                  {/* Email Field */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-900 mb-2" style={{ fontFamily: '"Myriad Pro", sans-serif' }}>
                      Email
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        <Mail className="w-5 h-5" />
                      </div>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Email"
                        className="w-full pl-12 pr-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all text-gray-900 placeholder-gray-400"
                        style={{ fontFamily: '"Myriad Pro", sans-serif' }}
                        required
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-900 mb-2" style={{ fontFamily: '"Myriad Pro", sans-serif' }}>
                      {t.password}
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder={t.passwordPlaceholder}
                        className="w-full pl-12 pr-12 py-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all text-gray-900 placeholder-gray-400"
                        style={{ fontFamily: '"Myriad Pro", sans-serif' }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        onMouseEnter={() => setIsEyeButtonHovered(true)}
                        onMouseLeave={() => setIsEyeButtonHovered(false)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors"
                        style={{
                          color: isEyeButtonHovered ? '#b91c1c' : '#6b7280'
                        }}
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    onMouseEnter={() => setIsSubmitButtonHovered(true)}
                    onMouseLeave={() => setIsSubmitButtonHovered(false)}
                    className={`w-full py-3.5 rounded-lg transition-colors font-semibold shadow-md transition-all duration-200 ${
                      loading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    style={{ 
                      fontFamily: '"Myriad Pro", sans-serif',
                      backgroundColor: isSubmitButtonHovered ? '#b91c1c' : '#dc2626',
                      color: 'white',
                      boxShadow: isSubmitButtonHovered ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                      transform: isSubmitButtonHovered ? 'translateY(-2px)' : 'translateY(0)'
                    }}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{t.loggingIn}</span>
                      </span>
                    ) : (
                      t.login
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="max-w-md mx-auto lg:mx-0">
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2" style={{ fontFamily: '"Myriad Pro", sans-serif' }}>
                    {t.forgotPasswordTitle}
                  </h2>
                  <p className="text-sm text-gray-500">{t.forgotPasswordDesc}</p>
                </div>

                {forgotSuccess ? (
                  <div className="space-y-5">
                    <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                      <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>{t.forgotPasswordDesc}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setView('login'); setError(''); setForgotSuccess(false); }}
                      onMouseEnter={() => setIsSubmitButtonHovered(true)}
                      onMouseLeave={() => setIsSubmitButtonHovered(false)}
                      className="w-full py-3.5 rounded-lg font-semibold shadow-md transition-all duration-200"
                      style={{
                        fontFamily: '"Myriad Pro", sans-serif',
                        backgroundColor: isSubmitButtonHovered ? '#b91c1c' : '#dc2626',
                        color: 'white'
                      }}
                    >
                      {t.backToLogin}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-5">
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-900 mb-2" style={{ fontFamily: '"Myriad Pro", sans-serif' }}>
                        Email
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                          <Mail className="w-5 h-5" />
                        </div>
                        <input
                          type="email"
                          value={forgotEmail}
                          onChange={(e) => { setForgotEmail(e.target.value); if (error) setError(''); }}
                          placeholder="Email"
                          className="w-full pl-12 pr-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-all text-gray-900 placeholder-gray-400"
                          style={{ fontFamily: '"Myriad Pro", sans-serif' }}
                          required
                        />
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
                      onMouseEnter={() => setIsSubmitButtonHovered(true)}
                      onMouseLeave={() => setIsSubmitButtonHovered(false)}
                      className={`w-full py-3.5 rounded-lg font-semibold shadow-md transition-all duration-200 ${
                        loading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      style={{
                        fontFamily: '"Myriad Pro", sans-serif',
                        backgroundColor: isSubmitButtonHovered ? '#b91c1c' : '#dc2626',
                        color: 'white',
                        boxShadow: isSubmitButtonHovered ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        transform: isSubmitButtonHovered ? 'translateY(-2px)' : 'translateY(0)'
                      }}
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>{t.sending}</span>
                        </span>
                      ) : (
                        t.sendResetLink
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Button - Bottom Right */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <div className="relative">
          <button 
            onMouseEnter={() => setIsChatButtonHovered(true)}
            onMouseLeave={() => setIsChatButtonHovered(false)}
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors"
            style={{
              backgroundColor: isChatButtonHovered ? '#b91c1c' : '#dc2626'
            }}
          >
            <MessageCircle className="text-xl" style={{ color: 'white' }} />
          </button>
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            1
          </span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
