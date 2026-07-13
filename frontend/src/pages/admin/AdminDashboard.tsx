import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/StatusBadge';
import { MapContainer } from '../../components/MapContainer';
import { civicfixApi } from '../../services/api';
import { CATEGORY_NAMES } from '../../context/AppContext';

export const AdminDashboard: React.FC = () => {
  const { reports, selectedReportId, setSelectedReportId, updateReport, archiveReport, routeReportToTeam, approveFix, deleteReport, teams } = useApp();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [notes, setNotes] = useState('');
  const [metrics, setMetrics] = useState<Awaited<ReturnType<typeof civicfixApi.getMetricsSummary>> | null>(null);

  useEffect(() => {
    civicfixApi.getMetricsSummary().then(setMetrics).catch(() => setMetrics(null));
  }, [reports.length]);

  // `reports` (from context) already includes archived issues, so just split it here
  // instead of the admin queue silently excluding archived ones for good.
  const visibleReports = reports.filter((r) => (showArchived ? r.archived : !r.archived));
  const selectedReport = visibleReports.find((r) => r.id === selectedReportId) || visibleReports[0];

  useEffect(() => {
    if (selectedReport) setNotes(selectedReport.notes || '');
  }, [selectedReportId]);

  const handleUpdateNotes = () => {
    if (!selectedReport) return;
    updateReport(selectedReport.id, { notes });
    alert(`Notes saved for ${selectedReport.id}`);
  };

  const handleDispatch = () => {
    if (!selectedReport?.categoryId) return;
    const matchingTeam = teams.find((team) => team.category_id === selectedReport.categoryId);
    if (!matchingTeam) {
      alert('No crew team is configured for this category yet.');
      return;
    }
    routeReportToTeam(selectedReport.id, matchingTeam.id);
  };

  const handleArchiveToggle = async () => {
    if (!selectedReport) return;
    await archiveReport(selectedReport.id, !selectedReport.archived);
  };

  const handleDelete = async () => {
    if (!selectedReport) return;
    const confirmMessage =
      selectedReport.status === 'pending_ai_verification' || selectedReport.status === 'resolved'
        ? 'Remove this report? Use this if AI verified the fix incorrectly or the report should not have been accepted. This cannot be undone.'
        : 'Permanently remove this report? This cannot be undone.';
    if (!window.confirm(confirmMessage)) return;
    await deleteReport(selectedReport.id);
  };

  // Real metrics from GET /api/metrics/summary
  const totalOpen = metrics?.totalIssues ?? visibleReports.filter((r) => r.status !== 'resolved').length;
  const criticalAlerts = metrics?.bySeverity.find((s) => s.severity === 'high')?.count ?? 0;
  const inProgressTasks =
    metrics?.byStatus
      .filter((s) => ['assigned_to_crew', 'crew_accepted', 'pending_ai_verification'].includes(s.status))
      .reduce((sum, s) => sum + s.count, 0) ?? 0;
  const avgResolutionDays = metrics?.avgResolutionHours != null ? (metrics.avgResolutionHours / 24).toFixed(1) : '—';

  const filteredQueue = visibleReports.filter((report) => {
    const matchesSearch =
      report.id.toLowerCase().includes(search.toLowerCase()) ||
      report.title.toLowerCase().includes(search.toLowerCase()) ||
      report.location.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === 'all' || report.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-lg md:p-xl flex-grow flex flex-col gap-lg max-w-[1600px] mx-auto w-full animate-fade-in">
      {/* Metrics Ribbon */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md shrink-0">
        <div className="bg-white p-md rounded-xl border border-outline-variant/30 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-sm">
            <span className="material-symbols-outlined text-primary p-2 bg-primary/10 rounded-lg">inventory</span>
          </div>
          <div className="text-on-surface-variant font-label-md text-sm">Total Open Issues</div>
          <div className="font-headline-md text-headline-md mt-xs font-bold">{totalOpen}</div>
        </div>

        <div className="bg-white p-md rounded-xl border border-outline-variant/30 shadow-sm border-l-4 border-l-error">
          <div className="flex items-center justify-between mb-sm">
            <span className="material-symbols-outlined text-error p-2 bg-error/10 rounded-lg">bolt</span>
            <span className="text-error font-bold text-label-sm">High Severity</span>
          </div>
          <div className="text-on-surface-variant font-label-md text-sm">High-Severity Reports</div>
          <div className="font-headline-md text-headline-md mt-xs font-bold">{criticalAlerts}</div>
        </div>

        <div className="bg-white p-md rounded-xl border border-outline-variant/30 shadow-sm">
          <div className="flex items-center justify-between mb-sm">
            <span className="material-symbols-outlined text-secondary p-2 bg-secondary/10 rounded-lg">engineering</span>
          </div>
          <div className="text-on-surface-variant font-label-md text-sm">In Progress Tasks</div>
          <div className="font-headline-md text-headline-md mt-xs font-bold">{inProgressTasks}</div>
        </div>

        <div className="bg-white p-md rounded-xl border border-outline-variant/30 shadow-sm">
          <div className="flex items-center justify-between mb-sm">
            <span className="material-symbols-outlined text-tertiary p-2 bg-tertiary/10 rounded-lg">schedule</span>
          </div>
          <div className="text-on-surface-variant font-label-md text-sm">Avg. Resolution Time</div>
          <div className="font-headline-md text-headline-md mt-xs font-bold">{avgResolutionDays === '—' ? '—' : `${avgResolutionDays} Days`}</div>
        </div>
      </section>

      {/* Split-Screen layout */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-lg flex-1 min-h-[600px]">
        {/* Left Side: Queue List */}
        <div className="xl:col-span-4 flex flex-col bg-white rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden h-[700px]">
          <div className="p-md border-b border-outline-variant/30 flex flex-col gap-sm bg-surface-bright">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-md text-headline-md text-primary font-bold">Report Queue</h2>
              <div className="flex items-center gap-xs">
                <button
                  onClick={() => setShowArchived((v) => !v)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                    showArchived ? 'bg-on-surface text-white' : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  {showArchived ? 'Archived' : 'Active'}
                </button>
                <span className="bg-primary-container text-on-primary-container px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {filteredQueue.length}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  type="text"
                  placeholder="Search queue..."
                  className="w-full pl-8 pr-2 py-1.5 bg-surface-container border-none rounded-lg text-xs focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-surface-container border-none text-xs rounded-lg py-1.5 px-3 focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Cats</option>
                {CATEGORY_NAMES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto divide-y divide-outline-variant/10">
            {filteredQueue.length === 0 ? (
              <div className="text-center py-lg text-on-surface-variant text-xs">No matches found.</div>
            ) : (
              filteredQueue.map((report) => {
                const isSelected = selectedReportId === report.id;
                return (
                  <div
                    key={report.id}
                    onClick={() => setSelectedReportId(report.id)}
                    className={`p-md cursor-pointer hover:bg-surface-container-low transition-colors ${
                      isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                    }`}
                  >
                    <div className="flex gap-md">
                      {report.image ? (
                        <img src={report.image} className="w-14 h-14 rounded-lg object-cover shrink-0 border border-outline-variant/30" alt="Thumbnail" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-outline">image</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-xs">
                          <span className="text-label-sm font-bold text-primary">{report.id}</span>
                          <span className="text-[10px] text-on-surface-variant">{report.date}</span>
                        </div>
                        <h3 className="font-label-md text-label-md text-on-surface truncate">{report.title}</h3>
                        <div className="flex gap-xs mt-sm flex-wrap">
                          <StatusBadge type="category" value={report.category} />
                          <StatusBadge type="severity" value={report.severity} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Details View */}
        <div className="xl:col-span-8 flex flex-col h-[700px]">
          {selectedReport ? (
            <div className="bg-white rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden flex flex-col md:flex-row flex-grow h-full">
              <div className="flex-1 p-lg flex flex-col gap-lg border-r border-outline-variant/20 overflow-y-auto">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="font-headline-md text-headline-md text-on-surface font-bold">
                      Issue Details: {selectedReport.id}
                    </h1>
                    <p className="text-xs text-on-surface-variant mt-xs">Reported {selectedReport.date}</p>
                  </div>
                  <div className="flex gap-sm">
                    <button
                      onClick={handleDispatch}
                      disabled={selectedReport.status !== 'under_admin_review' && selectedReport.status !== 'submitted'}
                      className="bg-primary text-on-primary px-md h-10 rounded-lg text-xs font-semibold hover:brightness-110 active:scale-95 transition-all flex items-center gap-1 shadow-sm disabled:opacity-40"
                    >
                      <span className="material-symbols-outlined text-[16px]">send</span> Dispatch to Crew
                    </button>
                    <button
                      onClick={handleArchiveToggle}
                      className="border border-outline text-on-surface px-md h-10 rounded-lg text-xs font-semibold hover:bg-surface-container transition-all"
                    >
                      {selectedReport.archived ? 'Unarchive' : 'Archive'}
                    </button>
                    <button
                      onClick={handleDelete}
                      className="border border-error text-error px-md h-10 rounded-lg text-xs font-semibold hover:bg-error-container transition-all flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                      Remove
                    </button>
                  </div>
                </div>

                <div className={`grid gap-md ${selectedReport.afterImage ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <div>
                    {selectedReport.afterImage && (
                      <p className="text-[10px] font-bold uppercase text-on-surface-variant mb-1">Reported (Before)</p>
                    )}
                    <div className="rounded-xl overflow-hidden aspect-video relative group border border-outline-variant/30 bg-surface-container shrink-0">
                      {selectedReport.image ? (
                        <img className="w-full h-full object-cover" alt="Detail view" src={selectedReport.image} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-outline">
                          <span className="material-symbols-outlined text-5xl">image</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedReport.afterImage && (
                    <div>
                      <p className="text-[10px] font-bold uppercase text-secondary mb-1">Crew Submitted (After)</p>
                      <div className="rounded-xl overflow-hidden aspect-video relative border-2 border-secondary/40 bg-surface-container shrink-0">
                        <img className="w-full h-full object-cover" alt="Crew after-fix photo" src={selectedReport.afterImage} />
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Classifier — real data */}
                <div className="bg-primary/5 p-md rounded-xl border border-primary/20">
                  <div className="flex items-center gap-sm mb-md text-primary">
                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                      psychology
                    </span>
                    <span className="font-bold text-label-md">AI Analysis Engine</span>
                  </div>
                  {selectedReport.aiCategory ? (
                    <div className="space-y-md">
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                          <span>Classification</span>
                          <span className="text-primary font-bold">
                            {selectedReport.aiConfidence != null ? `${Math.round(selectedReport.aiConfidence * 100)}% Confidence` : ''}
                          </span>
                        </div>
                        <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.round((selectedReport.aiConfidence ?? 0) * 100)}%` }}
                          ></div>
                        </div>
                        <p className="mt-2 font-label-md text-primary text-xs">Suggested Type: {selectedReport.aiCategory}</p>
                      </div>
                      {selectedReport.aiSummary && (
                        <div>
                          <span className="text-[11px] font-bold text-on-surface-variant uppercase">Summary</span>
                          <p className="text-body-md font-semibold text-xs mt-1">{selectedReport.aiSummary}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-on-surface-variant">AI analysis pending or not yet processed.</p>
                  )}
                </div>

                <div className="flex flex-col gap-sm flex-1">
                  <label className="text-[11px] font-bold text-on-surface-variant uppercase">Internal Administrative Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="flex-1 min-h-[100px] bg-surface-container-low border border-outline-variant/40 rounded-xl p-md text-body-md focus:ring-primary focus:border-primary resize-none"
                    placeholder="Add operational notes here..."
                  />
                </div>
              </div>

              <div className="w-full md:w-80 p-lg bg-surface-container-low flex flex-col gap-lg overflow-y-auto shrink-0">
                <div>
                  <h3 className="text-[11px] font-bold text-on-surface-variant uppercase mb-md">Location Details</h3>
                  <div className="rounded-xl overflow-hidden border border-outline-variant/30 h-40 bg-surface-dim relative">
                    <MapContainer selectedId={selectedReport.id} interactive={false} />
                  </div>
                  <div className="mt-md space-y-sm text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant">Latitude</span>
                      <span className="font-mono font-semibold">{selectedReport.lat != null ? `${selectedReport.lat.toFixed(4)}°` : 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant">Longitude</span>
                      <span className="font-mono font-semibold">{selectedReport.lng != null ? `${selectedReport.lng.toFixed(4)}°` : 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between items-start mt-1">
                      <span className="text-on-surface-variant shrink-0">Address</span>
                      <span className="font-semibold text-right break-words">{selectedReport.location}</span>
                    </div>
                  </div>
                </div>

                <hr className="border-outline-variant/20" />

                <div>
                  <h3 className="text-[11px] font-bold text-on-surface-variant uppercase mb-md">Dispatch &amp; Status</h3>
                  <div className="space-y-md">
                    <div className="flex flex-col gap-xs">
                      <label className="text-xs font-semibold">Assigned Team</label>
                      <select
                        value={selectedReport.assignedTeamId ?? ''}
                        onChange={(e) => routeReportToTeam(selectedReport.id, Number(e.target.value))}
                        className="w-full bg-white border border-outline-variant/40 rounded-lg p-sm text-label-md"
                      >
                        <option value="">Unassigned</option>
                        {teams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-xs">
                      <label className="text-xs font-semibold">Current Status</label>
                      <StatusBadge type="status" value={selectedReport.status} />
                      <div className="flex flex-wrap gap-xs mt-xs">
                        <button
                          onClick={() => updateReport(selectedReport.id, { status: 'under_admin_review' })}
                          disabled={selectedReport.status !== 'submitted'}
                          className="px-3 py-1.5 border rounded-full text-xs font-bold bg-white border-outline-variant text-on-surface-variant hover:bg-surface-container transition-all disabled:opacity-40"
                        >
                          Mark Under Review
                        </button>
                        {selectedReport.status === 'pending_ai_verification' && (
                          <button
                            onClick={() => approveFix(selectedReport.id)}
                            className="px-3 py-1.5 border border-secondary bg-secondary text-white rounded-full text-xs font-bold hover:brightness-105 transition-all flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm leading-none">check_circle</span>
                            Mark Fixed
                          </button>
                        )}
                      </div>
                      {selectedReport.status === 'pending_ai_verification' && (
                        <p className="text-[11px] text-on-surface-variant mt-1">
                          {selectedReport.aiPhotoMatch
                            ? 'AI verified the after-photo shows the issue fixed — review and approve to resolve + archive.'
                            : 'Waiting on AI verification of the after-photo.'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-lg">
                  <button
                    onClick={handleUpdateNotes}
                    className="w-full bg-on-background hover:brightness-125 text-white py-3 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-md active:scale-98"
                  >
                    <span className="material-symbols-outlined text-lg leading-none">save</span>
                    Save Notes
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-outline-variant/30 flex items-center justify-center p-xl flex-grow">
              <p className="text-on-surface-variant">No report selected.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
export default AdminDashboard;
