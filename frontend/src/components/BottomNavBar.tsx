import React from 'react';
import { useApp } from '../context/AppContext';

export const BottomNavBar: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();

  return (
    <nav className="fixed bottom-0 left-0 w-full z-40 flex justify-around items-center px-4 pb-4 pt-2 bg-surface-bright shadow-lg border-t border-outline-variant md:hidden">
      <button
        onClick={() => setActiveTab('home')}
        className={`flex flex-col items-center justify-center px-4 py-1 transition-all ${
          activeTab === 'home'
            ? 'bg-secondary-container text-on-secondary-container rounded-full scale-90'
            : 'text-on-surface-variant'
        }`}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontVariationSettings: activeTab === 'home' ? "'FILL' 1" : "'FILL' 0" }}
        >
          home
        </span>
        <span className="text-label-sm font-label-sm">Home</span>
      </button>

      <button
        onClick={() => setActiveTab('activity')}
        className={`flex flex-col items-center justify-center px-4 py-1 transition-all ${
          activeTab === 'activity'
            ? 'bg-secondary-container text-on-secondary-container rounded-full scale-90'
            : 'text-on-surface-variant'
        }`}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontVariationSettings: activeTab === 'activity' ? "'FILL' 1" : "'FILL' 0" }}
        >
          forum
        </span>
        <span className="text-label-sm font-label-sm">Activity</span>
      </button>

      <button
        onClick={() => setActiveTab('report')}
        className={`flex flex-col items-center justify-center px-4 py-1 transition-all ${
          activeTab === 'report'
            ? 'bg-secondary-container text-on-secondary-container rounded-full scale-90'
            : 'text-on-surface-variant'
        }`}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontVariationSettings: activeTab === 'report' ? "'FILL' 1" : "'FILL' 0" }}
        >
          add_circle
        </span>
        <span className="text-label-sm font-label-sm">Report</span>
      </button>
    </nav>
  );
};
export default BottomNavBar;
