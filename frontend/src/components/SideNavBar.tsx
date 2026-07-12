import React from 'react';
import { useApp } from '../context/AppContext';

export const SideNavBar: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();

  return (
    <aside className="fixed flex flex-col h-full w-64 border-r border-outline-variant/20 bg-inverse-surface dark:bg-surface-container-lowest shadow-lg z-30 pt-16">
      {/* Sidebar Header Brand with logo logic */}
      <div className="p-lg border-b border-outline-variant/10">
        <div className="flex items-center gap-2 mb-xs">
          <span className="material-symbols-outlined text-primary-fixed-dim text-3xl">account_balance</span>
          <h1 className="text-headline-md font-headline-md font-extrabold text-primary-fixed-dim tracking-tight">CiviFix</h1>
        </div>
        <div className="font-label-md text-label-md text-secondary-fixed/70 uppercase tracking-widest text-[10px]">Admin Control</div>
      </div>

      {/* Nav Links */}
      <nav className="mt-md flex-1 px-sm space-y-xs">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`w-full flex items-center gap-md px-md py-sm rounded-lg font-bold transition-all duration-150 ease-in-out ${
            activeTab === 'dashboard'
              ? 'bg-secondary-container text-on-secondary-container scale-[0.98]'
              : 'text-surface-variant hover:text-on-surface-variant hover:bg-surface-variant/10'
          }`}
        >
          <span className="material-symbols-outlined">dashboard</span>
          <span className="font-label-md text-label-md text-left">Triage Queue</span>
        </button>

        <button
          onClick={() => setActiveTab('map')}
          className={`w-full flex items-center gap-md px-md py-sm rounded-lg font-bold transition-all duration-150 ease-in-out ${
            activeTab === 'map'
              ? 'bg-secondary-container text-on-secondary-container scale-[0.98]'
              : 'text-surface-variant hover:text-on-surface-variant hover:bg-surface-variant/10'
          }`}
        >
          <span className="material-symbols-outlined">map</span>
          <span className="font-label-md text-label-md text-left">Map View</span>
        </button>
      </nav>

      {/* Footer Profile */}
      <div className="p-lg mt-auto border-t border-outline-variant/10 flex items-center gap-md">
        <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold">
          JD
        </div>
        <div>
          <div className="font-label-md text-label-md text-on-primary-fixed">John Doe</div>
          <div className="text-[10px] uppercase tracking-wider text-secondary-fixed/50">Chief Admin</div>
        </div>
      </div>
    </aside>
  );
};
export default SideNavBar;
