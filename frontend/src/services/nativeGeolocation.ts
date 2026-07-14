import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export const isNativeApp = () => Capacitor.isNativePlatform();

export interface GpsFix {
  lat: number;
  lng: number;
  accuracy?: number;
}

const GOOD_ENOUGH_ACCURACY_METERS = 20;
const MAX_GPS_WATCH_MS = 12000;

const round6 = (n: number) => Number(n.toFixed(6));

const getNativeFix = async (): Promise<GpsFix> => {
  const position = await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: MAX_GPS_WATCH_MS,
  });
  return {
    lat: round6(position.coords.latitude),
    lng: round6(position.coords.longitude),
    accuracy: position.coords.accuracy,
  };
};

// A single getCurrentPosition() call often returns a coarse, network-based first fix.
// watchPosition keeps refining as the device gets a satellite lock, so we keep the best
// (lowest-accuracy-number) reading across a bounded window instead of taking the first one.
const getWebFix = (onUpdate?: (fix: GpsFix) => void): Promise<GpsFix> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('This browser does not support GPS location.'));
      return;
    }
    if (!window.isSecureContext) {
      reject(new Error('GPS requires a secure (HTTPS or localhost) connection — this page is not served securely.'));
      return;
    }

    let best: GeolocationPosition | null = null;
    let finished = false;
    let watchId = -1;

    const finish = () => {
      if (finished) return;
      finished = true;
      if (watchId !== -1) navigator.geolocation.clearWatch(watchId);
      clearTimeout(timeoutId);

      if (!best) {
        reject(new Error('Could not get your GPS location.'));
        return;
      }
      resolve({
        lat: round6(best.coords.latitude),
        lng: round6(best.coords.longitude),
        accuracy: best.coords.accuracy,
      });
    };

    const timeoutId = setTimeout(finish, MAX_GPS_WATCH_MS);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!best || position.coords.accuracy < best.coords.accuracy) {
          best = position;
          onUpdate?.({
            lat: round6(position.coords.latitude),
            lng: round6(position.coords.longitude),
            accuracy: position.coords.accuracy,
          });
        }
        if (position.coords.accuracy <= GOOD_ENOUGH_ACCURACY_METERS) {
          finish();
        }
      },
      (error) => {
        if (finished || best) return; // keep whatever fix we already have on a later error
        finished = true;
        clearTimeout(timeoutId);
        if (watchId !== -1) navigator.geolocation.clearWatch(watchId);
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error('Location permission was denied. Please allow location access and try again.'));
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          reject(new Error('Your location could not be determined right now. Please try again.'));
        } else if (error.code === error.TIMEOUT) {
          reject(new Error('Getting your location took too long. Please try again.'));
        } else {
          reject(new Error('Could not get your GPS location.'));
        }
      },
      { enableHighAccuracy: true, timeout: MAX_GPS_WATCH_MS, maximumAge: 0 }
    );
  });
};

/**
 * Resolves the best available GPS fix. On native builds this uses Capacitor's Geolocation
 * plugin (device GPS chip); on web it uses the browser Geolocation API, refining over a
 * bounded window via watchPosition. `onUpdate` (web only) reports intermediate fixes as
 * accuracy improves, so the UI can show a live-updating pin before the fix is final.
 */
export const getCurrentFix = (onUpdate?: (fix: GpsFix) => void): Promise<GpsFix> => {
  if (isNativeApp()) return getNativeFix();
  return getWebFix(onUpdate);
};
