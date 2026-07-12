import React, { useState } from 'react';
import { useApp, type Report } from '../context/AppContext';

interface MapContainerProps {
  onPinClick?: (id: string) => void;
  selectedId?: string;
  interactive?: boolean;
}

export const MapContainer: React.FC<MapContainerProps> = ({
  onPinClick,
  selectedId,
  interactive = true
}) => {
  const { reports, setSelectedReportId } = useApp();
  const [zoom, setZoom] = useState(1);
  const [mapType, setMapType] = useState<'standard' | 'transport' | 'cycle'>('standard');

  const selectedReport = reports.find((report) => report.id === selectedId) ?? reports[0];
  const centerLat = selectedReport?.lat ?? 40.7128;
  const centerLng = selectedReport?.lng ?? -74.0060;
  const span = 0.08 / zoom;
  const bbox = [
    centerLng - span,
    centerLat - span,
    centerLng + span,
    centerLat + span,
  ].join('%2C');
  const mapLayer = mapType === 'cycle' ? 'C' : mapType === 'transport' ? 'T' : 'M';
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=${mapLayer}&marker=${centerLat}%2C${centerLng}`;

  // Coordinates mock to CSS percentages on the static map image
  const getPinPosition = (report: Report) => {
    // Generate distinct coordinates based on report ID or use lat/lng
    switch (report.id) {
      case '#FIX-8842': return { top: '25%', left: '42%' };
      case '#FIX-8841': return { top: '55%', left: '65%' };
      case '#FIX-8839': return { top: '40%', left: '20%' };
      case '#FIX-8835': return { top: '70%', left: '35%' };
      case '#FIX-8834': return { top: '48%', left: '50%' };
      default:
        // Hash the ID to deterministic percentages
        const num = parseInt(report.id.replace(/\D/g, '')) || 0;
        const top = 20 + (num % 50) + '%';
        const left = 15 + ((num * 7) % 65) + '%';
        return { top, left };
    }
  };

  const getPinColor = (report: Report) => {
    switch (report.category) {
      case 'ROADS': return 'bg-error text-white';
      case 'UTILITIES': return 'bg-tertiary-container text-on-tertiary-container';
      case 'SANITATION': return 'bg-secondary text-white';
      default: return 'bg-primary text-white';
    }
  };

  const getPinIcon = (report: Report) => {
    switch (report.category) {
      case 'ROADS': return 'warning';
      case 'UTILITIES': return 'lightbulb';
      case 'SANITATION': return 'delete';
      default: return 'location_on';
    }
  };

  const handlePinClick = (id: string) => {
    if (!interactive) return;
    if (onPinClick) {
      onPinClick(id);
    } else {
      setSelectedReportId(id);
    }
  };

  return (
    <div className="w-full h-full relative bg-surface-container overflow-hidden group">
      {/* Real OpenStreetMap base layer */}
      <iframe
        key={mapUrl}
        title="CivicFix live neighborhood map"
        src={mapUrl}
        className="w-full h-full border-0 select-none"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />

      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/5 to-transparent z-10"></div>

      {/* Interactive Map Pins */}
      <div className="absolute inset-0 z-20">
        {reports.map((report) => {
          const pos = getPinPosition(report);
          const isSelected = selectedId === report.id;
          return (
            <div
              key={report.id}
              style={{
                top: pos.top,
                left: pos.left,
                transform: `translate(-50%, -50%) ${isSelected ? 'scale(1.25)' : ''}`
              }}
              onClick={() => handlePinClick(report.id)}
              className={`absolute group/pin cursor-pointer map-pin z-20 ${
                isSelected ? 'z-40' : ''
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full border-4 border-white shadow-xl flex items-center justify-center transition-all ${getPinColor(
                  report
                )} ${isSelected ? 'ring-4 ring-primary/40 scale-110 shadow-2xl' : ''}`}
              >
                <span className="material-symbols-outlined text-sm leading-none">
                  {getPinIcon(report)}
                </span>
              </div>

              {/* Tooltip Overlay */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 bg-white rounded-xl shadow-2xl p-md opacity-0 group-hover/pin:opacity-100 transition-opacity pointer-events-none border border-outline-variant/60 z-50">
                <div className="text-label-sm text-primary font-bold mb-0.5">{report.category}</div>
                <div className="text-body-md font-bold mb-1 text-on-surface line-clamp-1">{report.title}</div>
                <div className="text-[10px] text-on-surface-variant flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-xs">schedule</span>
                  {report.date}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Map Controls */}
      <div className="absolute bottom-lg left-lg flex flex-col gap-sm z-30">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.25, 2.5))}
          className="bg-white p-2 rounded-lg shadow-md hover:bg-surface-container-high transition-colors text-on-surface flex items-center justify-center border border-outline-variant/40"
        >
          <span className="material-symbols-outlined leading-none">add</span>
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.25, 1))}
          className="bg-white p-2 rounded-lg shadow-md hover:bg-surface-container-high transition-colors text-on-surface flex items-center justify-center border border-outline-variant/40"
        >
          <span className="material-symbols-outlined leading-none">remove</span>
        </button>
      </div>

      {/* Map Type Toggle */}
      <div className="absolute top-lg left-lg z-30">
        <div className="bg-white/90 backdrop-blur-md p-1 rounded-xl shadow-lg border border-outline-variant/30 flex gap-xs">
          <button
            onClick={() => setMapType('standard')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              mapType === 'standard' ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            Street
          </button>
          <button
            onClick={() => setMapType('transport')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              mapType === 'transport' ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            Transit
          </button>
          <button
            onClick={() => setMapType('cycle')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              mapType === 'cycle' ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            Cycle
          </button>
        </div>
      </div>
    </div>
  );
};
export default MapContainer;
