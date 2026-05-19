import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import CollaboratorLandingChatbot from '../LandingPage/CollaboratorLandingChatbot';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNavbar from './BottomNavbar';

const AgentLayout = () => {
  const location = useLocation();
  const hideFloatingChatbot = /\/nominations\/[^/]+$/.test(location.pathname);

  return (
    <div className="flex h-screen bg-gradient-to-br from-stone-100 via-red-50/40 to-stone-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6 pb-24 sm:pb-20 lg:pb-6">
          <Outlet />
        </main>
      </div>
      <BottomNavbar />
      {!hideFloatingChatbot && <CollaboratorLandingChatbot />}
    </div>
  );
};

export default AgentLayout;

