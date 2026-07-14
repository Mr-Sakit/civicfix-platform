export interface GpsFix {
  lat: number;
  lng: number;
  accuracy?: number;
}

const goodEnoughAccuracyMeters = 25;
const maxGpsWatchMs = 12000;

const round6 = (value: number) => Number(value.toFixed(6));

export const getCurrentFix = (onUpdate?: (fix: GpsFix) => void): Promise<GpsFix> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('This browser does not support GPS location.'));
      return;
    }

    if (!window.isSecureContext) {
      reject(new Error('GPS requires HTTPS or localhost.'));
      return;
    }

    let best: GeolocationPosition | null = null;
    let finished = false;
    let watchId = -1;

    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutId);
      if (watchId !== -1) navigator.geolocation.clearWatch(watchId);

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

    const timeoutId = window.setTimeout(finish, maxGpsWatchMs);

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

        if (position.coords.accuracy <= goodEnoughAccuracyMeters) {
          finish();
        }
      },
      (error) => {
        if (finished || best) return;
        finished = true;
        clearTimeout(timeoutId);
        if (watchId !== -1) navigator.geolocation.clearWatch(watchId);

        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error('Location permission was denied. You can still type the location manually.'));
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          reject(new Error('Your location is unavailable right now. You can still type it manually.'));
        } else {
          reject(new Error('GPS location timed out. You can still type the location manually.'));
        }
      },
      { enableHighAccuracy: true, timeout: maxGpsWatchMs, maximumAge: 0 }
    );
  });
};
