import React from 'react';

const ContactPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#111827' }}>Liên hệ</h2>
        <p style={{ color: '#4b5563' }}>Thông tin liên hệ và hỗ trợ</p>
      </div>
      <div className="rounded-lg shadow p-6" style={{ backgroundColor: 'white' }}>
        <p style={{ color: '#374151' }}>Nội dung trang liên hệ sẽ được thêm vào đây.</p>
      </div>
    </div>
  );
};

export default ContactPage;

