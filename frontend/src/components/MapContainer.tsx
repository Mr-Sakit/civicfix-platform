import React from 'react';
import type { MapContainerProps } from './mapContainerTypes';
import { LeafletMapContainer } from './LeafletMapContainer';
import { GoogleMapContainer } from './GoogleMapContainer';
import { isNativeApp } from '../services/nativeGeolocation';

// Native Android build: Leaflet + OpenStreetMap tiles (no API key needed).
// Web build: Google Maps.
export const MapContainer: React.FC<MapContainerProps> = (props) =>
  isNativeApp() ? <LeafletMapContainer {...props} /> : <GoogleMapContainer {...props} />;

export default MapContainer;
