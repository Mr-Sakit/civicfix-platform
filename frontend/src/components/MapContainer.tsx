import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { DEFAULT_MAP_CENTER } from '../constants/map';

interface MapContainerProps {
  onPinClick?: (id: string) => void;
  selectedId?: string;
  interactive?: boolean;
  /** When set, centers the map here and shows a "my location" marker alongside report pins. */
  focusCoordinates?: { lat: number; lng: number } | null;
  /** Hide other reports' pins — used by the report wizard, which only cares about the citizen's own point. */
  hideReportPins?: boolean;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

declare global {
  interface Window {
    google?: any;
  }
}

let googleMapsPromise: Promise<any> | null = null;

const loadGoogleMaps = (): Promise<any> => {
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve(window.google);
      return;
    }

    const existing = document.getElementById('google-maps-script') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google));
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=marker`;
    script.async = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
};

const PIN_STYLES: Record<string, { color: string; icon: string }> = {
  'Road Damage': { color: '#ba1a1a', icon: 'warning' },
  'Street Lighting': { color: '#ffa929', icon: 'lightbulb' },
  'Waste Management': { color: '#006c49', icon: 'delete' },
  'Water Leak': { color: '#00288e', icon: 'water_drop' },
};
const DEFAULT_PIN_STYLE = { color: '#191c1e', icon: 'shield' };

const createPinElement = (icon: string, color: string, selected: boolean): HTMLDivElement => {
  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  wrapper.style.display = 'flex';
  wrapper.style.alignItems = 'center';
  wrapper.style.justifyContent = 'center';
  wrapper.style.width = selected ? '44px' : '36px';
  wrapper.style.height = selected ? '44px' : '36px';
  wrapper.style.borderRadius = '9999px';
  wrapper.style.background = color;
  wrapper.style.border = '3px solid #ffffff';
  wrapper.style.boxShadow = '0 4px 10px rgba(0,0,0,0.35)';
  wrapper.style.cursor = 'pointer';
  wrapper.innerHTML = `<span class="material-symbols-outlined" style="color:#fff;font-size:${selected ? '20px' : '16px'};line-height:1;">${icon}</span>`;
  return wrapper;
};

const createMyLocationElement = (): HTMLDivElement => {
  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  wrapper.style.width = '20px';
  wrapper.style.height = '20px';
  wrapper.innerHTML = `
    <span style="position:absolute;inset:-8px;border-radius:9999px;background:rgba(0,40,142,0.3);animation:ping 1.6s cubic-bezier(0,0,0.2,1) infinite;"></span>
    <span style="position:relative;display:block;width:20px;height:20px;border-radius:9999px;background:#00288e;border:4px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></span>
  `;
  return wrapper;
};

export const MapContainer: React.FC<MapContainerProps> = ({
  onPinClick,
  selectedId,
  interactive = true,
  focusCoordinates = null,
  hideReportPins = false,
}) => {
  const { reports, setSelectedReportId } = useApp();
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(GOOGLE_MAPS_API_KEY ? 'loading' : 'error');
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const myLocationMarkerRef = useRef<any>(null);

  // Archived reports (deleted-from-view via admin archive, or auto-archived on fix approval)
  // never show as map pins anywhere in the app — single point of enforcement.
  const reportsWithCoords = reports.filter((report) => report.lat != null && report.lng != null && !report.archived);
  const selectedReport = reportsWithCoords.find((report) => report.id === selectedId) ?? reportsWithCoords[0];
  const centerLat = focusCoordinates?.lat ?? selectedReport?.lat ?? DEFAULT_MAP_CENTER.lat;
  const centerLng = focusCoordinates?.lng ?? selectedReport?.lng ?? DEFAULT_MAP_CENTER.lng;

  // Initialize the map once.
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || !containerRef.current) return;
    let cancelled = false;

    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !containerRef.current) return;
        mapRef.current = new google.maps.Map(containerRef.current, {
          center: { lat: centerLat, lng: centerLng },
          zoom: 14,
          disableDefaultUI: true,
          gestureHandling: 'greedy',
          mapTypeId: mapType,
          mapId: 'DEMO_MAP_ID', // required for AdvancedMarkerElement; Google's public demo id, fine for this use
        });
        setStatus('ready');
      })
      .catch(() => setStatus('error'));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter smoothly whenever the target location changes.
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.panTo({ lat: centerLat, lng: centerLng });
    }
  }, [centerLat, centerLng]);

  useEffect(() => {
    if (mapRef.current) mapRef.current.setMapTypeId(mapType);
  }, [mapType]);

  // "My location" marker — shown alongside report pins whenever focusCoordinates is set.
  useEffect(() => {
    if (status !== 'ready' || !window.google) return;

    if (myLocationMarkerRef.current) {
      myLocationMarkerRef.current.map = null;
      myLocationMarkerRef.current = null;
    }

    if (focusCoordinates) {
      myLocationMarkerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
        position: { lat: focusCoordinates.lat, lng: focusCoordinates.lng },
        map: mapRef.current,
        content: createMyLocationElement(),
        zIndex: 999,
      });
    }
  }, [status, focusCoordinates?.lat, focusCoordinates?.lng]);

  // Report pin markers — colored icon badges per category, matching the app's category iconography.
  const reportKey = reportsWithCoords.map((r) => `${r.id}:${r.lat}:${r.lng}:${r.category}`).join('|');
  useEffect(() => {
    if (status !== 'ready' || !window.google) return;

    markersRef.current.forEach((marker) => {
      marker.map = null;
    });
    markersRef.current = [];

    if (hideReportPins) return;

    markersRef.current = reportsWithCoords.map((report) => {
      const isSelected = selectedId === report.id;
      const style = PIN_STYLES[report.category] ?? DEFAULT_PIN_STYLE;
      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        position: { lat: report.lat, lng: report.lng },
        map: mapRef.current,
        title: report.title,
        content: createPinElement(style.icon, style.color, isSelected),
        zIndex: isSelected ? 999 : undefined,
      });

      marker.addListener('click', () => {
        if (!interactive) return;
        if (onPinClick) onPinClick(report.id);
        else setSelectedReportId(report.id);
      });

      return marker;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, reportKey, selectedId, hideReportPins, interactive]);

  if (status === 'error') {
    return (
      <div className="w-full h-full relative bg-surface-container overflow-hidden flex items-center justify-center p-lg text-center">
        <div className="text-on-surface-variant text-sm">
          <span className="material-symbols-outlined text-4xl block mx-auto mb-sm text-outline">map</span>
          {GOOGLE_MAPS_API_KEY
            ? 'Could not load Google Maps.'
            : 'Google Maps API key is not configured (VITE_GOOGLE_MAPS_API_KEY).'}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-surface-container overflow-hidden group">
      <div ref={containerRef} className="w-full h-full" />

      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-container">
          <span className="material-symbols-outlined text-outline text-3xl animate-pulse">map</span>
        </div>
      )}

      {/* Map Controls */}
      <div className="absolute bottom-lg left-lg flex flex-col gap-sm z-30">
        <button
          onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 14) + 1)}
          className="bg-white p-2 rounded-lg shadow-md hover:bg-surface-container-high transition-colors text-on-surface flex items-center justify-center border border-outline-variant/40"
        >
          <span className="material-symbols-outlined leading-none">add</span>
        </button>
        <button
          onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 14) - 1)}
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
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              mapType === 'roadmap' ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined text-sm leading-none">map</span>
            Street
          </button>
          <button
            onClick={() => setMapType('satellite')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              mapType === 'satellite' ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined text-sm leading-none">satellite_alt</span>
            Satellite
          </button>
        </div>
      </div>
    </div>
  );
};
export default MapContainer;
