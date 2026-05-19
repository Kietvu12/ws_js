import React from 'react';
import AdminDashboardSession1 from '../../component/Admin/AdminDashboardSession1';
import AdminDashboardSession2 from '../../component/Admin/AdminDashboardSession2';
import AdminDashboardSession3 from '../../component/Admin/AdminDashboardSession3';
import AdminDashboardSession4 from '../../component/Admin/AdminDashboardSession4';
import AdminDashboardSession5 from '../../component/Admin/AdminDashboardSession5';

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <AdminDashboardSession1 />
      <AdminDashboardSession2 />
      <AdminDashboardSession3 />
      <AdminDashboardSession4 />
      <AdminDashboardSession5 />
    </div>
  );
};

export default Dashboard;

