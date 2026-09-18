import React, { useState, useRef, useEffect } from 'react';

export default function LiveCameraModal({ isOpen, onClose, onCapturePhoto }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) or 'user' (front)
  const [cameraError, setCameraError] = useState(null);
  const [loadingCamera, setLoadingCamera] = useState(false);

  // Start camera stream when modal opens
  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode, capturedImage]);

  const startCamera = async (mode) => {
    setLoadingCamera(true);
    setCameraError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported on this device/browser.');
      }

      const constraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.warn('Camera stream error:', err);
      setCameraError(err.message || 'Unable to access camera. Please allow camera permissions.');
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
    startCamera(facingMode);
  };

  const handleUsePhoto = () => {
    if (capturedImage && onCapturePhoto) {
      onCapturePhoto(capturedImage);
    }
    handleClose();
  };

  const handleFlipCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setCameraError(null);
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-3.5 bg-slate-800/90 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                <circle cx="12" cy="13" r="3"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Live Medical Camera</h3>
              <p className="text-[11px] text-slate-400">Snap doctor prescription, medicine strip, or injury</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!capturedImage && !cameraError && (
              <button
                type="button"
                onClick={handleFlipCamera}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-xl transition cursor-pointer"
                title="Flip Camera (Front/Back)"
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
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Viewfinder View */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[340px] max-h-[480px]">
          {loadingCamera && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-sky-400 z-10 bg-black/60">
              <svg className="animate-spin w-8 h-8 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="text-xs font-semibold text-slate-300">Initializing camera feed...</span>
            </div>
          )}

          {cameraError ? (
            <div className="p-6 text-center text-rose-400 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <p className="text-xs text-slate-300 font-medium">{cameraError}</p>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Retry Camera
              </button>
            </div>
          ) : capturedImage ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <img src={capturedImage} alt="Captured Prescription / Injury" className="max-h-[440px] w-auto object-contain rounded-lg" />
              <span className="absolute top-3 right-3 px-2 py-0.5 bg-emerald-500/90 text-white text-[10px] font-bold rounded-full">
                Photo Captured
              </span>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Target Aim Reticle */}
              <div className="pointer-events-none absolute inset-8 border border-white/25 rounded-2xl flex items-center justify-center">
                <div className="w-8 h-8 border-t-2 border-l-2 border-sky-400 absolute top-0 left-0 -mt-1 -ml-1 rounded-tl-md"></div>
                <div className="w-8 h-8 border-t-2 border-r-2 border-sky-400 absolute top-0 right-0 -mt-1 -mr-1 rounded-tr-md"></div>
                <div className="w-8 h-8 border-b-2 border-l-2 border-sky-400 absolute bottom-0 left-0 -mb-1 -ml-1 rounded-bl-md"></div>
                <div className="w-8 h-8 border-b-2 border-r-2 border-sky-400 absolute bottom-0 right-0 -mb-1 -mr-1 rounded-br-md"></div>
                <span className="text-[11px] text-white/75 bg-black/50 px-2.5 py-1 rounded-full backdrop-blur-xs font-medium">
                  Align prescription / medicine here
                </span>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-slate-800/95 border-t border-slate-700 flex items-center justify-between gap-3">
          {capturedImage ? (
            <>
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
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSnap}
                disabled={loadingCamera || !!cameraError}
                className="w-14 h-14 rounded-full bg-white border-4 border-[#1d68bd] hover:scale-105 active:scale-95 shadow-xl transition cursor-pointer flex items-center justify-center disabled:opacity-50"
                title="Snap Photo"
              >
                <div className="w-10 h-10 rounded-full bg-[#1d68bd]"></div>
              </button>

              <div className="w-16"></div> {/* spacer */}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
