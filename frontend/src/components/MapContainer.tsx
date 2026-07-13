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
  const [zoom, setZoom] = useState(13);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');

  const selectedReport = reports.find((report) => report.id === selectedId) ?? reports[0];
  const centerLat = selectedReport?.lat ?? 40.7128;
  const centerLng = selectedReport?.lng ?? -74.0060;
  const span = 1.04 / zoom;
  const mapUrl = `https://www.google.com/maps?q=${centerLat},${centerLng}&z=${zoom}&t=${
    mapType === 'satellite' ? 'k' : 'm'
  }&output=embed`;

  const getPinPosition = (report: Report) => {
    const latRange = Math.max(span * 2, 0.0001);
    const lngRange = Math.max(span * 2, 0.0001);
    const top = Math.min(92, Math.max(8, ((centerLat + span - report.lat) / latRange) * 100));
    const left = Math.min(92, Math.max(8, ((report.lng - (centerLng - span)) / lngRange) * 100));
    return { top: `${top}%`, left: `${left}%` };
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
      {/* Google Maps base layer */}
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
          onClick={() => setZoom((z) => Math.min(z + 1, 18))}
          className="bg-white p-2 rounded-lg shadow-md hover:bg-surface-container-high transition-colors text-on-surface flex items-center justify-center border border-outline-variant/40"
        >
          <span className="material-symbols-outlined leading-none">add</span>
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 1, 10))}
          className="bg-white p-2 rounded-lg shadow-md hover:bg-surface-container-high transition-colors text-on-surface flex items-center justify-center border border-outline-variant/40"
        >
          <span className="material-symbols-outlined leading-none">remove</span>
        </button>
      </div>

      {/* Map Type Toggle */}
      <div className="absolute top-lg left-lg z-30">
        <div className="bg-white/90 backdrop-blur-md p-1 rounded-xl shadow-lg border border-outline-variant/30 flex gap-xs">
          <button
            onClick={() => setMapType('roadmap')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              mapType === 'roadmap' ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            Street
          </button>
          <button
            onClick={() => setMapType('satellite')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              mapType === 'satellite' ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            Satellite
          </button>
        </div>
      </div>
    </div>
  );
};
export default MapContainer;
