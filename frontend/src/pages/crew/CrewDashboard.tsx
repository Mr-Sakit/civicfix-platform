import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/StatusBadge';
import { isNativeApp, takePhoto } from '../../services/nativeCamera';

type LogTone = 'info' | 'success' | 'error';
interface LogEntry {
  id: number;
  time: string;
  message: string;
  tone: LogTone;
}

const LOG_STYLES: Record<LogTone, { icon: string; className: string }> = {
  info: { icon: 'info', className: 'text-on-surface-variant' },
  success: { icon: 'check_circle', className: 'text-secondary' },
  error: { icon: 'error', className: 'text-error' },
};

export const CrewDashboard: React.FC = () => {
  const { reports, currentUser, crewAcceptReport, crewResolveReport } = useApp();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<string>('');
  const [afterPhotoName, setAfterPhotoName] = useState<string>('');
  const [isAccepting, setIsAccepting] = useState<string | null>(null);
  const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);
  const [activityLog, setActivityLog] = useState<LogEntry[]>([]);
  const logCounter = useRef(0);

  const addLog = (message: string, tone: LogTone = 'info') => {
    logCounter.current += 1;
    setActivityLog((prev) => [{ id: logCounter.current, time: new Date().toLocaleTimeString(), message, tone }, ...prev].slice(0, 8));
  };

  const myTeamReports = reports.filter(
    (r) => r.assignedTeamId === currentUser?.teamId && (r.status === 'assigned_to_crew' || r.status === 'crew_accepted')
  );

  const handleAccept = async (id: string) => {
    setIsAccepting(id);
    addLog(`Accepting job ${id}...`);
    try {
      await crewAcceptReport(id);
      addLog(`Job ${id} accepted — button worked, status updated.`, 'success');
    } catch (err) {
      addLog(`Could not accept ${id}: ${err instanceof Error ? err.message : 'unknown error'}`, 'error');
    } finally {
      setIsAccepting(null);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      addLog(`"${file.name}" is a ${file.type || 'unknown'} file — only PNG, JPG, or WEBP photos are accepted.`, 'error');
      event.target.value = '';
      return;
    }

    setAfterPhotoName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setAfterPhoto(String(reader.result));
      addLog(`Photo "${file.name}" selected — ready to submit.`);
    };
    reader.readAsDataURL(file);
  };

  const handleTakeAfterPhoto = async () => {
    try {
      const dataUrl = await takePhoto();
      setAfterPhotoName('camera-photo.jpg');
      setAfterPhoto(dataUrl);
      addLog('After-photo captured — ready to submit.');
    } catch {
      // user cancelled the camera or permission was denied
    }
  };

  const handleResolveSubmit = async (id: string) => {
    if (!afterPhoto || isSubmittingResolve) return;
    setIsSubmittingResolve(true);
    addLog(`Submitting after-photo for ${id} — running AI verification, please wait...`);

    try {
      const updated = await crewResolveReport(id, afterPhoto, afterPhotoName);
      if (updated?.aiPhotoMatch === true) {
        addLog(`AI verification PASSED for ${id} — sent to admin for final approval.`, 'success');
      } else if (updated?.aiPhotoMatch === false) {
        addLog(`AI verification FAILED for ${id} — not solved, please try again with a clearer photo.`, 'error');
      } else {
        addLog(`Submitted ${id} for AI verification.`, 'success');
      }
      setResolvingId(null);
      setAfterPhoto('');
      setAfterPhotoName('');
    } catch (err) {
      addLog(`Submit failed for ${id}: ${err instanceof Error ? err.message : 'unknown error'}. The photo was not accepted — try a different one.`, 'error');
    } finally {
      setIsSubmittingResolve(false);
    }
  };

  return (
    <div className="p-lg md:p-xl max-w-5xl mx-auto w-full animate-fade-in">
      <div className="mb-lg">
        <h1 className="text-headline-lg font-headline-lg text-on-surface">
          {currentUser?.teamName ?? 'Crew'} Queue
        </h1>
        <p className="text-on-surface-variant text-body-md">Reports assigned to your team.</p>
      </div>

      {/* Activity Log — visible proof that button clicks and AI verification actually ran */}
      <div className="mb-lg bg-white rounded-xl border border-outline-variant/30 shadow-sm">
        <div className="p-md border-b border-outline-variant/20 flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary text-lg">terminal</span>
          <h3 className="font-label-md text-label-md font-bold">Activity Log</h3>
        </div>
        <div className="p-md max-h-40 overflow-y-auto space-y-xs">
          {activityLog.length === 0 ? (
            <p className="text-xs text-on-surface-variant">Actions you take (accept, upload, AI verification) will show up here.</p>
          ) : (
            activityLog.map((entry) => (
              <div key={entry.id} className={`flex items-start gap-sm text-xs ${LOG_STYLES[entry.tone].className}`}>
                <span className="material-symbols-outlined text-sm mt-0.5">{LOG_STYLES[entry.tone].icon}</span>
                <span className="flex-1">{entry.message}</span>
                <span className="text-[10px] text-outline shrink-0">{entry.time}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {myTeamReports.length === 0 ? (
        <div className="bg-white rounded-xl border border-outline-variant/30 p-xl text-center text-on-surface-variant">
          No reports currently assigned to your team.
        </div>
      ) : (
        <div className="space-y-md">
          {myTeamReports.map((report) => (
            <div key={report.id} className="bg-white rounded-xl border border-outline-variant/30 shadow-sm p-lg flex flex-col md:flex-row gap-lg">
              <div className="w-full md:w-40 h-32 rounded-lg overflow-hidden bg-surface-container shrink-0">
                {report.image ? (
                  <img className="w-full h-full object-cover" src={report.image} alt={report.title} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-outline">
                    <span className="material-symbols-outlined text-4xl">image</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-sm mb-xs">
                  <span className="text-label-sm font-bold text-outline">{report.id}</span>
                  <StatusBadge type="status" value={report.status} />
                  <StatusBadge type="category" value={report.category} />
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface">{report.title}</h3>
                <p className="text-body-md text-on-surface-variant mt-1 line-clamp-2">{report.description}</p>
                <p className="text-xs text-on-surface-variant mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  {report.location}
                </p>

                <div className="mt-md">
                  {report.status === 'crew_accepted' && report.aiPhotoMatch === false && (
                    <div className="mb-sm p-sm bg-error-container text-on-error-container rounded-lg flex items-center gap-sm text-xs font-semibold">
                      <span className="material-symbols-outlined text-lg">error</span>
                      Not solved — AI could not confirm the fix from your photo. Please try again with a clearer after-photo.
                    </div>
                  )}

                  {report.status === 'assigned_to_crew' && (
                    <button
                      onClick={() => handleAccept(report.id)}
                      disabled={isAccepting === report.id}
                      className="px-lg h-10 rounded-lg bg-primary text-on-primary text-xs font-bold hover:brightness-105 active:scale-95 transition-all disabled:opacity-60 flex items-center gap-2"
                    >
                      {isAccepting === report.id && (
                        <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                      )}
                      {isAccepting === report.id ? 'Accepting...' : 'Accept Job'}
                    </button>
                  )}

                  {report.status === 'crew_accepted' && resolvingId !== report.id && (
                    <button
                      onClick={() => setResolvingId(report.id)}
                      className="px-lg h-10 rounded-lg bg-secondary text-white text-xs font-bold hover:brightness-105 active:scale-95 transition-all"
                    >
                      {report.aiPhotoMatch === false ? 'Try Again — Upload Photo' : 'Mark Fixed — Upload Photo'}
                    </button>
                  )}

                  {report.status === 'crew_accepted' && resolvingId === report.id && (
                    <div className="space-y-sm border-t border-outline-variant/20 pt-sm mt-sm">
                      {isNativeApp() ? (
                        <button
                          onClick={handleTakeAfterPhoto}
                          className="px-lg h-9 rounded-lg border border-outline-variant text-xs font-bold flex items-center gap-2 hover:bg-surface-variant transition-all"
                        >
                          <span className="material-symbols-outlined text-sm leading-none">photo_camera</span>
                          {afterPhoto ? 'Retake Photo' : 'Take After-Photo'}
                        </button>
                      ) : (
                        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileSelect} className="text-xs" />
                      )}
                      {afterPhoto && (
                        <img src={afterPhoto} alt="After preview" className="w-32 h-24 object-cover rounded-lg border border-outline-variant/30" />
                      )}
                      <div className="flex gap-sm">
                        <button
                          onClick={() => handleResolveSubmit(report.id)}
                          disabled={!afterPhoto || isSubmittingResolve}
                          className="px-lg h-9 rounded-lg bg-primary text-on-primary text-xs font-bold disabled:opacity-50 flex items-center gap-2"
                        >
                          {isSubmittingResolve && (
                            <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                          )}
                          {isSubmittingResolve ? 'Verifying with AI...' : 'Submit for AI Verification'}
                        </button>
                        <button
                          onClick={() => {
                            setResolvingId(null);
                            setAfterPhoto('');
                          }}
                          disabled={isSubmittingResolve}
                          className="px-lg h-9 rounded-lg border border-outline-variant text-xs font-bold disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default CrewDashboard;
