export interface MapContainerProps {
  onPinClick?: (id: string) => void;
  selectedId?: string;
  interactive?: boolean;
  /** When set, centers the map here and shows a "my location" marker alongside report pins. */
  focusCoordinates?: { lat: number; lng: number } | null;
  /** Hide other reports' pins — used by the report wizard, which only cares about the citizen's own point. */
  hideReportPins?: boolean;
}

export const PIN_COLORS: Record<string, string> = {
  'Road Damage': '#ba1a1a',
  'Street Lighting': '#ffa929',
  'Waste Management': '#006c49',
  'Water Leak': '#00288e',
};
export const DEFAULT_PIN_COLOR = '#191c1e';
export const MY_LOCATION_COLOR = '#00288e';
