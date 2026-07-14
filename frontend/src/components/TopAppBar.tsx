import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const TopAppBar: React.FC = () => {
  const {
    currentUser,
    userRole,
    logout,
    activeTab,
    setActiveTab,
    notifications,
    unreadNotificationCount,
    markAllNotificationsRead
  } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-container-margin py-base bg-surface-bright dark:bg-surface-dim border-b border-outline-variant/30 shadow-sm h-16">
      {/* Unified Logo Component */}
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab(userRole === 'citizen' ? 'home' : 'dashboard')}>
        <span className="material-symbols-outlined text-primary text-3xl">account_balance</span>
        <h1 className="text-headline-md font-headline-md font-extrabold text-primary tracking-tight">CivicFix</h1>
      </div>

      {/* Role-aware navigation links (Desktop) */}
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
        <div className="hidden sm:flex flex-col items-end leading-tight">
          <span className="text-xs font-bold text-on-surface">{currentUser?.name}</span>
          <span className="text-[10px] uppercase tracking-wider text-primary">{currentUser?.role === 'admin' ? 'City Manager' : 'Citizen'}</span>
        </div>

        {/* Notifications and Profile */}
        <div className="flex items-center gap-sm relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="hover:bg-surface-container-high dark:hover:bg-surface-container-highest rounded-full p-2 transition-all relative"
          >
            <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
            {unreadNotificationCount > 0 && (
              <span className="absolute top-1 right-1 min-w-5 h-5 px-1 bg-error text-white rounded-full border border-white text-[10px] font-bold flex items-center justify-center">
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </span>
            )}
          </button>
          
          <button
            onClick={logout}
            className="h-10 px-3 rounded-full border border-outline-variant hover:border-primary transition-colors flex items-center gap-2 text-xs font-bold"
            title="Sign out"
          >
            <span className="w-7 h-7 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center">
              {currentUser?.name?.split(' ').map((part) => part[0]).join('').slice(0, 2) ?? 'CF'}
            </span>
            <span className="hidden sm:inline">Logout</span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white border border-outline-variant shadow-lg rounded-xl overflow-hidden z-[60] py-2 animate-fade-in">
              <div className="px-md py-sm border-b border-outline-variant/30 flex justify-between items-center">
                <span className="font-bold text-sm">Notifications</span>
                <button
                  onClick={markAllNotificationsRead}
                  className="text-xs text-primary font-semibold cursor-pointer hover:underline"
                >
                  Mark all read
                </button>
              </div>
              <div className="divide-y divide-outline-variant/10 max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-md text-xs text-on-surface-variant">No notifications yet.</div>
                ) : (
                  notifications.map((item) => (
                    <div key={item.id} className="p-md hover:bg-surface-container-low cursor-pointer transition-colors">
                      <p className={`text-xs font-semibold ${item.is_read ? 'text-on-surface-variant' : 'text-primary'}`}>
                        {item.type.replaceAll('_', ' ')}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-0.5">{item.message}</p>
                      <p className="text-[10px] text-outline mt-1">{new Date(item.created_at).toLocaleString()}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
export default TopAppBar;
