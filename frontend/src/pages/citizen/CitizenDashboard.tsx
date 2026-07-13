import React, { useEffect, useState } from 'react';
import { useApp, getStatusBucket, type ReportBucket } from '../../context/AppContext';
import { MapContainer } from '../../components/MapContainer';
import { StatusBadge } from '../../components/StatusBadge';

const BUCKET_CONFIG: Record<ReportBucket, { icon: string; iconWrap: string; countClass: string; rowClass: string }> = {
  Reported: {
    icon: 'send',
    iconWrap: 'bg-outline-variant/20 text-on-surface-variant',
    countClass: 'text-primary',
    rowClass: 'bg-surface-container-low border-outline-variant/10',
  },
  'In Progress': {
    icon: 'engineering',
    iconWrap: 'bg-tertiary-fixed-dim text-on-tertiary-fixed',
    countClass: 'text-tertiary',
    rowClass: 'bg-tertiary-fixed/10 border-tertiary-fixed/10',
  },
  Resolved: {
    icon: 'check_circle',
    iconWrap: 'bg-secondary-container text-on-secondary-container',
    countClass: 'text-secondary',
    rowClass: 'bg-secondary-container/30 border-secondary-container/20',
  },
};

export const CitizenDashboard: React.FC = () => {
  const { reports, setActiveTab, navigateToReportDetail, currentUser } = useApp();
  const [expandedBucket, setExpandedBucket] = useState<ReportBucket | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  const collectNearbyLocation = () => {
    if (!navigator.geolocation || !window.isSecureContext) {
      setLocationStatus('error');
      return;
    }
    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setMyLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationStatus('ready');
      },
      () => setLocationStatus('error'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    collectNearbyLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const myReports = reports.filter((r) => r.reporterId === currentUser?.id || !currentUser);

  const bucketed: Record<ReportBucket, typeof reports> = {
    Reported: myReports.filter((r) => getStatusBucket(r.status) === 'Reported'),
    'In Progress': myReports.filter((r) => getStatusBucket(r.status) === 'In Progress'),
    Resolved: myReports.filter((r) => getStatusBucket(r.status) === 'Resolved'),
  };

  const recentUpdates = reports.slice(0, 3);

  const handleReportRedirect = () => setActiveTab('report');

  const toggleBucket = (bucket: ReportBucket) => {
    setExpandedBucket((current) => (current === bucket ? null : bucket));
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
              Join your neighbors in building a better community. Report potholes, broken lights, or waste issues in seconds.
            </p>
            <button
              onClick={handleReportRedirect}
              className="w-full md:w-auto h-14 px-lg bg-primary text-on-primary font-label-md text-label-md rounded-xl shadow-lg hover:bg-primary-container active:scale-95 transition-all flex items-center justify-center gap-2 mx-auto md:mx-0"
            >
              <span className="material-symbols-outlined">add_circle</span>
              Report an Issue
            </button>
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
              {locationStatus === 'loading' && (
                <span className="text-[10px] text-on-surface-variant">locating you…</span>
              )}
              {locationStatus === 'error' && (
                <button
                  onClick={collectNearbyLocation}
                  className="text-[10px] text-error font-semibold hover:underline"
                >
                  Enable location to see what's nearby
                </button>
              )}
            </div>
            <button
              onClick={() => setActiveTab('map')}
              className="text-primary font-label-sm text-label-sm hover:underline font-semibold"
            >
              View Full Map
            </button>
          </div>
          <div className="flex-1 relative min-h-0">
            <MapContainer interactive={false} focusCoordinates={myLocation} />
          </div>
        </div>

        {/* Summary Card */}
        <div className="md:col-span-4 bg-white rounded-xl shadow-sm border border-outline-variant/30 flex flex-col h-[380px] overflow-hidden">
          <div className="p-md border-b border-surface-container/60 shrink-0">
            <h3 className="font-label-md text-label-md">My Active Reports</h3>
          </div>
          <div className="flex-1 p-md flex flex-col gap-sm overflow-y-auto">
            {(Object.keys(BUCKET_CONFIG) as ReportBucket[]).map((bucket) => {
              const config = BUCKET_CONFIG[bucket];
              const bucketReports = bucketed[bucket];
              const isExpanded = expandedBucket === bucket;
              return (
                <div key={bucket} className="flex flex-col gap-xs">
                  <button
                    onClick={() => toggleBucket(bucket)}
                    className={`flex items-center justify-between p-sm rounded-lg border ${config.rowClass} w-full`}
                  >
                    <div className="flex items-center gap-md">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.iconWrap}`}>
                        <span className="material-symbols-outlined text-sm">{config.icon}</span>
                      </div>
                      <span className="font-label-md text-label-md">{bucket}</span>
                    </div>
                    <div className="flex items-center gap-xs">
                      <span className={`text-headline-md font-bold ${config.countClass}`}>{bucketReports.length}</span>
                      <span
                        className={`material-symbols-outlined text-outline transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      >
                        expand_more
                      </span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="ml-2 border-l-2 border-outline-variant/20 pl-md flex flex-col gap-xs animate-fade-in">
                      {bucketReports.length === 0 ? (
                        <p className="text-xs text-on-surface-variant py-xs">No reports in this bucket.</p>
                      ) : (
                        bucketReports.map((report) => (
                          <button
                            key={report.id}
                            onClick={() => report.backendId && navigateToReportDetail(report.backendId)}
                            className="text-left p-xs rounded-lg hover:bg-surface-container-low transition-colors"
                          >
                            <p className="text-label-sm font-semibold text-on-surface truncate">{report.title}</p>
                            <p className="text-[10px] text-on-surface-variant truncate">{report.location}</p>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity List */}
        <div className="md:col-span-12 bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
          <div className="p-md border-b border-surface-container/60 flex justify-between items-center">
            <h3 className="font-label-md text-label-md">Community Updates</h3>
          </div>
          <div className="divide-y divide-surface-container/60">
            {recentUpdates.map((report) => (
              <div
                key={report.id}
                onClick={() => (report.backendId ? navigateToReportDetail(report.backendId) : setActiveTab('activity'))}
                className="p-md hover:bg-surface-container-low transition-colors cursor-pointer flex items-center gap-md"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-primary">
                    {report.category === 'Road Damage'
                      ? 'edit_road'
                      : report.category === 'Street Lighting'
                      ? 'lightbulb'
                      : report.category === 'Water Leak'
                      ? 'water_drop'
                      : report.category === 'Waste Management'
                      ? 'delete'
                      : 'shield'}
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
