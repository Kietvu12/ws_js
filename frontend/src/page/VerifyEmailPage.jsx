import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import apiService from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language, changeLanguage } = useLanguage();
  const token = useMemo(() => (searchParams.get('token') || '').trim(), [searchParams]);
  const [state, setState] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('Đang xác thực email...');
  const [showPopup, setShowPopup] = useState(false);
  const [moveLogoTop, setMoveLogoTop] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hoveredLang, setHoveredLang] = useState(null);

  const uiText = useMemo(() => {
    if (language === 'en') {
      return {
        loading: 'Verifying email, please wait...',
        successTitle: 'Operation Successful',
        errorTitle: 'Verification Failed',
        continue: 'Continue',
        registerAgain: 'Register again',
        missingToken: 'Verification token is missing.',
        success: 'Email verified successfully. Your account has been activated.',
        alreadyApproved: 'Your account was already approved before. You can log in now.',
        verifyFailed: 'Cannot verify email. Please try again.',
        languages: { vi: 'Vietnamese', en: 'English', ja: 'Japanese' }
      };
    }
    if (language === 'ja') {
      return {
        loading: 'メール認証中です。しばらくお待ちください...',
        successTitle: '認証成功',
        errorTitle: '認証失敗',
        continue: '続行',
        registerAgain: '再登録',
        missingToken: '認証トークンが見つかりません。',
        success: 'メール認証に成功しました。アカウントが有効化されました。',
        alreadyApproved: 'アカウントはすでに承認済みです。今すぐログインできます。',
        verifyFailed: 'メール認証に失敗しました。再度お試しください。',
        languages: { vi: 'ベトナム語', en: '英語', ja: '日本語' }
      };
    }
    return {
      loading: 'Đang xác thực, vui lòng đợi...',
      successTitle: 'Chúc mừng',
      errorTitle: 'Xác thực thất bại',
      continue: 'Đăng nhập ngay',
      registerAgain: 'Đăng ký lại',
      missingToken: 'Không tìm thấy token xác thực.',
      success: 'Bạn đã trở thành CTV của JobShare Workstation',
      alreadyApproved: 'Bạn đã trở thành CTV của JobShare Workstation',
      verifyFailed: 'Không thể xác thực email. Vui lòng thử lại.',
      languages: { vi: 'Tiếng Việt', en: 'English', ja: 'Nhật Bản' }
    };
  }, [language]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!token) {
        if (!mounted) return;
        setState('error');
        setMessage(uiText.missingToken);
        setMoveLogoTop(true);
        setShowPopup(true);
        return;
      }

      try {
        const response = await apiService.verifyCTVEmail(token);
        if (!mounted) return;
        setState('success');
        setMessage(
          response?.data?.result === 'already_approved'
            ? uiText.alreadyApproved
            : uiText.success
        );
        setTimeout(() => {
          if (!mounted) return;
          setMoveLogoTop(true);
          setShowPopup(true);
          setShowConfetti(true);
        }, 550);
      } catch (error) {
        if (!mounted) return;
        setState('error');
        setMessage(error.message || uiText.verifyFailed);
        setTimeout(() => {
          if (!mounted) return;
          setMoveLogoTop(true);
          setShowPopup(true);
        }, 450);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [token, uiText]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at top left, #fff1f2 0%, #ffffff 45%, #f8fafc 100%)',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Be Vietnam Pro', 'Noto Sans JP', 'Segoe UI', Roboto, Arial, sans-serif"
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&family=Noto+Sans+JP:wght@400;500;700&display=swap');
        @keyframes logoPulse {
          0% { transform: scale(1); opacity: 0.96; }
          50% { transform: scale(1.045); opacity: 1; }
          100% { transform: scale(1); opacity: 0.96; }
        }
        @keyframes confettiFall {
          0% { transform: translate3d(0, -12vh, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate3d(var(--drift), 108vh, 0) rotate(720deg); opacity: 0; }
        }
        @keyframes popupIn {
          0% { transform: translateY(18px) scale(0.96); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>

      {showConfetti && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 5 }}>
          {Array.from({ length: 42 }).map((_, i) => {
            const size = 6 + (i % 5);
            const left = (i * 11) % 100;
            const delay = (i % 10) * 80;
            const duration = 2200 + (i % 8) * 180;
            const colors = ['#dc2626', '#f97316', '#facc15', '#ef4444', '#fb7185'];
            return (
              <span
                key={`confetti-${i}`}
                style={{
                  position: 'absolute',
                  top: '-24px',
                  left: `${left}%`,
                  width: `${size}px`,
                  height: `${size * 0.42}px`,
                  borderRadius: 2,
                  background: colors[i % colors.length],
                  '--drift': `${(i % 2 === 0 ? 1 : -1) * (30 + (i % 7) * 12)}px`,
                  animation: `confettiFall ${duration}ms linear ${delay}ms forwards`
                }}
              />
            );
          })}
        </div>
      )}

      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ position: 'fixed', top: 18, right: 20, zIndex: 20, display: 'flex', gap: 8 }}>
          {['vi', 'en', 'ja'].map((langCode) => (
            <button
              key={langCode}
              type="button"
              onClick={() => changeLanguage(langCode)}
              onMouseEnter={() => setHoveredLang(langCode)}
              onMouseLeave={() => setHoveredLang(null)}
              style={{
                border: language === langCode ? '1px solid #dc2626' : '1px solid #d1d5db',
                background: language === langCode ? '#dc2626' : (hoveredLang === langCode ? '#fff1f2' : '#fff'),
                color: language === langCode ? '#fff' : '#374151',
                borderRadius: 999,
                padding: '7px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: language === langCode ? '0 10px 20px rgba(220, 38, 38, 0.22)' : '0 3px 10px rgba(15, 23, 42, 0.06)',
                transition: 'all 180ms ease'
              }}
              title={uiText.languages[langCode]}
            >
              {langCode.toUpperCase()}
            </button>
          ))}
        </div>

        <div
          style={{
            position: 'fixed',
            top: moveLogoTop ? '28px' : '50%',
            left: '50%',
            transform: moveLogoTop ? 'translate(-50%, 0)' : 'translate(-50%, -50%)',
            transition: 'top 560ms ease, transform 560ms ease',
            zIndex: 10
          }}
        >
          <img
            src="/landing/jobshare-logo.png"
            alt="JobShare"
            style={{
              width: moveLogoTop ? '170px' : '220px',
              transition: 'width 560ms ease',
              animation: !moveLogoTop ? 'logoPulse 1500ms ease-in-out infinite' : 'none'
            }}
          />
        </div>

        {state === 'loading' && (
          <p style={{ marginTop: '210px', color: '#be123c', fontSize: 16, fontWeight: 600, letterSpacing: 0.2 }}>{uiText.loading}</p>
        )}

        {showPopup && (
          <div
            style={{
              width: '100%',
              maxWidth: 500,
              background: '#fff',
              borderRadius: 20,
              boxShadow: '0 20px 50px rgba(15, 23, 42, 0.12)',
              border: '1px solid #fee2e2',
              padding: '34px 26px 26px',
              textAlign: 'center',
              marginTop: '84px',
              position: 'relative',
              zIndex: 9,
              animation: 'popupIn 320ms ease-out'
            }}
          >
            <h1 style={{ margin: 0, fontSize: 36, lineHeight: 1.2, color: '#b91c1c', fontWeight: 800 }}>
              {state === 'success' ? uiText.successTitle : uiText.errorTitle}
            </h1>
            <p style={{ margin: '16px 0 24px', color: '#1f2937', fontSize: 18, lineHeight: 1.6, fontWeight: 500 }}>
              {message}
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                borderRadius: 999,
                padding: '12px 28px',
                fontSize: 18,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 12px 22px rgba(220, 38, 38, 0.28)'
              }}
            >
              {uiText.continue}
            </button>
            {state === 'error' && (
              <div style={{ marginTop: 14 }}>
                <Link to="/register" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
                  {uiText.registerAgain}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
