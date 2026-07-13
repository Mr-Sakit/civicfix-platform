import React, { useState } from 'react';
import { useApp, type Report } from '../../context/AppContext';
import { StatusBadge } from '../../components/StatusBadge';

export const ActivityFeed: React.FC = () => {
  const { reports } = useApp();
  const [filter, setFilter] = useState<'all' | 'nearby' | 'my-reports'>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Filters logic
  const filteredReports = reports.filter((report) => {
    if (filter === 'my-reports') {
      return report.reporter === 'Sarah J.' || report.reporter === 'Citizen #0912';
    }
    if (filter === 'nearby') {
      return report.location.includes('Oakwood') || report.location.includes('Plaza') || report.location.includes('Broadway');
    }
    return true;
  });

  const getFooterTime = (report: Report) => {
    if (report.status === 'Resolved') {
      return `Completed ${report.date}`;
    }
    if (report.status === 'In Progress') {
      return `Fixing - Est. 4h`;
    }
    return `Reported ${report.date}`;
  };

  return (
    <div className="pt-4 pb-20 max-w-7xl mx-auto px-container-margin animate-fade-in">
      {/* Header Section */}
      <section className="mb-xl flex flex-col md:flex-row md:items-end justify-between gap-lg">
        <div className="space-y-xs">
          <h2 className="font-display-lg text-display-lg text-on-surface">Community Activity</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
            Real-time infrastructure and service updates across your neighborhood. Together, we're building a more resilient city.
          </p>
        </div>
        {/* Filter Tabs */}
        <div className="flex bg-surface-container-high p-1 rounded-xl w-fit self-start md:self-end border border-outline-variant/20 shadow-sm">
          <button
            onClick={() => setFilter('all')}
            className={`px-lg py-sm rounded-lg font-label-md text-label-md transition-all ${
              filter === 'all'
                ? 'bg-white shadow-sm text-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('nearby')}
            className={`px-lg py-sm rounded-lg font-label-md text-label-md transition-all ${
              filter === 'nearby'
                ? 'bg-white shadow-sm text-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Nearby
          </button>
          <button
            onClick={() => setFilter('my-reports')}
            className={`px-lg py-sm rounded-lg font-label-md text-label-md transition-all ${
              filter === 'my-reports'
                ? 'bg-white shadow-sm text-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            My Reports
          </button>
        </div>
      </section>

      {/* Activity Grid */}
      {filteredReports.length === 0 ? (
        <div className="text-center py-xl bg-white rounded-xl border border-outline-variant/30">
          <span className="material-symbols-outlined text-outline text-5xl">folder_open</span>
          <p className="text-on-surface-variant mt-md">No reports found for this filter.</p>
        </div>
      ) : (
        <div className="bento-grid">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="glass-card rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all group flex flex-col h-full bg-white border border-outline-variant/30"
            >
              {/* Photo Area */}
              <div className="relative h-48 overflow-hidden bg-surface-container shrink-0">
                {report.image ? (
                  <img
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt={report.title}
                    src={report.image}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-surface-container">
                    <span className="material-symbols-outlined text-outline text-4xl">image</span>
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <StatusBadge type="status" value={report.status} />
                </div>
                {report.isUrgent && (
                  <div className="absolute top-4 right-4 bg-error text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    Urgent
                  </div>
                )}
              </div>

              {/* Card Details */}
              <div className="p-lg flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-sm">
                    <h3 className="font-headline-md text-headline-md text-on-surface group-hover:text-primary transition-colors line-clamp-1">
                      {report.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-xs text-on-surface-variant font-label-md text-label-md mb-md">
                    <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
                    <span className="truncate">{report.location}</span>
                  </div>

                  <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2 mb-lg">
                    {report.description}
                  </p>
                </div>

                <div className="pt-md border-t border-outline-variant/30 flex justify-between items-center shrink-0">
                  <span className="text-[12px] font-medium text-outline uppercase tracking-wider">
                    {getFooterTime(report)}
                  </span>
                  <button
                    onClick={() => setSelectedReport(report)}
                    className="text-primary font-bold font-label-md text-label-md flex items-center gap-1 hover:gap-2 transition-all"
                  >
                    View Details{' '}
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Overlay Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90dvh] overflow-y-auto border border-outline-variant flex flex-col animate-scale-up">
            <div className="p-md border-b border-outline-variant flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-label-sm font-bold text-outline">{selectedReport.id}</span>
                <StatusBadge type="status" value={selectedReport.status} />
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-lg space-y-md">
              <div className="rounded-xl overflow-hidden aspect-video bg-surface-container">
                {selectedReport.image ? (
                  <img className="w-full h-full object-cover" src={selectedReport.image} alt={selectedReport.title} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-outline text-5xl">image</span>
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-headline-md font-bold text-on-surface">{selectedReport.title}</h2>
                <div className="flex items-center gap-1 text-on-surface-variant text-label-sm mt-1">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  <span>{selectedReport.location}</span>
                </div>
              </div>

              <div className="bg-surface-container-low p-md rounded-lg border border-outline-variant/20">
                <h4 className="text-label-sm font-bold uppercase text-on-surface-variant">Description</h4>
                <p className="text-body-md text-on-surface mt-1 whitespace-pre-wrap">{selectedReport.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-sm">
                <div>
                  <span className="text-[10px] uppercase font-bold text-outline">Category</span>
                  <div className="mt-0.5"><StatusBadge type="category" value={selectedReport.category} /></div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-outline">Priority</span>
                  <div className="mt-0.5"><StatusBadge type="priority" value={selectedReport.priority} /></div>
                </div>
              </div>

              {selectedReport.assignedTo !== 'Unassigned' && (
                <div className="p-sm bg-secondary-container/20 rounded-lg flex items-center gap-sm border border-secondary-container/30">
                  <span className="material-symbols-outlined text-secondary">engineering</span>
                  <div className="text-xs">
                    <span className="font-semibold text-on-secondary-container">Assigned crew: </span>
                    <span className="text-on-surface-variant">{selectedReport.assignedTo}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-md bg-surface-container-low border-t border-outline-variant flex justify-end shrink-0">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-lg h-[40px] rounded-lg bg-primary text-white font-label-md text-label-md hover:bg-primary-container shadow-md transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ActivityFeed;
