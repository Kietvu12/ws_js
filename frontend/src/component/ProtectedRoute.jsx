import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute - Bảo vệ route yêu cầu đăng nhập
 * @param {Object} props
 * @param {React.ReactNode} props.children - Component con cần render
 * @param {string} props.requiredUserType - Loại user yêu cầu: 'ctv' hoặc 'admin'
 */
const ProtectedRoute = ({ children, requiredUserType }) => {
  const token = localStorage.getItem('token');
  const userType = localStorage.getItem('userType');

  // Nếu chưa đăng nhập, redirect về trang login tương ứng
  if (!token || !userType) {
    if (requiredUserType === 'admin') {
      return <Navigate to="/admin/login" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  // Nếu userType không khớp với yêu cầu, redirect về trang đúng
  if (requiredUserType && userType !== requiredUserType) {
    if (userType === 'ctv') {
      return <Navigate to="/agent" replace />;
    } else if (userType === 'admin') {
      return <Navigate to="/admin" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;

