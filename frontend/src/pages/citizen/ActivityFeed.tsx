import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/StatusBadge';

export const ActivityFeed: React.FC = () => {
  const { reports, currentUser, watchReport, navigateToReportDetail } = useApp();
  const [filter, setFilter] = useState<'all' | 'nearby' | 'my-reports'>('all');
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());

  const filteredReports = reports.filter((report) => {
    if (filter === 'my-reports') {
      return currentUser ? report.reporterId === currentUser.id : false;
    }
    return true;
  });

  const getFooterTime = (report: (typeof reports)[number]) => {
    if (report.status === 'resolved') return `Completed ${report.date}`;
    if (report.status === 'crew_accepted' || report.status === 'assigned_to_crew') return 'Fixing in progress';
    return `Reported ${report.date}`;
  };

  const handleWatch = async (event: React.MouseEvent, reportId: string) => {
    event.stopPropagation();
    await watchReport(reportId);
    setWatchedIds((prev) => new Set(prev).add(reportId));
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
              filter === 'all' ? 'bg-white shadow-sm text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('my-reports')}
            className={`px-lg py-sm rounded-lg font-label-md text-label-md transition-all ${
              filter === 'my-reports' ? 'bg-white shadow-sm text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
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
              onClick={() => report.backendId && navigateToReportDetail(report.backendId)}
              className="glass-card rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all group flex flex-col h-full bg-white border border-outline-variant/30 cursor-pointer"
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
                {report.severity === 'high' && (
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
                    <div className="flex items-center text-secondary font-bold shrink-0 ml-2">
                      <span className="material-symbols-outlined text-[18px] mr-1">group</span>
                      <span className="text-label-md">{report.watcherCount}</span>
                    </div>
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
                    onClick={(event) => handleWatch(event, report.id)}
                    disabled={watchedIds.has(report.id)}
                    className="text-primary font-bold font-label-md text-label-md flex items-center gap-1 hover:gap-2 transition-all disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                    {watchedIds.has(report.id) ? 'Watching' : 'Watch'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default ActivityFeed;
