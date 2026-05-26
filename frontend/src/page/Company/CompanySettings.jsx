import React, { useState } from 'react';
import {
  Building2, User, Mail, Phone, MapPin, Globe, Camera, Bell,
  Shield, Key, Eye, EyeOff, Save, Upload
} from 'lucide-react';

export default function CompanySettings() {
  const [showPassword, setShowPassword] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    newCandidate: true,
    statusUpdate: true,
    billing: true,
    marketing: false,
  });

  return (
    <div className="bg-gray-50 p-3 sm:p-4 lg:p-6">
      <div className="space-y-4 sm:space-y-6">
        {/* Company Info Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
            <Building2 size={18} className="text-red-600" />
            Thông tin doanh nghiệp
          </h2>

          {/* Avatar upload */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                <Building2 size={32} className="text-gray-400" />
              </div>
              <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md hover:bg-red-700 transition-colors">
                <Camera size={14} />
              </button>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-sm font-medium text-gray-900">Logo công ty</p>
              <p className="text-xs text-gray-500 mt-1">JPG, PNG. Tối đa 2MB</p>
              <button className="mt-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 inline-flex items-center gap-1">
                <Upload size={12} />
                Tải lên
              </button>
            </div>
          </div>

          {/* Form grid - 2 cols on desktop, 1 col on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Tên công ty</label>
              <input
                type="text"
                defaultValue="JobShare Technology"
                className="w-full px-3 py-2 sm:py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Mã số thuế</label>
              <input
                type="text"
                defaultValue="0123456789"
                className="w-full px-3 py-2 sm:py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Email liên hệ</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  defaultValue="hr@jobshare.vn"
                  className="w-full pl-9 pr-3 py-2 sm:py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Số điện thoại</label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  defaultValue="028 1234 5678"
                  className="w-full pl-9 pr-3 py-2 sm:py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Website</label>
              <div className="relative">
                <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="url"
                  defaultValue="https://jobshare.vn"
                  className="w-full pl-9 pr-3 py-2 sm:py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Quy mô</label>
              <select className="w-full px-3 py-2 sm:py-2.5 text-sm border border-gray-200 rounded-lg text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400">
                <option>50-100 nhân viên</option>
                <option>100-200 nhân viên</option>
                <option>200-500 nhân viên</option>
                <option>500+ nhân viên</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Địa chỉ</label>
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  defaultValue="123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh"
                  className="w-full pl-9 pr-3 py-2 sm:py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Mô tả công ty</label>
              <textarea
                rows={3}
                defaultValue="JobShare Technology - Nền tảng kết nối tuyển dụng hàng đầu Việt Nam"
                className="w-full px-3 py-2 sm:py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none"
              />
            </div>
          </div>

          <div className="mt-5 sm:mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
            <button className="w-full sm:w-auto px-4 py-2 sm:py-2.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              Hủy
            </button>
            <button className="w-full sm:w-auto px-4 py-2 sm:py-2.5 text-sm font-medium rounded-lg text-white flex items-center justify-center gap-2 transition-colors"
              style={{ backgroundColor: '#dc2626' }}>
              <Save size={14} />
              Lưu thay đổi
            </button>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
            <Bell size={18} className="text-red-600" />
            Cài đặt thông báo
          </h2>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-900">Thông báo qua Email</p>
                <p className="text-xs text-gray-500 mt-0.5">Nhận thông báo qua email khi có cập nhật</p>
              </div>
              <button
                onClick={() => setNotifications(p => ({ ...p, email: !p.email }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${notifications.email ? 'bg-red-600' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications.email ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-900">Thông báo SMS</p>
                <p className="text-xs text-gray-500 mt-0.5">Nhận SMS khi có ứng viên mới hoặc lịch phỏng vấn</p>
              </div>
              <button
                onClick={() => setNotifications(p => ({ ...p, sms: !p.sms }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${notifications.sms ? 'bg-red-600' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications.sms ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-900">Ứng viên mới</p>
                <p className="text-xs text-gray-500 mt-0.5">Thông báo khi có ứng viên mới ứng tuyển</p>
              </div>
              <button
                onClick={() => setNotifications(p => ({ ...p, newCandidate: !p.newCandidate }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${notifications.newCandidate ? 'bg-red-600' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications.newCandidate ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-900">Cập nhật trạng thái</p>
                <p className="text-xs text-gray-500 mt-0.5">Thông báo khi trạng thái request thay đổi</p>
              </div>
              <button
                onClick={() => setNotifications(p => ({ ...p, statusUpdate: !p.statusUpdate }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${notifications.statusUpdate ? 'bg-red-600' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications.statusUpdate ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-900">Thanh toán & Billing</p>
                <p className="text-xs text-gray-500 mt-0.5">Thông báo về invoice và credit</p>
              </div>
              <button
                onClick={() => setNotifications(p => ({ ...p, billing: !p.billing }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${notifications.billing ? 'bg-red-600' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications.billing ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-900">Marketing & Khuyến mãi</p>
                <p className="text-xs text-gray-500 mt-0.5">Nhận thông tin ưu đãi và tính năng mới</p>
              </div>
              <button
                onClick={() => setNotifications(p => ({ ...p, marketing: !p.marketing }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${notifications.marketing ? 'bg-red-600' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications.marketing ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
            <Shield size={18} className="text-red-600" />
            Bảo mật
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Mật khẩu hiện tại</label>
              <div className="relative">
                <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu hiện tại"
                  className="w-full pl-9 pr-10 py-2 sm:py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div className="hidden md:block" />
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Mật khẩu mới</label>
              <div className="relative">
                <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  placeholder="Nhập mật khẩu mới"
                  className="w-full pl-9 pr-3 py-2 sm:py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Xác nhận mật khẩu</label>
              <div className="relative">
                <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full pl-9 pr-3 py-2 sm:py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                />
              </div>
            </div>
          </div>

          <div className="mt-5 sm:mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
            <button className="w-full sm:w-auto px-4 py-2 sm:py-2.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              Hủy
            </button>
            <button className="w-full sm:w-auto px-4 py-2 sm:py-2.5 text-sm font-medium rounded-lg text-white flex items-center justify-center gap-2 transition-colors"
              style={{ backgroundColor: '#dc2626' }}>
              <Shield size={14} />
              Đổi mật khẩu
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-xl border border-red-200 shadow-sm p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-red-700 mb-2">Vùng nguy hiểm</h2>
          <p className="text-xs sm:text-sm text-gray-500 mb-4">Các hành động không thể hoàn tác</p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-lg bg-red-50 border border-red-100">
            <div>
              <p className="text-sm font-medium text-gray-900">Xóa tài khoản doanh nghiệp</p>
              <p className="text-xs text-gray-500 mt-0.5">Xóa vĩnh viễn tài khoản và tất cả dữ liệu liên quan</p>
            </div>
            <button className="w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-lg border border-red-300 text-red-700 hover:bg-red-100 transition-colors whitespace-nowrap">
              Xóa tài khoản
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
