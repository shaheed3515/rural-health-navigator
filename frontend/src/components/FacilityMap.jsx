import 'leaflet/dist/leaflet.css';
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

export default function FacilityMap({
  facilities = [],
  userLocation = null,
  onUserLocationChange = null,
  onSelectFacility = null,
  onBookToken = null,
  onAskAI = null,
  selectedClinicId = null,
  language = 'English'
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const userLayerRef = useRef(null);
  const markerMapRef = useRef(new Map());

  const [activeClinic, setActiveClinic] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);

  const REGION_PRESETS = [
    { label: 'Anantapur (AP)', lat: 14.6819, lng: 77.6007 },
    { label: 'Kurnool (AP)', lat: 15.7754, lng: 78.0566 },
    { label: 'Hyderabad (TS)', lat: 17.3850, lng: 78.4867 },
    { label: 'Baramati (MH)', lat: 18.5204, lng: 73.8567 },
    { label: 'Pune (MH)', lat: 18.5204, lng: 73.8567 }
  ];

  // 1. Initialize Leaflet Map with robust, high-performance CartoDB Voyager tiles
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = userLocation?.lat || 15.7754;
      const initialLng = userLocation?.lng || 78.0566;
      const initialZoom = userLocation ? 13 : 11;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: initialZoom,
        scrollWheelZoom: true,
        attributionControl: false
      });

      // High-performance Humanitarian OpenStreetMap (OSM HOT) tiles - 100% free, no API key, zero watermarks
      L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team',
        maxZoom: 19,
        subdomains: 'abc'
      }).addTo(map);

      L.control.attribution({ position: 'bottomright', prefix: 'Swasthya Sangam GIS' }).addTo(map);

      const markersLayer = L.layerGroup().addTo(map);
      const userLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      userLayerRef.current = userLayer;
      mapInstanceRef.current = map;

      // Enable Click-To-Locate: clicking anywhere on the map updates user coordinates
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        if (onUserLocationChange) {
          onUserLocationChange({
            lat: Number(lat.toFixed(4)),
            lng: Number(lng.toFixed(4)),
            accuracy: 50
          });
        }
      });

      // Force size invalidation after initialization
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
      setTimeout(() => {
        map.invalidateSize();
      }, 400);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Invalidate map size on view transitions, tab switches, and window resize
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let ro = null;
    try {
      ro = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      ro.observe(mapContainerRef.current);
    } catch (e) {
      // Fallback timer if ResizeObserver is not supported
    }

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);

    return () => {
      if (ro) ro.disconnect();
      clearTimeout(timer);
    };
  }, []);

  // Request browser geolocation with low-accuracy fast WiFi/IP fallback
  const handleGetLocation = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    const safetyTimer = setTimeout(() => {
      setLocating(false);
    }, 5000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(safetyTimer);
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy || 100;
        const loc = { lat: uLat, lng: uLng, accuracy };
        setLocating(false);
        setLocationError(null);
        if (onUserLocationChange) {
          onUserLocationChange(loc);
        }
      },
      (err) => {
        clearTimeout(safetyTimer);
        setLocating(false);
        console.info('GPS Notice:', err.message);
        setLocationError('GPS permission delayed or unavailable. Use the quick presets below or click directly on the map to set location!');
      },
      { timeout: 5000, enableHighAccuracy: true, maximumAge: 60000 }
    );
  };

  // 2. Render pulsing soft blue circle for user's GPS location
  useEffect(() => {
    if (!mapInstanceRef.current || !userLayerRef.current) return;
    const map = mapInstanceRef.current;
    const userLayer = userLayerRef.current;
    userLayer.clearLayers();

    if (userLocation && userLocation.lat && userLocation.lng) {
      const uLat = userLocation.lat;
      const uLng = userLocation.lng;

      // Outer accuracy halo
      const accuracyCircle = L.circle([uLat, uLng], {
        radius: Math.min(userLocation.accuracy || 400, 2000),
        color: '#0284c7',
        fillColor: '#38bdf8',
        fillOpacity: 0.12,
        weight: 1.5
      });
      userLayer.addLayer(accuracyCircle);

      // Pulsing animated halo icon
      const pulseDivIcon = L.divIcon({
        className: 'gps-pulse-wrapper',
        html: `
          <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
            <span style="position: absolute; width: 36px; height: 36px; border-radius: 9999px; background-color: #38bdf8; opacity: 0.6; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });
      userLayer.addLayer(L.marker([uLat, uLng], { icon: pulseDivIcon, interactive: false }));

      // Soft blue circle marker for exact location
      const userMarker = L.circleMarker([uLat, uLng], {
        radius: 9,
        fillColor: '#0284c7',
        color: '#ffffff',
        weight: 3,
        fillOpacity: 0.9
      });
      userMarker.bindPopup(
        `<div style="font-family: system-ui, sans-serif; font-size: 12px; font-weight: 800; color: #1d68bd; padding: 2px;">
          Your Real-Time Location
        </div>`
      );
      userLayer.addLayer(userMarker);

      // Automatically call map.setView([userLocation.lat, userLocation.lng], 13) and invalidateSize
      map.setView([uLat, uLng], 13);
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }
  }, [userLocation]);

  // 3. Render Discovered Facility Markers (Hospital #0284c7 vs Clinic #38bdf8)
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    layer.clearLayers();
    markerMapRef.current.clear();

    const bounds = [];
    if (userLocation && userLocation.lat && userLocation.lng) {
      bounds.push([userLocation.lat, userLocation.lng]);
    }

    facilities.forEach((clinic) => {
      const lat = clinic.coordinates ? Number(clinic.coordinates.lat) : clinic.lat;
      const lng = clinic.coordinates ? Number(clinic.coordinates.lng) : clinic.lng;

      if (!isNaN(lat) && !isNaN(lng)) {
        bounds.push([lat, lng]);

        // Dynamic categorization by tags:
        // Hospital: "General Hospital" (Blue pin #0284c7)
        // Clinic/Doctors: "Primary Health Clinic" (Sky blue pin #38bdf8)
        const nameLower = (clinic.name || '').toLowerCase();
        const typeLower = (clinic.type || '').toLowerCase();
        const isHospital =
          typeLower.includes('hospital') ||
          typeLower === 'chc' ||
          nameLower.includes('hospital') ||
          nameLower.includes('chc') ||
          nameLower.includes('medical') ||
          nameLower.includes('trauma');

        const categoryLabel = isHospital ? 'General Hospital' : 'Primary Health Clinic';
        const pinColor = isHospital ? '#1d68bd' : '#38bdf8';
        const pinSvg = isHospital
          ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`
          : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/></svg>`;

        const customIcon = L.divIcon({
          className: 'custom-facility-pin',
          html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.15s ease;">
              <div style="width: 34px; height: 34px; border-radius: 10px; background-color: ${pinColor}; color: white; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 4px 10px rgba(29, 104, 189, 0.28);">
                ${pinSvg}
              </div>
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
          popupAnchor: [0, -18]
        });

        const marker = L.marker([lat, lng], { icon: customIcon });

        const distText =
          clinic.distanceKm !== null && clinic.distanceKm !== undefined
            ? `<span style="background-color: #e0edfd; color: #1d68bd; font-weight: 700; padding: 2px 7px; border-radius: 6px; font-size: 11px; border: 1px solid #bfdbfe;">${clinic.distanceKm} km away</span>`
            : '';

        const directionsUrl =
          clinic.directionsUrl ||
          `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

        const popupHtml = `
          <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 250px; padding: 4px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; gap: 4px;">
              <span style="font-size: 10px; font-weight: 800; color: ${pinColor}; text-transform: uppercase; letter-spacing: 0.5px;">
                ${categoryLabel}
              </span>
              ${distText}
            </div>
            <div style="font-size: 13px; font-weight: 800; color: #0f172a; line-height: 1.35;">
              ${clinic.name}
            </div>
            <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
              ${clinic.address || clinic.district || 'Local Health Sector'}
            </div>
            <div style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between; font-size: 11px;">
              <span style="color: #1d68bd; font-weight: 700;">
                ${clinic.emergencyBeds !== undefined ? `${clinic.emergencyBeds} Beds` : 'Verified Centre'}
              </span>
              <span style="color: #64748b; font-weight: 600;">
                ${clinic.contact?.phone || 'Emergency: 108'}
              </span>
            </div>
            <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #e0edfd; display: flex; gap: 6px;">
              <a
                href="${directionsUrl}"
                target="_blank"
                rel="noopener noreferrer"
                style="flex: 1; text-align: center; text-decoration: none; padding: 6px 8px; background-color: #f0f7ff; color: #1d68bd; border: 1px solid #bfdbfe; border-radius: 8px; font-size: 11px; font-weight: 700;"
              >
                Directions
              </a>
              <button
                id="popup-book-btn-${clinic.id || clinic._id}"
                style="flex: 1.2; padding: 6px 8px; background-color: #1d68bd; color: white; border: none; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer;"
              >
                Book Token
              </button>
            </div>
          </div>
        `;

        marker.bindPopup(popupHtml);

        marker.on('popupopen', () => {
          setActiveClinic(clinic);
          if (onSelectFacility) onSelectFacility(clinic);
          const btn = document.getElementById(`popup-book-btn-${clinic.id || clinic._id}`);
          if (btn) {
            btn.onclick = () => {
              if (onBookToken) onBookToken(clinic);
            };
          }
        });

        marker.on('click', () => {
          setActiveClinic(clinic);
          if (onSelectFacility) onSelectFacility(clinic);
        });

        layer.addLayer(marker);
        markerMapRef.current.set(clinic.id, marker);
      }
    });

    if (userLocation && userLocation.lat && map) {
      map.setView([userLocation.lat, userLocation.lng], 13);
    } else if (bounds.length > 0 && map) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }

    setTimeout(() => {
      if (map) map.invalidateSize();
    }, 200);
  }, [facilities, userLocation]);

  // Center on selected clinic from card click
  useEffect(() => {
    if (!selectedClinicId || !mapInstanceRef.current) return;
    const marker = markerMapRef.current.get(selectedClinicId);
    if (marker) {
      const latLng = marker.getLatLng();
      mapInstanceRef.current.flyTo(latLng, 14, { duration: 1.2 });
      marker.openPopup();
    }
  }, [selectedClinicId]);

  return (
    <div className="bg-white rounded-2xl border border-[#e0f2fe] overflow-hidden shadow-sm flex flex-col relative w-full">
      {/* Top Floating Controls Bar */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 max-w-[calc(100%-24px)] flex-wrap">
        <button
          type="button"
          onClick={handleGetLocation}
          disabled={locating}
          className="px-3 py-1.5 bg-white/95 hover:bg-white text-slate-800 text-xs font-bold rounded-xl shadow-sm border border-[#bfdbfe] backdrop-blur-md flex items-center gap-1.5 transition cursor-pointer disabled:opacity-60"
        >
          {locating ? (
            <svg className="animate-spin w-3.5 h-3.5 text-[#1d68bd]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1d68bd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          )}
          <span>{locating ? 'Detecting GPS...' : 'Locate Me'}</span>
        </button>

        {/* Quick Regional Presets for instant navigation without GPS delay */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {REGION_PRESETS.map((preset) => {
            const isSelected = userLocation && Math.abs(userLocation.lat - preset.lat) < 0.15 && Math.abs(userLocation.lng - preset.lng) < 0.15;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setLocationError(null);
                  if (onUserLocationChange) {
                    onUserLocationChange({ lat: preset.lat, lng: preset.lng, accuracy: 100 });
                  }
                }}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-xl transition cursor-pointer border shadow-2xs backdrop-blur-md ${
                  isSelected
                    ? 'bg-[#1d68bd] text-white border-[#1d68bd] shadow-xs'
                    : 'bg-white/95 hover:bg-white text-slate-700 border-[#bfdbfe] hover:border-[#1d68bd]'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {userLocation && (
          <span className="px-2.5 py-1 bg-[#1d68bd] text-white font-bold text-[10px] rounded-xl shadow-xs backdrop-blur-md flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-300 animate-pulse"></span> {userLocation.lat.toFixed(2)}°, {userLocation.lng.toFixed(2)}°
          </span>
        )}
      </div>

      {/* Desktop Floating 3-Item Light-Blue Legend (hidden on mobile to prevent control collision) */}
      <div className="hidden sm:block absolute top-3 right-3 z-20 bg-white/95 backdrop-blur-sm p-3 rounded-2xl border border-[#e0edfd] text-[11px] shadow-sm space-y-1.5 font-semibold text-slate-700">
        <div className="font-extrabold text-[#1d68bd] text-[10px] uppercase tracking-wider mb-1">
          Healthcare Network GIS
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-md bg-[#1d68bd] inline-block shadow-2xs"></span>
          <span>Discovered Hospital / Health Centre</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-md bg-[#38bdf8] inline-block shadow-2xs"></span>
          <span>Local Clinic / Dispensary</span>
        </div>
        <div className="flex items-center gap-2 pt-1 border-t border-[#e0edfd]">
          <span className="w-3 h-3 rounded-full bg-[#1d68bd] border-2 border-white ring-2 ring-[#38bdf8] inline-block animate-pulse"></span>
          <span className="text-[#1d68bd] font-bold">Your Real-Time Location</span>
        </div>
      </div>

      {locationError && (
        <div className="absolute top-14 left-3 z-20 bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 max-w-[90%]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 shrink-0">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{locationError}</span>
        </div>
      )}

      {/* Interactive Helper Badge */}
      <div className="hidden md:flex absolute bottom-3 left-3 z-20 bg-slate-900/80 text-white backdrop-blur-sm px-3 py-1 rounded-lg text-[10px] font-medium items-center gap-1.5 pointer-events-none shadow-sm">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v8M8 12h8" />
        </svg>
        <span>Click anywhere on the map to set your location & search nearby healthcare</span>
      </div>

      {/* Leaflet Map Canvas with Responsive Height */}
      <div
        ref={mapContainerRef}
        className="h-[340px] sm:h-[440px] lg:h-[520px] w-full"
        style={{ width: '100%', borderRadius: '12px', zIndex: 1 }}
      />

      {/* Mobile Legend Bar (docked below the map on mobile <sm) */}
      <div className="sm:hidden p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] font-semibold text-slate-600 flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-[#1d68bd]"></span>
          <span>Hospital</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-[#38bdf8]"></span>
          <span>Clinic</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1d68bd] ring-1 ring-[#38bdf8]"></span>
          <span>Your GPS</span>
        </div>
      </div>

      {/* Bottom Floating Active Selection Card */}
      {activeClinic && (
        <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between gap-4 flex-wrap z-10">
          <div className="min-w-[200px]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">{activeClinic.name}</span>
              <span className="text-[10px] uppercase font-bold text-[#1d68bd] bg-[#e0edfd] px-2 py-0.5 rounded border border-[#bfdbfe]">
                {((activeClinic.name || '').toLowerCase().includes('hospital') ||
                activeClinic.type === 'GENERAL HOSPITAL' ||
                activeClinic.type === 'chc')
                  ? 'General Hospital'
                  : 'Primary Health Clinic'}
              </span>
              {activeClinic.distanceKm !== null && activeClinic.distanceKm !== undefined && (
                <span className="bg-[#e0edfd] text-[#1d68bd] font-extrabold px-2 py-0.5 rounded text-[10px] border border-[#bfdbfe]">
                  {activeClinic.distanceKm} km away
                </span>
              )}
            </div>
            <div className="text-slate-500 text-[11px] mt-0.5">
              {activeClinic.address || activeClinic.district} • Contact: {activeClinic.contact?.phone || '108'}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${
                activeClinic.coordinates?.lat || activeClinic.lat
              },${activeClinic.coordinates?.lng || activeClinic.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-[#f0f7ff] text-[#1d68bd] hover:bg-[#e0edfd] border border-[#bfdbfe] font-bold rounded-xl shadow-2xs transition text-xs flex items-center gap-1.5"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
              Directions
            </a>

            <button
              type="button"
              onClick={() => onBookToken && onBookToken(activeClinic)}
              className="px-4 py-1.5 bg-[#1d68bd] hover:bg-[#15529a] text-white font-bold rounded-xl shadow-2xs transition text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Book OPD Token
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
