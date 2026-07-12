import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/StatusBadge';

export const AdminDashboard: React.FC = () => {
  const { reports, selectedReportId, setSelectedReportId, updateReport } = useApp();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Selected report details
  const selectedReport = reports.find((r) => r.id === selectedReportId) || reports[0];

  // Selected report edit states
  const [assignedCrew, setAssignedCrew] = useState(selectedReport?.assignedTo || 'Unassigned');
  const [notes, setNotes] = useState(selectedReport?.notes || '');
  const [status, setStatus] = useState<'Reported' | 'In Progress' | 'Resolved'>(selectedReport?.status || 'Reported');

  // Sync state if selection changes
  React.useEffect(() => {
    if (selectedReport) {
      setAssignedCrew(selectedReport.assignedTo);
      setNotes(selectedReport.notes || '');
      setStatus(selectedReport.status);
    }
  }, [selectedReportId]);

  // Handle saving updates
  const handleUpdateRecord = () => {
    if (selectedReport) {
      updateReport(selectedReport.id, {
        assignedTo: assignedCrew,
        notes: notes,
        status: status
      });
      alert(`Ticket ${selectedReport.id} successfully updated!`);
    }
  };

  // Metrics Ribbon Calculations
  const totalOpen = reports.filter((r) => r.status !== 'Resolved').length + 1280;
  const criticalAlerts = reports.filter((r) => r.isUrgent).length + 40;
  const inProgressTasks = reports.filter((r) => r.status === 'In Progress').length + 154;

  // Queue filter logic
  const filteredQueue = reports.filter((report) => {
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
        {/* Card 1 */}
        <div className="bg-white p-md rounded-xl border border-outline-variant/30 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-sm">
            <span className="material-symbols-outlined text-primary p-2 bg-primary/10 rounded-lg">inventory</span>
            <span className="text-secondary font-bold text-label-sm">+12%</span>
          </div>
          <div className="text-on-surface-variant font-label-md text-sm">Total Open Issues</div>
          <div className="font-headline-md text-headline-md mt-xs font-bold">{totalOpen}</div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-md rounded-xl border border-outline-variant/30 shadow-sm border-l-4 border-l-error">
          <div className="flex items-center justify-between mb-sm">
            <span className="material-symbols-outlined text-error p-2 bg-error/10 rounded-lg">bolt</span>
            <span className="text-error font-bold text-label-sm">High Priority</span>
          </div>
          <div className="text-on-surface-variant font-label-md text-sm">Critical AI Alerts</div>
          <div className="font-headline-md text-headline-md mt-xs font-bold">{criticalAlerts}</div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-md rounded-xl border border-outline-variant/30 shadow-sm">
          <div className="flex items-center justify-between mb-sm">
            <span className="material-symbols-outlined text-secondary p-2 bg-secondary/10 rounded-lg">engineering</span>
            <span className="text-on-surface-variant font-medium text-label-sm">Active Crew</span>
          </div>
          <div className="text-on-surface-variant font-label-md text-sm">In Progress Tasks</div>
          <div className="font-headline-md text-headline-md mt-xs font-bold">{inProgressTasks}</div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-md rounded-xl border border-outline-variant/30 shadow-sm">
          <div className="flex items-center justify-between mb-sm">
            <span className="material-symbols-outlined text-tertiary p-2 bg-tertiary/10 rounded-lg">schedule</span>
            <span className="text-secondary font-bold text-label-sm">-4h</span>
          </div>
          <div className="text-on-surface-variant font-label-md text-sm">Avg. Resolution Time</div>
          <div className="font-headline-md text-headline-md mt-xs font-bold">2.4 Days</div>
        </div>
      </section>

      {/* Split-Screen layout */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-lg flex-1 min-h-[600px]">
        {/* Left Side: Queue List */}
        <div className="xl:col-span-4 flex flex-col bg-white rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden h-[700px]">
          <div className="p-md border-b border-outline-variant/30 flex flex-col gap-sm bg-surface-bright">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-md text-headline-md text-primary font-bold">Report Queue</h2>
              <span className="bg-primary-container text-on-primary-container px-2 py-0.5 rounded-full text-[10px] font-bold">
                {filteredQueue.length} Active
              </span>
            </div>

            {/* Queue Search & Category Filter */}
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
                <option value="ROADS">Roads</option>
                <option value="UTILITIES">Utilities</option>
                <option value="SANITATION">Sanitation</option>
              </select>
            </div>
          </div>

          {/* Scrollable Queue Feed */}
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
                        <img
                          src={report.image}
                          className="w-14 h-14 rounded-lg object-cover shrink-0 border border-outline-variant/30"
                          alt="Thumbnail"
                        />
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
                        <div className="flex gap-xs mt-sm">
                          <StatusBadge type="category" value={report.category} />
                          <StatusBadge type="priority" value={report.priority} />
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
              
              {/* Left Column: Media & AI Analysis */}
              <div className="flex-1 p-lg flex flex-col gap-lg border-r border-outline-variant/20 overflow-y-auto">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="font-headline-md text-headline-md text-on-surface font-bold">
                      Issue Details: {selectedReport.id}
                    </h1>
                    <p className="text-xs text-on-surface-variant mt-xs">
                      Reported by: <span className="font-bold text-on-surface">{selectedReport.reporter}</span> at {selectedReport.date}
                    </p>
                  </div>
                  <div className="flex gap-sm">
                    <button
                      onClick={() => {
                        setAssignedCrew('Roads Dept - North');
                        setStatus('In Progress');
                        updateReport(selectedReport.id, {
                          assignedTo: 'Roads Dept - North',
                          status: 'In Progress'
                        });
                        alert('Dispatched to Roads Dept - North!');
                      }}
                      className="bg-primary text-on-primary px-md h-10 rounded-lg text-xs font-semibold hover:brightness-110 active:scale-95 transition-all flex items-center gap-1 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">send</span> Dispatch
                    </button>
                    <button className="border border-outline text-on-surface px-md h-10 rounded-lg text-xs font-semibold hover:bg-surface-container transition-all">
                      Archive
                    </button>
                  </div>
                </div>

                {/* Main Media Preview */}
                <div className="rounded-xl overflow-hidden aspect-video relative group border border-outline-variant/30 bg-surface-container shrink-0">
                  {selectedReport.image ? (
                    <img className="w-full h-full object-cover" alt="Detail view" src={selectedReport.image} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-outline">
                      <span className="material-symbols-outlined text-5xl">image</span>
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md text-white p-2 rounded-lg text-[10px] font-mono select-none">
                    IMG_SOURCE: CIVIC_CAM_442_A
                  </div>
                </div>

                {/* AI Classifier */}
                <div className="bg-primary/5 p-md rounded-xl border border-primary/20">
                  <div className="flex items-center gap-sm mb-md text-primary">
                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                      psychology
                    </span>
                    <span className="font-bold text-label-md">AI Analysis Engine</span>
                  </div>
                  <div className="space-y-md">
                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                        <span>Classification</span>
                        <span className="text-primary font-bold">94% Confidence</span>
                      </div>
                      <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: '94%' }}></div>
                      </div>
                      <p className="mt-2 font-label-md text-primary text-xs">
                        Suggested Type: {selectedReport.category === 'ROADS' ? 'Road Defect / Pothole' : selectedReport.category === 'UTILITIES' ? 'Streetlight Outage' : 'Sanitation issue'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-on-surface-variant uppercase">Suggested Action</span>
                      <p className="text-body-md font-semibold text-xs mt-1">Dispatch Crew (Tier 1 Urgency)</p>
                    </div>
                  </div>
                </div>

                {/* Internal Admin Notes */}
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

              {/* Right Column: Dispatch Panel */}
              <div className="w-full md:w-80 p-lg bg-surface-container-low flex flex-col gap-lg overflow-y-auto shrink-0">
                {/* Map Preview */}
                <div>
                  <h3 className="text-[11px] font-bold text-on-surface-variant uppercase mb-md">Location Details</h3>
                  <div className="rounded-xl overflow-hidden border border-outline-variant/30 h-40 bg-surface-dim relative">
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDLD9h1-dyAGaebWrFrIn8YkjBdkRedtwfbWF04AF8Myj0fGmWex2b-s5-r0vGdnuLAz1ZHO0K-vazKojeTejY6cYQelhSFQK_mHEuN5iVwrKlt4OLJQkFQUbHvRQi_lffiRvGMyBNbhs9tQ6kn9CBwPfbJt1q96oDb2-HmdAu19V9VVSiAYWd7fb7LEd0YW2sFc5blCon8sMESrcx1pPxSySX8h-ASni8qIE17peRZ4aPP6kDRBMzn91WfiANPcQPL5GUx-QQ2KHA"
                      className="w-full h-full object-cover"
                      alt="Mini map loc"
                    />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary">
                      <span className="material-symbols-outlined text-[32px] leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>
                        location_on
                      </span>
                    </div>
                  </div>
                  <div className="mt-md space-y-sm text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant">Latitude</span>
                      <span className="font-mono font-semibold">{selectedReport.lat.toFixed(4)}° N</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant">Longitude</span>
                      <span className="font-mono font-semibold">{selectedReport.lng.toFixed(4)}° W</span>
                    </div>
                    <div className="flex justify-between items-start mt-1">
                      <span className="text-on-surface-variant shrink-0">Address</span>
                      <span className="font-semibold text-right break-words">{selectedReport.location}</span>
                    </div>
                  </div>
                </div>

                <hr className="border-outline-variant/20" />

                {/* Dispatch & Actions */}
                <div>
                  <h3 className="text-[11px] font-bold text-on-surface-variant uppercase mb-md">Dispatch &amp; Status</h3>
                  <div className="space-y-md">
                    <div className="flex flex-col gap-xs">
                      <label className="text-xs font-semibold">Assign to Team</label>
                      <select
                        value={assignedCrew}
                        onChange={(e) => setAssignedCrew(e.target.value)}
                        className="w-full bg-white border border-outline-variant/40 rounded-lg p-sm text-label-md"
                      >
                        <option value="Unassigned">Unassigned</option>
                        <option value="Roads Dept - North">Roads Dept - North</option>
                        <option value="Roads Dept - South">Roads Dept - South</option>
                        <option value="External Contractor (FixIt Co)">External Contractor (FixIt Co)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-xs">
                      <label className="text-xs font-semibold">Current Status</label>
                      <div className="flex flex-wrap gap-xs">
                        <button
                          onClick={() => setStatus('Reported')}
                          className={`px-3 py-1.5 border rounded-full text-xs font-bold transition-all ${
                            status === 'Reported'
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-white border-outline-variant text-on-surface-variant hover:bg-surface-container'
                          }`}
                        >
                          Open
                        </button>
                        <button
                          onClick={() => setStatus('In Progress')}
                          className={`px-3 py-1.5 border rounded-full text-xs font-bold transition-all ${
                            status === 'In Progress'
                              ? 'bg-secondary-container border-secondary-container text-on-secondary-container shadow-sm'
                              : 'bg-white border-outline-variant text-on-surface-variant hover:bg-surface-container'
                          }`}
                        >
                          In Progress
                        </button>
                        <button
                          onClick={() => setStatus('Resolved')}
                          className={`px-3 py-1.5 border rounded-full text-xs font-bold transition-all ${
                            status === 'Resolved'
                              ? 'bg-secondary border-secondary text-white shadow-sm'
                              : 'bg-white border-outline-variant text-on-surface-variant hover:bg-surface-container'
                          }`}
                        >
                          Resolved
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-lg">
                  <button
                    onClick={handleUpdateRecord}
                    className="w-full bg-on-background hover:brightness-125 text-white py-3 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-md active:scale-98"
                  >
                    <span className="material-symbols-outlined text-lg leading-none">save</span>
                    Update Record
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
