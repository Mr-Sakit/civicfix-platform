import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MapContainer } from '../../components/MapContainer';
import { reverseGeocode } from '../../services/geocode';
import type { AddReportResult } from '../../context/AppContext';

export const ReportIssueWizard: React.FC = () => {
  const {
    addReport,
    setActiveTab,
    wizardStep,
    setWizardStep,
    wizardPhotos,
    addWizardPhoto,
    removeWizardPhoto,
    clearWizard,
    navigateToReportDetail,
  } = useApp();

  // Step 2 Form States
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [gpsError, setGpsError] = useState('');
  const [isRefiningGps, setIsRefiningGps] = useState(false);
  const [isLocatingAddress, setIsLocatingAddress] = useState(false);
  const [selectedImageName, setSelectedImageName] = useState('');
  const [submitResult, setSubmitResult] = useState<AddReportResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [localProgress, setLocalProgress] = useState(0);

  // A single getCurrentPosition() call often returns a coarse, network-based first fix.
  // watchPosition keeps refining as the device gets a satellite lock, so we keep the best
  // (lowest-accuracy-number) reading across a bounded window instead of taking the first one.
  const GOOD_ENOUGH_ACCURACY_METERS = 20;
  const MAX_GPS_WATCH_MS = 12000;

  const handleGPSClick = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsError('This browser does not support GPS location.');
      return;
    }

    if (!window.isSecureContext) {
      setGpsStatus('error');
      setGpsError('GPS requires a secure (HTTPS or localhost) connection — this page is not served securely.');
      return;
    }

    setGpsStatus('loading');
    setGpsError('');
    setIsRefiningGps(true);

    let best: GeolocationPosition | null = null;
    let finished = false;
    let watchId = -1;

    const applyBestFix = () => {
      if (!best) return;
      const nextCoordinates = {
        lat: Number(best.coords.latitude.toFixed(6)),
        lng: Number(best.coords.longitude.toFixed(6)),
        accuracy: best.coords.accuracy,
      };
      setCoordinates(nextCoordinates);
      setGpsStatus('ready');

      setIsLocatingAddress(true);
      reverseGeocode(nextCoordinates.lat, nextCoordinates.lng)
        .then(setAddress)
        .finally(() => setIsLocatingAddress(false));
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      if (watchId !== -1) navigator.geolocation.clearWatch(watchId);
      clearTimeout(timeoutId);
      setIsRefiningGps(false);

      if (!best) {
        setGpsStatus('error');
        setGpsError('Could not get your GPS location.');
        return;
      }
      applyBestFix();
    };

    const timeoutId = setTimeout(finish, MAX_GPS_WATCH_MS);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!best || position.coords.accuracy < best.coords.accuracy) {
          best = position;
          setCoordinates({
            lat: Number(position.coords.latitude.toFixed(6)),
            lng: Number(position.coords.longitude.toFixed(6)),
            accuracy: position.coords.accuracy,
          });
          setGpsStatus('ready');
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
        setGpsStatus('error');
        if (error.code === error.PERMISSION_DENIED) {
          setGpsError('Location permission was denied. Please allow location access and try again.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setGpsError('Your location could not be determined right now. Please try again.');
        } else if (error.code === error.TIMEOUT) {
          setGpsError('Getting your location took too long. Please try again.');
        } else {
          setGpsError('Could not get your GPS location.');
        }
      },
      { enableHighAccuracy: true, timeout: MAX_GPS_WATCH_MS, maximumAge: 0 }
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadRealImage(files[0]);
    }
  };

  const handleDropzoneClick = () => {
    const fileInput = document.getElementById('wizard-file-input');
    if (fileInput) fileInput.click();
  };

  const uploadRealImage = (file: File) => {
    if (isUploading) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Please choose an image smaller than 10MB.');
      return;
    }

    setIsUploading(true);
    setUploadFileName(file.name);
    setSelectedImageName(file.name);
    setLocalProgress(0);

    const reader = new FileReader();
    reader.onload = () => {
      addWizardPhoto(String(reader.result));
    };
    reader.readAsDataURL(file);

    const interval = setInterval(() => {
      setLocalProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          return 100;
        }
        return Math.min(100, prev + 20);
      });
    }, 120);
  };

  const handleNextStep = () => {
    if (wizardStep < 3) setWizardStep(wizardStep + 1);
  };

  const handleBackStep = () => {
    if (wizardStep > 1) setWizardStep(wizardStep - 1);
  };

  const canSubmit = Boolean(coordinates) && Boolean(description) && !isLocatingAddress;

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);

    const finalTitle = description
      ? description.length > 30
        ? `${description.substring(0, 30)}...`
        : description
      : 'New Issue Report';

    const result = await addReport({
      title: finalTitle,
      description: description || 'No additional description provided.',
      location: address || `${coordinates!.lat}, ${coordinates!.lng}`,
      image: wizardPhotos[0] || '',
      imageName: selectedImageName,
      lat: coordinates!.lat,
      lng: coordinates!.lng,
    });

    setSubmitResult(result);
    setIsSubmitting(false);
    setWizardStep(3);
  };

  const handleFinish = () => {
    clearWizard();
    setSubmitResult(null);
    setActiveTab('home');
  };

  // Step 1: Upload Photo View
  const renderStep1 = () => (
    <div className="space-y-lg animate-fade-in">
      <div className="space-y-xs">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Step 1: Upload Photo</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Provide a clear photo of the issue to help our team respond faster.
        </p>
      </div>

      {/* AI Smart Banner */}
      <div className="bg-secondary-container/20 border border-secondary/30 p-md rounded-lg flex gap-md items-center">
        <div className="bg-secondary-container p-2 rounded-full flex items-center justify-center text-on-secondary-container shrink-0">
          <span className="material-symbols-outlined text-on-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
            auto_awesome
          </span>
        </div>
        <div>
          <p className="font-label-md text-label-md text-on-secondary-container">AI Smart Categorization</p>
          <p className="font-body-md text-sm text-on-surface-variant leading-tight">
            AI will automatically categorize your photo and verify it matches your description.
          </p>
        </div>
      </div>

      {/* Dropzone Area */}
      <div
        onClick={handleDropzoneClick}
        className="border-2 border-dashed border-outline-variant hover:border-primary transition-colors bg-surface-container-low rounded-xl p-xl flex flex-col items-center justify-center gap-md cursor-pointer group"
      >
        <input
          id="wizard-file-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        <div className="w-16 h-16 bg-primary-fixed rounded-full flex items-center justify-center group-hover:scale-110 transition-transform text-primary">
          <span className="material-symbols-outlined text-4xl leading-none">cloud_upload</span>
        </div>
        <div className="text-center">
          <p className="font-headline-md text-body-lg font-bold text-on-surface">Drag photos here or click to browse</p>
          <p className="font-label-md text-label-md text-on-surface-variant mt-1">Supports JPG, PNG (Max 10MB)</p>
        </div>
      </div>

      {/* Upload Progress Loader */}
      {isUploading && (
        <div className="space-y-sm p-sm bg-surface rounded-lg border border-outline-variant/30">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-sm">
              <span className="material-symbols-outlined text-on-surface-variant">image</span>
              <span className="font-label-md text-label-md text-on-surface truncate max-w-[200px]">{uploadFileName}</span>
            </div>
            <span className="font-label-md text-label-md text-primary font-bold">{localProgress}%</span>
          </div>
          <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
            <div className="h-full bg-primary progress-bar-fill transition-all duration-150" style={{ width: `${localProgress}%` }}></div>
          </div>
        </div>
      )}

      {/* Media Preview Grid */}
      <div className="space-y-sm">
        <label className="font-label-md text-label-md text-on-surface-variant">Uploaded Photos ({wizardPhotos.length})</label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-md pt-base">
          {wizardPhotos.map((photo, index) => (
            <div key={index} className="aspect-square rounded-lg border border-outline-variant overflow-hidden relative group">
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeWizardPhoto(index);
                  }}
                  className="bg-error text-on-error p-1.5 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined text-sm leading-none">close</span>
                </button>
              </div>
              <img className="w-full h-full object-cover" src={photo} alt={`Preview ${index + 1}`} />
            </div>
          ))}
          <div
            onClick={handleDropzoneClick}
            className="aspect-square rounded-lg border border-dashed border-outline-variant flex items-center justify-center hover:bg-surface-variant transition-colors cursor-pointer text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-2xl">add</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-lg flex justify-between border-t border-outline-variant/30">
        <button
          onClick={() => setActiveTab('home')}
          className="px-xl py-2.5 rounded-lg border border-outline text-on-surface-variant font-label-md text-label-md hover:bg-surface-variant transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleNextStep}
          disabled={wizardPhotos.length === 0}
          className="px-xl py-2.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md flex items-center gap-sm hover:opacity-90 shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
        >
          Next
          <span className="material-symbols-outlined text-sm leading-none">arrow_forward</span>
        </button>
      </div>
    </div>
  );

  // Step 2: Location & Details View
  const renderStep2 = () => (
    <div className="space-y-lg animate-fade-in">
      {/* Location Section */}
      <div className="space-y-md">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
            location_on
          </span>
          <h1 className="font-headline-md text-headline-md text-on-surface">Where is the issue?</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          <div className="md:col-span-2 relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input
              value={isLocatingAddress ? 'Locating address…' : address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={isLocatingAddress}
              className="w-full h-[56px] pl-12 pr-md rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-body-md text-body-md disabled:opacity-60"
              placeholder="Enter street address or intersection, or use GPS"
              type="text"
            />
          </div>
          <button
            onClick={handleGPSClick}
            disabled={isRefiningGps}
            className="h-[56px] px-md rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-primary font-label-md text-label-md flex items-center justify-center gap-sm transition-all border border-outline-variant/20 shadow-sm active:scale-95 disabled:opacity-70"
          >
            <span className="material-symbols-outlined leading-none">my_location</span>
            {isRefiningGps ? 'Improving accuracy...' : 'Use Current GPS'}
          </button>
        </div>
        {gpsStatus === 'ready' && coordinates && (
          <p className="text-xs text-secondary font-semibold">
            GPS locked: {coordinates.lat}, {coordinates.lng}
            {coordinates.accuracy != null && ` (±${Math.round(coordinates.accuracy)}m accuracy)`}
            {isRefiningGps && ' — improving accuracy…'}
            {isLocatingAddress && ' — looking up address…'}
          </p>
        )}
        {gpsStatus === 'error' && (
          <p className="text-xs text-error font-semibold">
            {gpsError || 'GPS unavailable. A GPS fix is required to submit a report — please try again.'}
          </p>
        )}
        {gpsStatus === 'idle' && (
          <p className="text-xs text-on-surface-variant">
            We need your real GPS location to submit — tap "Use Current GPS" above.
          </p>
        )}

        {/* Mini Map Preview */}
        <div className="relative h-64 w-full rounded-xl overflow-hidden shadow-inner border border-outline-variant/30">
          <MapContainer interactive={false} focusCoordinates={coordinates} hideReportPins />
          {coordinates && (
            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-md py-sm rounded-lg shadow-md border border-outline-variant/30 flex items-center gap-sm z-30">
              <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
              <span className="font-label-md text-label-md text-on-surface">Location Locked</span>
            </div>
          )}
        </div>
      </div>

      <div className="h-px bg-outline-variant/20 w-full"></div>

      {/* Details Section */}
      <div className="space-y-md">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
            edit_note
          </span>
          <h2 className="font-headline-md text-headline-md text-on-surface">Add details</h2>
        </div>

        <div className="bg-secondary-container/20 border border-secondary/30 p-md rounded-lg flex gap-md items-center">
          <div className="bg-secondary-container p-2 rounded-full flex items-center justify-center text-on-secondary-container shrink-0">
            <span className="material-symbols-outlined text-on-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
              auto_awesome
            </span>
          </div>
          <p className="font-body-md text-sm text-on-secondary-container leading-tight">
            No need to pick a category — our AI will read your photo and description and categorize this report for you.
          </p>
        </div>

        <div className="space-y-sm">
          <label className="font-label-md text-label-md text-on-surface-variant">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full min-h-[120px] p-md rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-body-md text-body-md resize-none"
            placeholder="Tell us more about the issue (e.g. size of pothole, specific location, or any safety hazards)..."
          />
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-lg flex justify-between border-t border-outline-variant/30">
        <button
          onClick={handleBackStep}
          className="px-xl py-2.5 rounded-lg border border-outline text-on-surface-variant font-label-md text-label-md hover:bg-surface-variant transition-all flex items-center gap-sm active:scale-95"
        >
          <span className="material-symbols-outlined text-sm leading-none">arrow_back</span>
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className="px-xl py-2.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md flex items-center gap-sm hover:opacity-90 shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Report'}
          <span className="material-symbols-outlined text-sm leading-none">send</span>
        </button>
      </div>
    </div>
  );

  // Step 3: Result View
  const renderStep3 = () => {
    if (!submitResult || submitResult.status === 'created') {
      return (
        <div className="text-center py-xl space-y-lg animate-fade-in">
          <div className="w-20 h-20 bg-secondary text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-secondary/20">
            <span className="material-symbols-outlined text-5xl leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>
              check
            </span>
          </div>
          <div className="space-y-xs">
            <h1 className="text-headline-lg font-headline-lg text-on-surface">Report Submitted Successfully!</h1>
            <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
              Thank you for helping us improve our city. Your report has been saved and is awaiting admin review.
            </p>
          </div>
          {submitResult?.status === 'created' && (
            <div className="bg-surface-container-low py-sm px-lg rounded-xl border border-outline-variant/30 w-fit mx-auto font-mono text-sm text-primary font-bold">
              TICKET ID: {submitResult.report.id}
            </div>
          )}
          <div className="pt-lg flex justify-center gap-md border-t border-outline-variant/30 max-w-md mx-auto">
            <button
              onClick={() => {
                clearWizard();
                setSubmitResult(null);
                setActiveTab('activity');
              }}
              className="px-lg py-2.5 rounded-lg border border-outline text-on-surface-variant font-label-md text-label-md hover:bg-surface-variant transition-all active:scale-95"
            >
              View Activity Feed
            </button>
            <button
              onClick={handleFinish}
              className="px-lg py-2.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container shadow-md transition-all active:scale-95"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      );
    }

    if (submitResult.status === 'duplicate') {
      return (
        <div className="text-center py-xl space-y-lg animate-fade-in">
          <div className="w-20 h-20 bg-tertiary text-white rounded-full flex items-center justify-center mx-auto shadow-lg">
            <span className="material-symbols-outlined text-5xl leading-none">group_add</span>
          </div>
          <div className="space-y-xs">
            <h1 className="text-headline-lg font-headline-lg text-on-surface">Looks Like This Was Already Reported</h1>
            <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
              We found an existing report that matches this issue (
              <strong>{submitResult.existingReport.title}</strong>) and added you as a watcher instead of creating a
              duplicate.
            </p>
          </div>
          <div className="pt-lg flex justify-center gap-md border-t border-outline-variant/30 max-w-md mx-auto">
            <button
              onClick={() => {
                clearWizard();
                setSubmitResult(null);
                if (submitResult.existingReport.backendId) navigateToReportDetail(submitResult.existingReport.backendId);
              }}
              className="px-lg py-2.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container shadow-md transition-all active:scale-95"
            >
              View That Report
            </button>
            <button
              onClick={handleFinish}
              className="px-lg py-2.5 rounded-lg border border-outline text-on-surface-variant font-label-md text-label-md hover:bg-surface-variant transition-all active:scale-95"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="text-center py-xl space-y-lg animate-fade-in">
        <div className="w-20 h-20 bg-error text-white rounded-full flex items-center justify-center mx-auto shadow-lg">
          <span className="material-symbols-outlined text-5xl leading-none">error</span>
        </div>
        <div className="space-y-xs">
          <h1 className="text-headline-lg font-headline-lg text-on-surface">
            {submitResult.status === 'mismatch' ? "That Photo Doesn't Quite Match" : 'Something Went Wrong'}
          </h1>
          <p className="text-body-md text-on-surface-variant max-w-md mx-auto">{submitResult.message}</p>
        </div>
        <div className="pt-lg flex justify-center gap-md border-t border-outline-variant/30 max-w-md mx-auto">
          <button
            onClick={() => {
              setSubmitResult(null);
              setWizardStep(1);
            }}
            className="px-lg py-2.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container shadow-md transition-all active:scale-95"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  };

  return (
    <main className="max-w-4xl mx-auto py-xl px-gutter">
      {/* Progress Steps Header */}
      <nav className="mb-xl flex items-center justify-between px-md">
        {/* Step 1 */}
        <div className="flex items-center gap-sm">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
              wizardStep > 1
                ? 'bg-secondary text-white'
                : wizardStep === 1
                ? 'bg-primary text-white shadow-lg ring-4 ring-primary/20'
                : 'bg-surface-container-highest text-on-surface-variant'
            }`}
          >
            {wizardStep > 1 ? (
              <span className="material-symbols-outlined text-sm leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>
                check
              </span>
            ) : (
              '1'
            )}
          </div>
          <span className={`font-label-md text-label-md ${wizardStep === 1 ? 'text-primary font-bold' : 'text-outline'}`}>Media</span>
        </div>

        <div className={`step-line ${wizardStep > 1 ? 'step-line-active' : ''}`}></div>

        {/* Step 2 */}
        <div className="flex items-center gap-sm">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
              wizardStep > 2
                ? 'bg-secondary text-white'
                : wizardStep === 2
                ? 'bg-primary text-white shadow-lg ring-4 ring-primary/20'
                : 'bg-surface-container-highest text-on-surface-variant border border-outline-variant/40'
            }`}
          >
            {wizardStep > 2 ? (
              <span className="material-symbols-outlined text-sm leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>
                check
              </span>
            ) : (
              '2'
            )}
          </div>
          <span className={`font-label-md text-label-md ${wizardStep === 2 ? 'text-primary font-bold' : 'text-outline'}`}>Details</span>
        </div>

        <div className={`step-line ${wizardStep > 2 ? 'step-line-active' : ''}`}></div>

        {/* Step 3 */}
        <div className="flex items-center gap-sm">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
              wizardStep === 3
                ? 'bg-secondary text-white shadow-lg ring-4 ring-secondary/20'
                : 'bg-surface-container-highest text-on-surface-variant border border-outline-variant/40'
            }`}
          >
            3
          </div>
          <span className={`font-label-md text-label-md ${wizardStep === 3 ? 'text-secondary font-bold' : 'text-outline'}`}>Review</span>
        </div>
      </nav>

      {/* Main Form Box */}
      <section className="bg-white rounded-xl shadow-lg border border-outline-variant/30 overflow-hidden p-lg sm:p-xl">
        {wizardStep === 1 && renderStep1()}
        {wizardStep === 2 && renderStep2()}
        {wizardStep === 3 && renderStep3()}
      </section>

      {/* Help Banner */}
      <p className="mt-lg text-center font-body-md text-on-surface-variant opacity-70 text-xs">
        Reporting a life-threatening emergency? Please call <strong className="text-on-surface">911</strong> immediately.
      </p>
    </main>
  );
};
export default ReportIssueWizard;
