import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const TopAppBar: React.FC = () => {
  const { userRole, setUserRole, activeTab, setActiveTab } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);

  const handleRoleToggle = (role: 'citizen' | 'admin') => {
    setUserRole(role);
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-container-margin py-base bg-surface-bright dark:bg-surface-dim border-b border-outline-variant/30 shadow-sm h-16">
      {/* Unified Logo Component */}
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab(userRole === 'citizen' ? 'home' : 'dashboard')}>
        <span className="material-symbols-outlined text-primary text-3xl">account_balance</span>
        <h1 className="text-headline-md font-headline-md font-extrabold text-primary tracking-tight">CiviFix</h1>
      </div>

      {/* Role Switcher & Navigation Links (Desktop) */}
      <div className="flex items-center gap-lg">
        {userRole === 'citizen' ? (
          <nav className="hidden md:flex gap-md">
            <button
              onClick={() => setActiveTab('home')}
              className={`font-label-md text-label-md pb-1 border-b-2 transition-all ${
                activeTab === 'home'
                  ? 'text-primary border-primary font-bold'
                  : 'text-on-surface-variant border-transparent hover:text-on-surface'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`font-label-md text-label-md pb-1 border-b-2 transition-all ${
                activeTab === 'activity'
                  ? 'text-primary border-primary font-bold'
                  : 'text-on-surface-variant border-transparent hover:text-on-surface'
              }`}
            >
              Activity Feed
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={`font-label-md text-label-md pb-1 border-b-2 transition-all ${
                activeTab === 'report'
                  ? 'text-primary border-primary font-bold'
                  : 'text-on-surface-variant border-transparent hover:text-on-surface'
              }`}
            >
              Report Issue
            </button>
          </nav>
        ) : (
          <nav className="hidden md:flex gap-md">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`font-label-md text-label-md pb-1 border-b-2 transition-all ${
                activeTab === 'dashboard'
                  ? 'text-primary border-primary font-bold'
                  : 'text-on-surface-variant border-transparent hover:text-on-surface'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`font-label-md text-label-md pb-1 border-b-2 transition-all ${
                activeTab === 'map'
                  ? 'text-primary border-primary font-bold'
                  : 'text-on-surface-variant border-transparent hover:text-on-surface'
              }`}
            >
              Map View
            </button>
          </nav>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-md">
        {/* Sleek Role Switcher Pill */}
        <div className="flex bg-surface-container-high p-1 rounded-xl w-fit">
          <button
            onClick={() => handleRoleToggle('citizen')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              userRole === 'citizen' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Citizen
          </button>
          <button
            onClick={() => handleRoleToggle('admin')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              userRole === 'admin' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Admin
          </button>
        </div>

        {/* Notifications and Profile */}
        <div className="flex items-center gap-sm relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="hover:bg-surface-container-high dark:hover:bg-surface-container-highest rounded-full p-2 transition-all relative"
          >
            <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-error rounded-full border border-white"></span>
          </button>
          
          <button className="w-10 h-10 rounded-full overflow-hidden border-2 border-outline-variant hover:border-primary transition-colors">
            <img
              className="w-full h-full object-cover"
              alt="Profile"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAc25QVEBSRbtOy4x6ndaprqofp_QENoCCaioAQUP7LBiyxioNkOfQFZbVEF3hfTS_60Et5jKv3-M7QfgzooEyZM7wXIoyaWCdKL42T5fszvQb90l65TWdpFE7PXV3g4ywknrEw6ICKIgL1Pf_RcIJ0S6I0D3Cw85sxLrdmsNMUeeFRlKv-nsfzvj0XYYvh4hm0p5bWgsuOrAOHQQZNvT9g1PN05MObGnHf4oQ6JPzJ8O_5Nl33-xs7TDl9DNOMUdOIsXIVpx9YrX8"
            />
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white border border-outline-variant shadow-lg rounded-xl overflow-hidden z-[60] py-2 animate-fade-in">
              <div className="px-md py-sm border-b border-outline-variant/30 flex justify-between items-center">
                <span className="font-bold text-sm">Notifications</span>
                <span className="text-xs text-primary font-semibold cursor-pointer hover:underline">Mark all read</span>
              </div>
              <div className="divide-y divide-outline-variant/10 max-h-64 overflow-y-auto">
                <div className="p-md hover:bg-surface-container-low cursor-pointer transition-colors">
                  <p className="text-xs font-semibold text-primary">Street Light Fixed</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Oak Street Corridor is resolved.</p>
                  <p className="text-[10px] text-outline mt-1">15 mins ago</p>
                </div>
                <div className="p-md hover:bg-surface-container-low cursor-pointer transition-colors">
                  <p className="text-xs font-semibold text-error">New Urgent Report</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Water Main Leak reported at 5th and Broadway.</p>
                  <p className="text-[10px] text-outline mt-1">1 hour ago</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
export default TopAppBar;
