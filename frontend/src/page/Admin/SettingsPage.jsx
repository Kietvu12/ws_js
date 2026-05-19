import React from 'react';

const SettingsPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#111827' }}>Cài đặt</h2>
        <p style={{ color: '#4b5563' }}>Cài đặt hệ thống</p>
      </div>
      <div className="rounded-lg p-6" style={{ backgroundColor: 'white', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' }}>
        <p style={{ color: '#374151' }}>Nội dung trang cài đặt sẽ được thêm vào đây.</p>
      </div>
    </div>
  );
};

export default SettingsPage;

