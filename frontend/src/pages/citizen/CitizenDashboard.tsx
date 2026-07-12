import React from 'react';
import { useApp } from '../../context/AppContext';
import { MapContainer } from '../../components/MapContainer';
import { StatusBadge } from '../../components/StatusBadge';

export const CitizenDashboard: React.FC = () => {
  const { reports, setActiveTab, setSelectedReportId } = useApp();

  // Dynamically calculate counts
  const reportedCount = reports.filter((r) => r.status === 'Reported').length + 8; // Offset for demo feel
  const progressCount = reports.filter((r) => r.status === 'In Progress').length + 2;
  const resolvedCount = reports.filter((r) => r.status === 'Resolved').length + 42;

  // Recent community updates
  const recentUpdates = reports.slice(0, 3);

  const handleReportRedirect = () => {
    setActiveTab('report');
  };

  return (
    <div className="pt-4 pb-20 max-w-7xl mx-auto px-container-margin animate-fade-in">
      {/* Hero Section */}
      <section className="relative rounded-2xl overflow-hidden bg-white border border-outline-variant/30 p-lg md:p-xl mb-lg shadow-sm">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-secondary/5 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:gap-lg">
          <div className="flex-1 text-center md:text-left">
            <h2 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-on-surface mb-md">
              Report Local Issues, <br className="hidden md:block" /> Improve Your City
            </h2>
            <p className="text-body-md text-on-surface-variant mb-lg max-w-md mx-auto md:mx-0">
              Join your neighbors in building a better community. Report potholes, broken lights, or graffiti in seconds.
            </p>
            <button
              onClick={handleReportRedirect}
              className="w-full md:w-auto h-14 px-lg bg-primary text-on-primary font-label-md text-label-md rounded-xl shadow-lg hover:bg-primary-container active:scale-95 transition-all flex items-center justify-center gap-2 mx-auto md:mx-0"
            >
              <span className="material-symbols-outlined">add_circle</span>
              Report an Issue
            </button>
          </div>
          <div className="hidden md:block flex-1 h-64 rounded-2xl overflow-hidden shadow-xl border border-outline-variant/30">
            <div
              className="w-full h-full bg-cover bg-center"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAnKk8H-RMus0Vpoai8-exO_qQa5v9BymLMBePvhWMJvTXzuG3x5ZjisaXJGWrVFwOhnLfl8iPIcLOK-48QwwWeLnu6Rzba9B2e7eTahHv1U1FT89h447y4ILn0Kdt3MJxMdmervx5ylRaXapd_fR3vd06HMA9F_NIe_ACfDRnSYcfWuZVfRq2-K-vc-CiQOUYc6v7bMj7TKS4G-1GUOQ4YUjYqDavGqd8xIfyDLIqbaM3jaq7vSZq62W3x_jtQCMHhQ8XHPlVKmNA')"
              }}
            ></div>
          </div>
        </div>
      </section>

      {/* Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-md">
        {/* Map Snippet Card (Bento Style) */}
        <div className="md:col-span-8 bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden flex flex-col h-[380px]">
          <div className="p-md flex justify-between items-center border-b border-surface-container/60 shrink-0">
            <div className="flex items-center gap-xs">
              <span className="material-symbols-outlined text-primary">location_on</span>
              <h3 className="font-label-md text-label-md">Nearby Issues</h3>
            </div>
            <button
              onClick={() => setActiveTab('activity')}
              className="text-primary font-label-sm text-label-sm hover:underline font-semibold"
            >
              View Full Map
            </button>
          </div>
          <div className="flex-1 relative min-h-0">
            <MapContainer interactive={false} />
            <div className="absolute bottom-4 left-4 right-4 z-30 glass-card p-sm rounded-lg flex items-center gap-md border border-outline-variant/30 shadow-lg">
              <div className="w-10 h-10 bg-error-container rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-error">warning</span>
              </div>
              <div className="flex-1">
                <p className="text-label-sm font-label-sm text-on-surface">Main Street Repairs</p>
                <p className="text-[10px] text-on-surface-variant">Active road crew working today</p>
              </div>
              <span className="material-symbols-outlined text-outline">chevron_right</span>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="md:col-span-4 bg-white rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between h-[380px]">
          <div className="p-md border-b border-surface-container/60">
            <h3 className="font-label-md text-label-md">My Active Reports</h3>
          </div>
          <div className="flex-1 p-md flex flex-col justify-around gap-md">
            {/* Reported */}
            <div className="flex items-center justify-between p-sm bg-surface-container-low rounded-lg border border-outline-variant/10">
              <div className="flex items-center gap-md">
                <div className="w-8 h-8 rounded-full bg-outline-variant/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant text-sm">send</span>
                </div>
                <span className="font-label-md text-label-md">Reported</span>
              </div>
              <span className="text-headline-md font-bold text-primary">{reportedCount}</span>
            </div>

            {/* In Progress */}
            <div className="flex items-center justify-between p-sm bg-tertiary-fixed/10 rounded-lg border border-tertiary-fixed/10">
              <div className="flex items-center gap-md">
                <div className="w-8 h-8 rounded-full bg-tertiary-fixed-dim flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-tertiary-fixed text-sm">engineering</span>
                </div>
                <span className="font-label-md text-label-md">In Progress</span>
              </div>
              <span className="text-headline-md font-bold text-tertiary">{progressCount}</span>
            </div>

            {/* Resolved */}
            <div className="flex items-center justify-between p-sm bg-secondary-container/30 rounded-lg border border-secondary-container/20">
              <div className="flex items-center gap-md">
                <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-secondary-container text-sm">check_circle</span>
                </div>
                <span className="font-label-md text-label-md">Resolved</span>
              </div>
              <span className="text-headline-md font-bold text-secondary">{resolvedCount}</span>
            </div>
          </div>
        </div>

        {/* Recent Activity List */}
        <div className="md:col-span-12 bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
          <div className="p-md border-b border-surface-container/60 flex justify-between items-center">
            <h3 className="font-label-md text-label-md">Community Updates</h3>
            <span className="material-symbols-outlined text-outline cursor-pointer hover:text-on-surface transition-colors">more_horiz</span>
          </div>
          <div className="divide-y divide-surface-container/60">
            {recentUpdates.map((report) => (
              <div
                key={report.id}
                onClick={() => {
                  setSelectedReportId(report.id);
                  setActiveTab('activity');
                }}
                className="p-md hover:bg-surface-container-low transition-colors cursor-pointer flex items-center gap-md"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-primary">
                    {report.category === 'ROADS' ? 'edit_road' : report.category === 'UTILITIES' ? 'lightbulb' : 'delete'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-label-md text-label-md text-on-surface truncate">{report.title}</h4>
                  <p className="text-label-sm text-on-surface-variant truncate">
                    {report.location} • {report.date}
                  </p>
                </div>
                <StatusBadge type="status" value={report.status} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Action Button (Only for Home context) */}
      <button
        onClick={handleReportRedirect}
        className="fixed bottom-24 right-container-margin md:bottom-8 md:right-8 w-14 h-14 bg-primary text-on-primary rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center z-40 group"
      >
        <span className="material-symbols-outlined text-3xl group-hover:rotate-90 transition-transform">add</span>
      </button>
    </div>
  );
};
export default CitizenDashboard;
