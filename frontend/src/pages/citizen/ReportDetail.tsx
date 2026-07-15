import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/StatusBadge';
import { civicfixApi } from '../../services/api';

export const ReportDetail: React.FC = () => {
  const { reports, selectedReportId, setActiveTab, watchReport, deleteReport, currentUser } = useApp();
  const report = reports.find((r) => r.id === selectedReportId);
  const [history, setHistory] = useState<Array<{ id: number; old_status: string | null; new_status: string; note: string | null; created_at: string }>>([]);
  const [isWatching, setIsWatching] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    if (report?.backendId) {
      civicfixApi.getIssueHistory(report.backendId).then(setHistory).catch(() => setHistory([]));
    }
  }, [report?.backendId]);

  if (!report) {
    return (
      <div className="p-xl text-center">
        <p className="text-on-surface-variant">Report not found.</p>
        <button onClick={() => setActiveTab('home')} className="mt-md text-primary font-semibold hover:underline">
          Back to dashboard
        </button>
      </div>
    );
  }

  const handleWatch = async () => {
    await watchReport(report.id);
    setIsWatching(true);
  };

  const isOwner = currentUser != null && report.reporterId === currentUser.id;

  const handleRemove = async () => {
    if (!window.confirm('Remove this report permanently? This cannot be undone.')) return;
    setIsRemoving(true);
    try {
      await deleteReport(report.id);
      setActiveTab('home');
    } catch {
      setIsRemoving(false);
      alert('Could not remove this report. Please try again.');
    }
  };

  return (
    <div className="pt-4 pb-20 max-w-3xl mx-auto px-container-margin animate-fade-in">
      <button
        onClick={() => setActiveTab('home')}
        className="flex items-center gap-1 text-on-surface-variant hover:text-on-surface mb-md font-label-md"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Back
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
        <div className="p-md border-b border-outline-variant flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-label-sm font-bold text-outline">{report.id}</span>
            <StatusBadge type="status" value={report.status} />
            <StatusBadge type="severity" value={report.severity} />
          </div>
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-secondary text-lg">group</span>
            <span className="text-label-md font-bold">{report.watcherCount}</span>
            <button
              onClick={handleWatch}
              disabled={isWatching}
              className="px-md h-9 rounded-lg bg-primary text-on-primary text-xs font-bold hover:brightness-105 active:scale-95 transition-all disabled:opacity-50"
            >
              {isWatching ? 'Watching' : 'Watch'}
            </button>
          </div>
        </div>

        <div className="p-lg space-y-md">
          <div className="rounded-xl overflow-hidden aspect-video bg-surface-container">
            {report.image ? (
              <img className="w-full h-full object-cover" src={report.image} alt={report.title} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="material-symbols-outlined text-outline text-5xl">image</span>
              </div>
            )}
          </div>

          {report.afterImage && (
            <div className="rounded-xl overflow-hidden aspect-video bg-surface-container border-2 border-secondary/30">
              <img className="w-full h-full object-cover" src={report.afterImage} alt="After fix" />
              <div className="text-xs text-secondary font-bold p-1 text-center">AFTER PHOTO</div>
            </div>
          )}

          <div>
            <h2 className="text-headline-md font-bold text-on-surface">{report.title}</h2>
            <div className="flex items-center gap-1 text-on-surface-variant text-label-sm mt-1">
              <span className="material-symbols-outlined text-sm">location_on</span>
              <span>{report.location}</span>
            </div>
          </div>

          <div className="bg-surface-container-low p-md rounded-lg border border-outline-variant/20">
            <h4 className="text-label-sm font-bold uppercase text-on-surface-variant">Description</h4>
            <p className="text-body-md text-on-surface mt-1 whitespace-pre-wrap">{report.description}</p>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-outline">Priority</span>
            <div className="mt-0.5"><StatusBadge type="priority" value={report.priority} /></div>
          </div>

          {report.assignedTo !== 'Unassigned' && (
            <div className="p-sm bg-secondary-container/20 rounded-lg flex items-center gap-sm border border-secondary-container/30">
              <span className="material-symbols-outlined text-secondary">engineering</span>
              <div className="text-xs">
                <span className="font-semibold text-on-secondary-container">Assigned crew: </span>
                <span className="text-on-surface-variant">{report.assignedTo}</span>
              </div>
            </div>
          )}

          {isOwner && (
            <div className="pt-md border-t border-outline-variant/20">
              <button
                onClick={handleRemove}
                disabled={isRemoving}
                className="text-error text-xs font-bold flex items-center gap-1 hover:underline disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">delete_forever</span>
                {isRemoving ? 'Removing...' : 'Remove this report'}
              </button>
            </div>
          )}

          {history.length > 0 && (
            <div>
              <h4 className="text-label-sm font-bold uppercase text-on-surface-variant mb-sm">Status Timeline</h4>
              <div className="space-y-sm">
                {history.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-sm text-xs">
                    <span className="material-symbols-outlined text-primary text-sm mt-0.5">radio_button_checked</span>
                    <div>
                      <p className="font-semibold text-on-surface">
                        {entry.old_status ? `${entry.old_status} → ${entry.new_status}` : entry.new_status}
                      </p>
                      {entry.note && <p className="text-on-surface-variant">{entry.note}</p>}
                      <p className="text-[10px] text-outline">{new Date(entry.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default ReportDetail;
