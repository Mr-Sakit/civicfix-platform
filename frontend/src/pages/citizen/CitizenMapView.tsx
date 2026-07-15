import React, { useState } from 'react';
import { useApp, type Report, CATEGORY_NAMES } from '../../context/AppContext';
import { MapContainer } from '../../components/MapContainer';
import { StatusBadge } from '../../components/StatusBadge';

const CATEGORY_ICONS: Record<string, string> = {
  'Road Damage': 'edit_road',
  'Street Lighting': 'lightbulb',
  'Waste Management': 'delete',
  'Water Leak': 'water_drop',
  'Public Safety': 'shield',
};

export const CitizenMapView: React.FC = () => {
  const { reports, selectedReportId, setSelectedReportId, navigateToReportDetail } = useApp();
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

  const handleSelect = (report: Report) => {
    setSelectedReportId(report.id);
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh_-_4rem)] overflow-hidden w-full animate-fade-in">
      {/* Map Column */}
      <section className="flex-1 h-1/2 md:h-full relative border-b md:border-b-0 md:border-r border-outline-variant/20 bg-surface-container">
        <MapContainer selectedId={selectedReportId} onPinClick={(id) => setSelectedReportId(id)} />
      </section>

      {/* Sidebar Feed */}
      <aside className="w-full md:w-[380px] h-1/2 md:h-full bg-white flex flex-col shadow-lg shrink-0 border-l border-outline-variant/30">
        <div className="p-md bg-white shadow-sm flex flex-col gap-md border-b border-outline-variant/10 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-md text-headline-md font-bold">Community Map</h3>
            <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-label-sm font-bold">
              {filteredReports.length} Reports
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

        <div className="flex-1 overflow-y-auto p-md space-y-md bg-surface-container-low/30">
          {filteredReports.length === 0 ? (
            <div className="text-center py-lg text-xs text-on-surface-variant">No reports in this category.</div>
          ) : (
            filteredReports.map((report) => {
              const isSelected = selectedReportId === report.id;
              return (
                <div
                  key={report.id}
                  onClick={() => handleSelect(report)}
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
                  <p className="text-on-surface-variant text-xs line-clamp-2 leading-relaxed mb-2">{report.description}</p>

                  <div className="flex items-center justify-between">
                    <StatusBadge type="status" value={report.status} />
                    {isSelected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (report.backendId) navigateToReportDetail(report.backendId);
                        }}
                        className="text-primary font-bold text-[11px] flex items-center gap-1 hover:gap-1.5 transition-all"
                      >
                        View Details
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
};
export default CitizenMapView;
