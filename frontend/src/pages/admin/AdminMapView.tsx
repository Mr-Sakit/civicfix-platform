import React, { useState } from 'react';
import { useApp, type Report, CATEGORY_NAMES } from '../../context/AppContext';
import { MapContainer } from '../../components/MapContainer';

const CATEGORY_ICONS: Record<string, string> = {
  'Road Damage': 'edit_road',
  'Street Lighting': 'lightbulb',
  'Waste Management': 'delete',
  'Water Leak': 'water_drop',
  'Public Safety': 'shield',
};

export const AdminMapView: React.FC = () => {
  const { reports, selectedReportId, setSelectedReportId, setActiveTab } = useApp();
  const [filter, setFilter] = useState<string>('all');

  const filteredReports = reports.filter((report) => {
    if (report.archived) return false;
    if (filter === 'all') return true;
    return report.category === filter;
  });

  const getPinColorBorder = (report: Report) => {
    switch (report.category) {
      case 'Road Damage': return 'border-l-error';
      case 'Street Lighting': return 'border-l-tertiary-fixed-dim';
      case 'Waste Management': return 'border-l-secondary';
      case 'Water Leak': return 'border-l-primary';
      default: return 'border-l-on-surface';
    }
  };

  const getReporterText = (report: Report) => {
    return report.reporter ? `Reported by ${report.reporter}` : 'Anonymous Report';
  };

  return (
    <div className="flex h-[calc(100vh_-_4rem)] overflow-hidden w-full animate-fade-in">
      
      {/* 70% Map Column */}
      <section className="w-[70%] h-full relative border-r border-outline-variant/20 bg-surface-container">
        <MapContainer
          selectedId={selectedReportId}
          onPinClick={(id) => setSelectedReportId(id)}
        />
      </section>

      {/* 30% Sidebar Feed */}
      <aside className="w-[30%] h-full bg-white flex flex-col shadow-lg shrink-0 border-l border-outline-variant/30">
        
        {/* Sidebar Header & Filters */}
        <div className="p-md bg-white shadow-sm flex flex-col gap-md border-b border-outline-variant/10 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-md text-headline-md font-bold">Activity Feed</h3>
            <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-label-sm font-bold">
              {filteredReports.filter((r) => r.status !== 'resolved').length} Active
            </span>
          </div>

          <div className="flex flex-wrap gap-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${
                filter === 'all'
                  ? 'bg-primary-container text-on-primary-container shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-outline-variant/20'
              }`}
            >
              <span className="material-symbols-outlined text-sm leading-none">apps</span>
              All
            </button>
            {CATEGORY_NAMES.map((name) => (
              <button
                key={name}
                onClick={() => setFilter(name)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${
                  filter === name
                    ? 'bg-primary-container text-on-primary-container shadow-sm'
                    : 'bg-surface-container text-on-surface-variant hover:bg-outline-variant/20'
                }`}
              >
                <span className="material-symbols-outlined text-sm leading-none">{CATEGORY_ICONS[name]}</span>
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Feed List */}
        <div className="flex-1 overflow-y-auto p-md space-y-md bg-surface-container-low/30">
          {filteredReports.length === 0 ? (
            <div className="text-center py-lg text-xs text-on-surface-variant">No reports in this category.</div>
          ) : (
            filteredReports.map((report) => {
              const isSelected = selectedReportId === report.id;
              return (
                <div
                  key={report.id}
                  onClick={() => setSelectedReportId(report.id)}
                  className={`bg-white p-md rounded-xl border border-outline-variant/30 shadow-sm hover:shadow-md transition-all cursor-pointer group border-l-4 ${getPinColorBorder(
                    report
                  )} ${isSelected ? 'ring-2 ring-primary/30 border-primary' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-tighter text-on-surface-variant">
                      {report.category}
                    </span>
                    <span className="text-[10px] text-outline">{report.date}</span>
                  </div>
                  
                  <h4 className="font-bold text-body-md text-sm mb-1 group-hover:text-primary transition-colors line-clamp-1">
                    {report.title}
                  </h4>
                  <p className="text-on-surface-variant text-xs line-clamp-2 leading-relaxed">
                    {report.description}
                  </p>

                  <div className="mt-md flex items-center gap-sm">
                    <div className="w-6 h-6 rounded-full bg-surface-container overflow-hidden border border-outline-variant/20">
                      <img
                        className="w-full h-full object-cover"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuAwWLgT-C6FzZx3YMnAiFSjyoHSvfwSND32cERAmoC0MHZHB-fLMm7kdHwoGsX3eTgMnXg_54PNBxtKlaz_wd4QXnY4MdxkVarbfURSd6hzjJRFzn1tCKpy9AuBiw-o2lsRVQ_Q02fnczo7blbp-bds6YYX0OwfXStbIQrirwGnV3g3B_TZy1wwTO1Tv_eqIw_0WmKDCmxxYDj_0ZO0R-IrzL6iJgqvUW9eAqKWqMVlKuotGPcv_Ns2umfEUzGEXP5BUqbhywFqlcQ"
                        alt="Avatar"
                      />
                    </div>
                    <span className="text-[10px] text-on-surface-variant">{getReporterText(report)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Dispatch Action Panel */}
        <div className="p-md border-t border-outline-variant/30 bg-white shrink-0">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="w-full h-12 bg-primary text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-base active:scale-[0.98] hover:opacity-95 transition-all shadow-md"
          >
            <span className="material-symbols-outlined text-base leading-none">add_location</span>
            Go to Triage Queue
          </button>
        </div>

      </aside>

    </div>
  );
};
export default AdminMapView;
