import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';

const DEFAULT_MESSAGE = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';

/**
 * Lắng nghe sự kiện từ api.js khi JWT admin/CTV hết hạn hoặc không hợp lệ: hiển thị cảnh báo và về trang chủ (/).
 */
export default function AuthSessionListener() {
  const navigate = useNavigate();
  const { warning } = useNotification();

  useEffect(() => {
    const onExpired = (e) => {
      const raw = e.detail?.message;
      const msg =
        raw && String(raw).trim() ? String(raw).trim() : DEFAULT_MESSAGE;
      warning({ message: msg });
      navigate('/', { replace: true });
    };
    window.addEventListener('app:session-expired', onExpired);
    return () => window.removeEventListener('app:session-expired', onExpired);
  }, [navigate, warning]);

  return null;
}
