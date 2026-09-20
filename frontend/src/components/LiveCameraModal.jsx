import React, { useState, useRef, useEffect } from 'react';

export default function LiveCameraModal({ isOpen, onClose, onCapturePhoto }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const nativeFileRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);

  // Check if device is mobile vs laptop/desktop
  const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');

  // Laptops default to 'user' (front integrated webcam); Mobile defaults to 'environment' (rear camera)
  const [facingMode, setFacingMode] = useState(isMobile ? 'environment' : 'user');
  const [cameraError, setCameraError] = useState(null);
  const [loadingCamera, setLoadingCamera] = useState(false);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  // Enumerate video devices when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const enumerateCameras = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter((d) => d.kind === 'videoinput');
          setAvailableDevices(videoInputs);

          // On laptops/desktops, auto-select integrated/internal webcam to avoid external phone link
          if (!isMobile && videoInputs.length > 0 && !selectedDeviceId) {
            const integrated = videoInputs.find((d) =>
              /integrated|internal|front|webcam|facetime|built-in/i.test(d.label)
            );
            if (integrated) {
              setSelectedDeviceId(integrated.deviceId);
            } else {
              setSelectedDeviceId(videoInputs[0].deviceId);
            }
          }
        }
      } catch (e) {
        console.warn('Device enumeration warning:', e);
      }
    };

    enumerateCameras();
  }, [isOpen, isMobile]);

  // Start camera stream when modal opens or settings change
  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera(facingMode, selectedDeviceId);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode, selectedDeviceId, capturedImage]);

  // Robust Camera Starter (Works in both vertical portrait & horizontal landscape)
  const startCamera = async (mode, deviceId) => {
    setLoadingCamera(true);
    setCameraError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported on this device/browser.');
      }

      // NO hardcoded width/height constraints on mobile!
      // This allows the mobile browser to natively adapt to vertical portrait orientation without HAL driver conflicts.
      let mediaStream = null;

      try {
        // Attempt 1: Targeted device or facingMode without restrictive dimensions
        const primaryConstraints = {
          video: deviceId
            ? { deviceId: { exact: deviceId } }
            : { facingMode: { ideal: mode } },
          audio: false
        };
        mediaStream = await navigator.mediaDevices.getUserMedia(primaryConstraints);
      } catch (err1) {
        console.warn('Primary camera stream attempt failed, trying basic video:', err1);

        // Attempt 2: Minimal generic stream fallback
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        } catch (err2) {
          throw err2;
        }
      }

      setStream(mediaStream);

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = mediaStream;
        video.muted = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');

        // Play as soon as metadata arrives or immediately
        video.onloadedmetadata = () => {
          video.play().catch((e) => console.warn('Video play after metadata error:', e));
        };
        video.play().catch((e) => console.warn('Direct video play error:', e));
      }

      // Re-query device labels once permissions are granted
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setAvailableDevices(videoInputs);
      }
    } catch (err) {
      console.warn('Camera stream fatal error:', err);
      setCameraError(err.message || 'Unable to access camera in vertical mode. Please check camera permissions or use the Native Camera button below.');
    } finally {
      setLoadingCamera(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleSnap = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera(facingMode, selectedDeviceId);
  };

  const handleUsePhoto = () => {
    if (capturedImage && onCapturePhoto) {
      onCapturePhoto(capturedImage);
    }
    handleClose();
  };

  const handleFlipCamera = () => {
    setSelectedDeviceId(''); // Clear explicit device so facingMode toggles cleanly
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  const handleDeviceChange = (e) => {
    const newDeviceId = e.target.value;
    setSelectedDeviceId(newDeviceId);
  };

  // Handle Native Phone Camera Capture (Guaranteed 100% reliable on all smartphones in vertical mode)
  const handleNativeCapture = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setCapturedImage(dataUrl);
      stopCamera();
    };
    reader.readAsDataURL(file);
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setCameraError(null);
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] live-camera-modal-overlay flex items-center justify-center p-2 sm:p-3 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
      style={{ zIndex: 9999 }}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl sm:rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl flex flex-col max-h-[95dvh] max-h-[95vh]">
        {/* Header */}
        <div className="p-3 sm:p-3.5 bg-slate-800/95 text-white flex items-center justify-between border-b border-slate-700 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                <circle cx="12" cy="13" r="3"/>
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold tracking-tight truncate">Live Medical Camera</h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                {isMobile ? 'Vertical portrait & horizontal enabled' : 'Laptop webcam active'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Camera Device Switcher (Shown when multiple cameras exist) */}
            {!capturedImage && !cameraError && availableDevices.length > 1 && (
              <select
                value={selectedDeviceId}
                onChange={handleDeviceChange}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] sm:text-[11px] font-semibold rounded-xl px-2 py-1.5 border border-slate-600 focus:outline-none focus:border-sky-400 max-w-[120px] sm:max-w-[170px] truncate cursor-pointer"
                title="Select Camera Input"
              >
                {availableDevices.map((dev, idx) => (
                  <option key={dev.deviceId || idx} value={dev.deviceId}>
                    {dev.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            )}

            {/* Quick Flip Button (Front/Back) */}
            {!capturedImage && !cameraError && (
              <button
                type="button"
                onClick={handleFlipCamera}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-xl transition cursor-pointer shrink-0"
                title={`Switch to ${facingMode === 'environment' ? 'Front (User)' : 'Back (Environment)'} Camera`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 4v6h6M23 20v-6h-6"/>
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                </svg>
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition cursor-pointer shrink-0"
              title="Close Camera"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Viewfinder View */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[320px] sm:min-h-[380px] max-h-[500px]">
          {loadingCamera && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-sky-400 z-10 bg-black/75">
              <svg className="animate-spin w-8 h-8 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="text-xs font-semibold text-slate-300">Initializing vertical camera...</span>
            </div>
          )}

          {cameraError ? (
            <div className="p-5 text-center text-rose-400 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <p className="text-xs text-slate-300 font-medium max-w-sm mx-auto">{cameraError}</p>
              
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => startCamera(facingMode, selectedDeviceId)}
                  className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-md"
                >
                  Retry Camera
                </button>
                <button
                  type="button"
                  onClick={() => nativeFileRef.current?.click()}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span>Use Phone Camera App</span>
                </button>
              </div>
            </div>
          ) : capturedImage ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img src={capturedImage} alt="Captured Prescription / Injury" className="max-h-[460px] w-auto object-contain rounded-lg" />
              <span className="absolute top-3 right-3 px-2 py-0.5 bg-emerald-500/90 text-white text-[10px] font-bold rounded-full shadow-xs">
                Photo Captured
              </span>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Target Aim Reticle */}
              <div className="pointer-events-none absolute inset-6 sm:inset-8 border border-white/30 rounded-2xl flex items-center justify-center">
                <div className="w-7 h-7 border-t-2 border-l-2 border-sky-400 absolute top-0 left-0 -mt-1 -ml-1 rounded-tl-md"></div>
                <div className="w-7 h-7 border-t-2 border-r-2 border-sky-400 absolute top-0 right-0 -mt-1 -mr-1 rounded-tr-md"></div>
                <div className="w-7 h-7 border-b-2 border-l-2 border-sky-400 absolute bottom-0 left-0 -mb-1 -ml-1 rounded-bl-md"></div>
                <div className="w-7 h-7 border-b-2 border-r-2 border-sky-400 absolute bottom-0 right-0 -mb-1 -mr-1 rounded-br-md"></div>
                <span className="text-[10px] sm:text-[11px] text-white/90 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs font-medium text-center">
                  Align prescription / medicine here
                </span>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
          {/* Hidden input to trigger native phone camera directly */}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={nativeFileRef}
            onChange={handleNativeCapture}
            className="hidden"
          />
        </div>

        {/* Action Controls */}
        <div className="p-3 sm:p-4 bg-slate-800/95 border-t border-slate-700 flex flex-col gap-2">
          {capturedImage ? (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                  <path d="M21 3v5h-5"/>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                  <path d="M8 16H3v5"/>
                </svg>
                <span>Retake</span>
              </button>

              <button
                type="button"
                onClick={handleUsePhoto}
                className="flex-1 py-2.5 px-4 bg-[#1d68bd] hover:bg-[#15529a] text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Attach to AI Triage</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-3 sm:px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSnap}
                disabled={loadingCamera || !!cameraError}
                className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-white border-4 border-[#1d68bd] hover:scale-105 active:scale-95 shadow-xl transition cursor-pointer flex items-center justify-center disabled:opacity-50"
                title="Snap Photo"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#1d68bd]"></div>
              </button>

              {/* Instant Native Phone Camera Option */}
              <button
                type="button"
                onClick={() => nativeFileRef.current?.click()}
                className="px-2.5 py-1.5 bg-slate-700/80 hover:bg-slate-600 text-sky-400 text-[11px] font-semibold rounded-xl border border-slate-600 transition cursor-pointer flex items-center gap-1"
                title="Open your phone's native camera app directly"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span className="hidden xs:inline sm:inline">Phone Camera</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
