import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

const AdminLayout = () => {
  return (
    <div
      className="flex h-screen min-w-0 overflow-hidden"
      style={{
        // Base từ màu cũ #FFFAFA, chỉ làm đậm hơn nhẹ để các card trắng nổi bật hơn.
        backgroundColor: '#f5f5f5',
      }}
    >
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminHeader />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-2 pb-4 pt-0 sm:px-3 sm:pb-6 md:px-4 lg:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

