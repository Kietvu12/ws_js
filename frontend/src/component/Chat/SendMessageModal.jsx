import React, { useState, useEffect } from 'react';
import { X, Send, User, Search } from 'lucide-react';
import apiService from '../../services/api';

const SendMessageModal = ({ 
  jobApplicationId, 
  collaboratorId, 
  userType = 'ctv', // 'ctv' or 'admin'
  onClose, 
  onSuccess 
}) => {
  const [message, setMessage] = useState('');
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [admins, setAdmins] = useState([]);
  const [adminSearch, setAdminSearch] = useState('');
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Hover states
  const [hoveredCloseButton, setHoveredCloseButton] = useState(false);
  const [hoveredAdminDropdownItemIndex, setHoveredAdminDropdownItemIndex] = useState(null);
  const [hoveredCancelButton, setHoveredCancelButton] = useState(false);
  const [hoveredSubmitButton, setHoveredSubmitButton] = useState(false);

  useEffect(() => {
    // Set default message with @{jobApplicationId}
    setMessage(`@${jobApplicationId} `);
    
    // Load admins if CTV
    if (userType === 'ctv') {
      loadAdmins();
    }
  }, [jobApplicationId, userType]);

  // Reload admins when search changes
  useEffect(() => {
    if (userType === 'ctv' && adminSearch) {
      const timeoutId = setTimeout(() => {
        loadAdmins();
      }, 300); // Debounce search
      return () => clearTimeout(timeoutId);
    }
  }, [adminSearch]);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      // Get super admin (role = 1) and backoffice (role = 2) for CTV
      const response = await apiService.getCTVAdminsForMessage({ 
        status: 1, // Only active admins
        search: adminSearch || ''
      });
      
      if (response.success && response.data) {
        setAdmins(response.data.admins || []);
      }
    } catch (error) {
      console.error('Error loading admins:', error);
      // If error, try to show a helpful message
      if (error.message && error.message.includes('403')) {
        alert('Bạn không có quyền truy cập danh sách admin. Vui lòng liên hệ quản trị viên.');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredAdmins = admins.filter(admin => {
    const searchLower = adminSearch.toLowerCase();
    return (
      (admin.name || '').toLowerCase().includes(searchLower) ||
      (admin.email || '').toLowerCase().includes(searchLower)
    );
  });

  const handleSelectAdmin = (admin) => {
    setSelectedAdminId(admin.id);
    setAdminSearch(admin.name || admin.email);
    setShowAdminDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim()) {
      alert('Vui lòng nhập nội dung tin nhắn');
      return;
    }

    if (userType === 'ctv' && !selectedAdminId) {
      alert('Vui lòng chọn admin để gửi tin nhắn');
      return;
    }

    try {
      setSending(true);
      
      if (userType === 'ctv') {
        // CTV sends message - adminId will be set by backend based on selectedAdminId
        // But we need to check if backend supports adminId in createCTVMessage
        // For now, we'll send the message and backend will handle routing
        const response = await apiService.createCTVMessage({
          jobApplicationId: parseInt(jobApplicationId),
          content: message.trim(),
          senderType: 2, // Collaborator
          adminId: selectedAdminId ? parseInt(selectedAdminId) : null // Try to specify admin
        });

        if (response.success) {
          alert('Gửi tin nhắn thành công!');
          onSuccess && onSuccess();
          onClose();
        } else {
          alert(response.message || 'Có lỗi xảy ra khi gửi tin nhắn');
        }
      } else {
        // Admin sends message - default to collaborator who created the job application
        const response = await apiService.createAdminMessage({
          jobApplicationId: parseInt(jobApplicationId),
          collaboratorId: collaboratorId ? parseInt(collaboratorId) : null,
          content: message.trim(),
          senderType: 1 // Admin
        });

        if (response.success) {
          alert('Gửi tin nhắn thành công!');
          onSuccess && onSuccess();
          onClose();
        } else {
          alert(response.message || 'Có lỗi xảy ra khi gửi tin nhắn');
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert(error.message || 'Có lỗi xảy ra khi gửi tin nhắn');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} onClick={onClose}>
      <div className="rounded-lg shadow-xl max-w-2xl w-full" style={{ backgroundColor: 'white', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#e5e7eb' }}>
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: '#111827' }}>
            <Send className="w-5 h-5" style={{ color: '#2563eb' }} />
            Gửi tin nhắn
          </h2>
          <button
            onClick={onClose}
            onMouseEnter={() => setHoveredCloseButton(true)}
            onMouseLeave={() => setHoveredCloseButton(false)}
            className="p-1 rounded transition-colors"
            style={{
              backgroundColor: hoveredCloseButton ? '#f3f4f6' : 'transparent'
            }}
          >
            <X className="w-5 h-5" style={{ color: '#4b5563' }} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Admin Selection (only for CTV) */}
          {userType === 'ctv' && (
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
                Gửi đến Admin <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
                <input
                  type="text"
                  placeholder="Tìm kiếm admin..."
                  value={adminSearch}
                  onChange={(e) => {
                    setAdminSearch(e.target.value);
                    setShowAdminDropdown(true);
                  }}
                  onFocus={() => setShowAdminDropdown(true)}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:outline-none"
                  style={{ borderColor: '#d1d5db' }}
                />
                {showAdminDropdown && filteredAdmins.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 border rounded-lg shadow-lg max-h-60 overflow-y-auto" style={{ backgroundColor: 'white', borderColor: '#d1d5db', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}>
                    {filteredAdmins.map((admin) => (
                      <button
                        key={admin.id}
                        type="button"
                        onClick={() => handleSelectAdmin(admin)}
                        onMouseEnter={() => setHoveredAdminDropdownItemIndex(admin.id)}
                        onMouseLeave={() => setHoveredAdminDropdownItemIndex(null)}
                        className="w-full px-3 py-2 text-left text-sm flex items-center justify-between"
                        style={{
                          backgroundColor: hoveredAdminDropdownItemIndex === admin.id ? '#f3f4f6' : 'transparent'
                        }}
                      >
                        <div>
                          <div className="font-medium" style={{ color: '#111827' }}>{admin.name}</div>
                          <div className="text-xs" style={{ color: '#6b7280' }}>
                            {admin.email} • {admin.role === 1 ? 'Super Admin' : 'Backoffice'}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedAdminId && (
                <div className="mt-2 p-2 border rounded-lg" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}>
                  <div className="text-xs font-medium" style={{ color: '#1e3a8a' }}>
                    Đã chọn: {admins.find(a => a.id === parseInt(selectedAdminId))?.name || 'Admin'}
                  </div>
                </div>
              )}
              {loading && (
                <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Đang tải danh sách admin...</p>
              )}
            </div>
          )}

          {/* Collaborator Info (only for Admin) */}
          {userType === 'admin' && collaboratorId && (
            <div className="border rounded-lg p-3" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}>
              <div className="text-xs font-semibold mb-1" style={{ color: '#1e3a8a' }}>Gửi đến CTV</div>
              <div className="text-sm" style={{ color: '#1e40af' }}>
                Tin nhắn sẽ được gửi đến CTV tạo đơn tiến cử này
              </div>
            </div>
          )}

          {/* Message Input */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>
              Nội dung tin nhắn <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Nhập tin nhắn..."
              rows="6"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none resize-none"
              style={{ borderColor: '#d1d5db' }}
              required
            />
            <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
              Gợi ý: Sử dụng "@{jobApplicationId} đặt lịch hẹn phỏng vấn/nyusha vào ngày DD/MM/YYYY HH:mm nhé" để đặt lịch
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: '#e5e7eb' }}>
            <button
              type="button"
              onClick={onClose}
              onMouseEnter={() => setHoveredCancelButton(true)}
              onMouseLeave={() => setHoveredCancelButton(false)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{
                backgroundColor: hoveredCancelButton ? '#e5e7eb' : '#f3f4f6',
                color: '#374151'
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={sending || (userType === 'ctv' && !selectedAdminId)}
              onMouseEnter={() => setHoveredSubmitButton(true)}
              onMouseLeave={() => setHoveredSubmitButton(false)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
              style={{
                backgroundColor: hoveredSubmitButton ? '#2563eb' : '#2563eb',
                color: 'white',
                opacity: (sending || (userType === 'ctv' && !selectedAdminId)) ? 0.5 : 1,
                cursor: (sending || (userType === 'ctv' && !selectedAdminId)) ? 'not-allowed' : 'pointer'
              }}
            >
              <Send className="w-4 h-4" />
              {sending ? 'Đang gửi...' : 'Gửi tin nhắn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SendMessageModal;

