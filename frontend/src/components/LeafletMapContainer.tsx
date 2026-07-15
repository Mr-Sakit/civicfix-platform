import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useApp } from '../context/AppContext';
import { DEFAULT_MAP_CENTER } from '../constants/map';
import type { MapContainerProps } from './mapContainerTypes';
import { PIN_COLORS, DEFAULT_PIN_COLOR, MY_LOCATION_COLOR } from './mapContainerTypes';

const PIN_ICONS: Record<string, string> = {
  'Road Damage': 'warning',
  'Street Lighting': 'lightbulb',
  'Waste Management': 'delete',
  'Water Leak': 'water_drop',
};
const DEFAULT_PIN_ICON = 'shield';

const TILE_LAYERS: Record<'roadmap' | 'satellite', { url: string; attribution: string }> = {
  roadmap: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
};

const createPinIcon = (icon: string, color: string, selected: boolean): L.DivIcon => {
  const size = selected ? 44 : 36;
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:3px solid #ffffff;box-shadow:0 4px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
      <span class="material-symbols-outlined" style="color:#fff;font-size:${selected ? '20px' : '16px'};line-height:1;">${icon}</span>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const MY_LOCATION_ICON = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:20px;height:20px;">
    <span style="position:absolute;inset:-8px;border-radius:9999px;background:rgba(0,40,142,0.3);animation:ping 1.6s cubic-bezier(0,0,0.2,1) infinite;"></span>
    <span style="position:relative;display:block;width:20px;height:20px;border-radius:9999px;background:${MY_LOCATION_COLOR};border:4px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></span>
  </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export const LeafletMapContainer: React.FC<MapContainerProps> = ({
  onPinClick,
  selectedId,
  interactive = true,
  focusCoordinates = null,
  hideReportPins = false,
}) => {
  const { reports, setSelectedReportId } = useApp();
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const myLocationMarkerRef = useRef<L.Marker | null>(null);

  const reportsWithCoords = reports.filter((report) => report.lat != null && report.lng != null && !report.archived);
  const selectedReport = reportsWithCoords.find((report) => report.id === selectedId) ?? reportsWithCoords[0];
  const centerLat = focusCoordinates?.lat ?? selectedReport?.lat ?? DEFAULT_MAP_CENTER.lat;
  const centerLng = focusCoordinates?.lng ?? selectedReport?.lng ?? DEFAULT_MAP_CENTER.lng;

  // Initialize the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [centerLat, centerLng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });
    tileLayerRef.current = L.tileLayer(TILE_LAYERS.roadmap.url, {
      attribution: TILE_LAYERS.roadmap.attribution,
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter smoothly whenever the target location changes.
  useEffect(() => {
    mapRef.current?.panTo([centerLat, centerLng]);
  }, [centerLat, centerLng]);

  // Swap tile layer on map type change.
  useEffect(() => {
    if (!mapRef.current) return;
    if (tileLayerRef.current) mapRef.current.removeLayer(tileLayerRef.current);
    const layer = TILE_LAYERS[mapType];
    tileLayerRef.current = L.tileLayer(layer.url, { attribution: layer.attribution, maxZoom: 19 }).addTo(mapRef.current);
  }, [mapType]);

  // "My location" marker.
  useEffect(() => {
    if (!mapRef.current) return;

    if (myLocationMarkerRef.current) {
      myLocationMarkerRef.current.remove();
      myLocationMarkerRef.current = null;
    }

    if (focusCoordinates) {
      myLocationMarkerRef.current = L.marker([focusCoordinates.lat, focusCoordinates.lng], {
        icon: MY_LOCATION_ICON,
        zIndexOffset: 999,
      }).addTo(mapRef.current);
    }
  }, [focusCoordinates?.lat, focusCoordinates?.lng]);

  // Report pin markers, colored per category.
  const reportKey = reportsWithCoords.map((r) => `${r.id}:${r.lat}:${r.lng}:${r.category}`).join('|');
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (hideReportPins) return;

    markersRef.current = reportsWithCoords.map((report) => {
      const isSelected = selectedId === report.id;
      const icon = createPinIcon(
        PIN_ICONS[report.category] ?? DEFAULT_PIN_ICON,
        PIN_COLORS[report.category] ?? DEFAULT_PIN_COLOR,
        isSelected
      );
      const marker = L.marker([report.lat as number, report.lng as number], {
        icon,
        title: report.title,
        zIndexOffset: isSelected ? 999 : 0,
      }).addTo(map);

      marker.on('click', () => {
        if (!interactive) return;
        if (onPinClick) onPinClick(report.id);
        else setSelectedReportId(report.id);
      });

      return marker;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportKey, selectedId, hideReportPins, interactive]);

  return (
    <div className="w-full h-full relative bg-surface-container overflow-hidden group">
      <div ref={containerRef} className="w-full h-full" />

      {/* Map Controls */}
      <div className="absolute bottom-lg left-lg flex flex-col gap-sm z-[1000]">
        <button
          onClick={() => mapRef.current?.zoomIn()}
          className="bg-white p-2 rounded-lg shadow-md hover:bg-surface-container-high transition-colors text-on-surface flex items-center justify-center border border-outline-variant/40"
        >
          <span className="material-symbols-outlined leading-none">add</span>
        </button>
        <button
          onClick={() => mapRef.current?.zoomOut()}
          className="bg-white p-2 rounded-lg shadow-md hover:bg-surface-container-high transition-colors text-on-surface flex items-center justify-center border border-outline-variant/40"
        >
          <span className="material-symbols-outlined leading-none">remove</span>
        </button>
      </div>

      {/* Map Type Toggle */}
      <div className="absolute top-lg left-lg z-[1000]">
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
export default LeafletMapContainer;
