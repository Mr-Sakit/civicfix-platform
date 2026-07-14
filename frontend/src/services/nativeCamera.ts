import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export const isNativeApp = () => Capacitor.isNativePlatform();

/**
 * Forces a fresh in-app camera capture — no gallery option — on native builds.
 * On web, callers fall back to the existing <input type="file" capture="environment"> flow.
 */
export const takePhoto = async (): Promise<string> => {
  const photo = await Camera.getPhoto({
    source: CameraSource.Camera,
    resultType: CameraResultType.DataUrl,
    quality: 80,
    saveToGallery: false,
    correctOrientation: true,
  });

  if (!photo.dataUrl) {
    throw new Error('Camera did not return a photo.');
  }
  return photo.dataUrl;
};
