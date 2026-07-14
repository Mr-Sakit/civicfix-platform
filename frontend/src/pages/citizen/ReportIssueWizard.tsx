import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MapContainer } from '../../components/MapContainer';

export const ReportIssueWizard: React.FC = () => {
  const {
    addReport,
    setActiveTab,
    wizardStep,
    setWizardStep,
    wizardPhotos,
    addWizardPhoto,
    removeWizardPhoto,
    clearWizard
  } = useApp();

  // Step 2 Form States
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [category, setCategory] = useState<'ROADS' | 'UTILITIES' | 'SANITATION' | 'GRAFFITI'>('ROADS');
  const [coordinates, setCoordinates] = useState({ lat: 40.4093, lng: 49.8671 });
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [selectedImageName, setSelectedImageName] = useState('');
  const [submitState, setSubmitState] = useState<{
    status: 'idle' | 'submitting' | 'created' | 'duplicate' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [localProgress, setLocalProgress] = useState(0);

  const handleGPSClick = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      return;
    }

    setGpsStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCoordinates = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        };
        setCoordinates(nextCoordinates);
        setAddress(`GPS location: ${nextCoordinates.lat}, ${nextCoordinates.lng}`);
        setGpsStatus('ready');
      },
      () => setGpsStatus('error'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
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
    if (wizardStep < 3) {
      setWizardStep(wizardStep + 1);
    }
  };

  const handleBackStep = () => {
    if (wizardStep > 1) {
      setWizardStep(wizardStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (submitState.status === 'submitting') return;
    setSubmitState({ status: 'submitting', message: 'Submitting report and checking for nearby duplicates...' });

    // Generate a nice title based on category & details
    const categoryTitle = category === 'ROADS' ? 'Road Issue' : category === 'UTILITIES' ? 'Utility Defect' : 'Sanitation issue';
    const finalTitle = description ? (description.length > 30 ? description.substring(0, 30) + '...' : description) : `New ${categoryTitle}`;
    
    const result = await addReport({
      title: finalTitle,
      description: description || 'No additional description provided.',
      location: address || '1200 N Lake Shore Dr, Chicago IL',
      category: category,
      priority: isUrgent ? 'High' : 'Medium',
      status: 'Reported',
      image: wizardPhotos[0] || '',
      imageName: selectedImageName,
      assignedTo: 'Unassigned',
      reporter: 'Sarah J.',
      lat: coordinates.lat,
      lng: coordinates.lng,
      isUrgent: isUrgent
    });

    if (result.status === 'duplicate') {
      setSubmitState({
        status: 'duplicate',
        message: `A similar report already exists about ${result.distanceMeters}m away. You were added as watcher #${result.watcherCount}.`
      });
    } else if (result.status === 'created') {
      setSubmitState({
        status: 'created',
        message: 'Your report was submitted and queued for OpenAI image review.'
      });
    } else {
      setSubmitState({
        status: 'error',
        message: result.message
      });
      return;
    }

    setWizardStep(3);
  };

  const handleFinish = () => {
    clearWizard();
    setSubmitState({ status: 'idle', message: '' });
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
            AI will automatically categorize your photo and extract location data to save you time.
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
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full h-[56px] pl-12 pr-md rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-body-md text-body-md"
              placeholder="Enter street address or intersection"
              type="text"
            />
          </div>
          <button
            onClick={handleGPSClick}
            className="h-[56px] px-md rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-primary font-label-md text-label-md flex items-center justify-center gap-sm transition-all border border-outline-variant/20 shadow-sm active:scale-95"
          >
            <span className="material-symbols-outlined leading-none">my_location</span>
            {gpsStatus === 'loading' ? 'Locating...' : 'Use Current GPS'}
          </button>
        </div>
        {gpsStatus === 'ready' && (
          <p className="text-xs text-secondary font-semibold">
            GPS locked: {coordinates.lat}, {coordinates.lng}
          </p>
        )}
        {gpsStatus === 'error' && (
          <p className="text-xs text-error font-semibold">
            GPS permission was denied or unavailable. You can still type the location manually.
          </p>
        )}

        {/* Mini Map Preview */}
        <div className="relative h-64 w-full rounded-xl overflow-hidden shadow-inner border border-outline-variant/30">
          <MapContainer interactive={false} />
          {address && (
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-on-surface-variant">Issue Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full h-[48px] px-md rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-body-md text-body-md"
            >
              <option value="ROADS">Roads & Streets</option>
              <option value="UTILITIES">Utilities & Streetlights</option>
              <option value="SANITATION">Sanitation & Trash</option>
              <option value="GRAFFITI">Graffiti & Vandalism</option>
            </select>
          </div>
          
          <div className="flex flex-col justify-end pb-2">
            {/* Urgent Switcher */}
            <label
              className={`flex items-center gap-sm px-lg py-3 rounded-xl border-2 cursor-pointer transition-all active:scale-98 w-fit ${
                isUrgent
                  ? 'bg-error-container border-error text-on-error-container font-bold shadow-sm shadow-error/10'
                  : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <input
                className="hidden"
                type="checkbox"
                checked={isUrgent}
                onChange={() => setIsUrgent(!isUrgent)}
              />
              <span className="material-symbols-outlined" style={{ fontVariationSettings: isUrgent ? "'FILL' 1" : "'FILL' 0" }}>
                priority_high
              </span>
              <span>Mark as Urgent</span>
            </label>
          </div>
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
          disabled={!address || !description || submitState.status === 'submitting'}
          className="px-xl py-2.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md flex items-center gap-sm hover:opacity-90 shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
        >
          {submitState.status === 'submitting' ? 'Submitting...' : 'Submit Report'}
          <span className="material-symbols-outlined text-sm leading-none">send</span>
        </button>
      </div>
      {submitState.status === 'error' && (
        <p className="text-xs text-error font-semibold">{submitState.message}</p>
      )}
    </div>
  );

  // Step 3: Success View
  const renderStep3 = () => (
    <div className="text-center py-xl space-y-lg animate-fade-in">
      <div className="w-20 h-20 bg-secondary text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-secondary/20">
        <span className="material-symbols-outlined text-5xl leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>
          check
        </span>
      </div>
      
      <div className="space-y-xs">
        <h1 className="text-headline-lg font-headline-lg text-on-surface">
          {submitState.status === 'duplicate' ? 'Duplicate Report Found' : 'Report Submitted Successfully!'}
        </h1>
        <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
          {submitState.message || 'Thank you for helping us improve our city. Your report has been saved and dispatched to our review queues.'}
        </p>
      </div>

      {submitState.status !== 'duplicate' && (
        <div className="bg-surface-container-low py-sm px-lg rounded-xl border border-outline-variant/30 w-fit mx-auto font-mono text-sm text-primary font-bold">
          AI STATUS: QUEUED
        </div>
      )}

      <div className="pt-lg flex justify-center gap-md border-t border-outline-variant/30 max-w-md mx-auto">
        <button
          onClick={() => {
            clearWizard();
            setSubmitState({ status: 'idle', message: '' });
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
