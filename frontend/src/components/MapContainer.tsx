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
  const [mapType, setMapType] = useState<'street' | 'satellite' | 'terrain'>('street');

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

  // Maps depending on Map Type
  const mapImages = {
    street: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBOOUA9P8pe4BYhXihlD-l_k4417brZYksmrwnuNq6kds_lECcxJfuxu9Y4Ych2hHJP5GVBl_rIdea4yKNIoChAaslC40y5pVQXE4YjRAfYBGdg38ke47z0Vx6rVI-Q4UP5bIxJ5MtAw35juEQ8V89BHmwcjZ-6gGEMmShXr37EG_M1vJ11sAqXRzFCdhLMsd_fxG6U9JsJ1H6K1WQbq69frLQYrwd41tFIQwqpK2A88aOoqi07n2YOnOfCSpc_gf9kLTZwQ7EUpQc',
    satellite: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBgCc9BjPTpMBT0UzG7fcfAEiOEL_qXj8yi6CrOd8WnGrDpENM9IR_xBmDkxQA6TClCREViwOqD7IiSWmRomlil9VoJQuuk4cLiefMvACBrIwABkux0UkdZY10ulQBXE9HHT5z_2QaUdLsWh9znOeQNcUdeoj_hhiMXXQtqilkp1E1ga-R2aYTo14OnjFU0gcynPCSa3CenKkH44HcUxDbyfGvomh6ptmpDJC8cdFikOIcH3K8L4qZl3OugYOpyLiG_Q5OizBdzdrE',
    terrain: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCIY4fdBSixnIb601QbxJ29MDFwoykrMKKpHqfujbG6kC3hjDu-BUdhJJ9ebKaAJBWUIV_ttxe7sdkmzYhjtmII24nreXlKF3nWcMAFBhf3EmQdqYLNinckYEMeVcyCiEzcrYDx91GwbvQg-uaw_JCswzvK92hA5vs_wa-48gY__nHBkok9Fd-3jw4n8lkaVvapak62VZL5I4-8LLuAKzPhJr1a2obXf0qDg_X9SOEWZ6YJ9wRvhEHNDzFKyusRIzy1Dfe_ByDhb6c'
  };

  return (
    <div className="w-full h-full relative bg-surface-container overflow-hidden group">
      {/* Map simulation base */}
      <img
        style={{
          transform: `scale(${zoom})`,
          transition: 'transform 0.3s ease-in-out',
        }}
        className="w-full h-full object-cover select-none"
        alt="Stylized interactive neighborhood map"
        src={mapImages[mapType]}
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
            onClick={() => setMapType('street')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              mapType === 'street' ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container-low'
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
          <button
            onClick={() => setMapType('terrain')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              mapType === 'terrain' ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            Terrain
          </button>
        </div>
      </div>
    </div>
  );
};
export default MapContainer;
