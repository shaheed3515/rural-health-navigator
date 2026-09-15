import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Haversine distance in kilometers
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

export default function FacilityMap({
  facilities = [],
  onSelectFacility,
  onBookToken,
  onAskAI,
  language = 'English'
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const userMarkerRef = useRef(null);

  const [selectedClinic, setSelectedClinic] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [25.15, 82.85],
        zoom: 9,
        scrollWheelZoom: true,
        attributionControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      L.control.attribution({ position: 'bottomright', prefix: 'Rural Health GIS' }).addTo(map);

      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;

      // Force size invalidation so tiles never render gray
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Resize invalidation on mount / view switch
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  // Request user geolocation
  const handleGetLocation = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        setUserLocation({ lat: uLat, lng: uLng });
        setLocating(false);

        if (mapInstanceRef.current) {
          // Remove previous user marker if any
          if (userMarkerRef.current) {
            mapInstanceRef.current.removeLayer(userMarkerRef.current);
          }

          // Blue user pulse pin
          const userIcon = L.divIcon({
            className: 'user-location-pin',
            html: `
              <div style="position: relative; display: flex; items-center; justify-content: center;">
                <span style="position: absolute; width: 28px; height: 28px; border-radius: 9999px; background-color: #38bdf8; opacity: 0.75; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
                <div style="width: 20px; height: 20px; border-radius: 9999px; background-color: #0284c7; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3);"></div>
              </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          });

          const uMarker = L.marker([uLat, uLng], { icon: userIcon }).addTo(mapInstanceRef.current);
          uMarker.bindPopup('<b>📍 Your Current Location</b>').openPopup();
          userMarkerRef.current = uMarker;

          mapInstanceRef.current.flyTo([uLat, uLng], 11, { duration: 1.2 });
        }
      },
      (err) => {
        setLocating(false);
        // Fallback default coordinates (e.g. Varanasi City center: 25.3176, 82.9739)
        const fallbackLat = 25.3176;
        const fallbackLng = 82.9739;
        setUserLocation({ lat: fallbackLat, lng: fallbackLng });
        setLocationError('Permission denied or timeout. Defaulted to Varanasi district center (25.31° N, 82.97° E).');
      },
      { timeout: 8000 }
    );
  };

  // Sort facilities by distance if userLocation is active
  const facilitiesWithDistance = facilities.map((clinic) => {
    let dist = null;
    if (userLocation && clinic.coordinates) {
      dist = getDistanceKm(
        userLocation.lat,
        userLocation.lng,
        Number(clinic.coordinates.lat),
        Number(clinic.coordinates.lng)
      );
    }
    return { ...clinic, distanceKm: dist };
  });

  const sortedFacilities = [...facilitiesWithDistance].sort((a, b) => {
    if (a.distanceKm !== null && b.distanceKm !== null) {
      return a.distanceKm - b.distanceKm;
    }
    return 0;
  });

  // Render facility markers on map
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    const layer = markersLayerRef.current;
    layer.clearLayers();

    const bounds = [];

    sortedFacilities.forEach((clinic) => {
      const lat = clinic.coordinates ? Number(clinic.coordinates.lat) : 25.3176;
      const lng = clinic.coordinates ? Number(clinic.coordinates.lng) : 82.9739;

      if (!isNaN(lat) && !isNaN(lng)) {
        bounds.push([lat, lng]);

        const isHighBeds = clinic.emergencyBeds > 5;
        const isZeroBeds = clinic.emergencyBeds === 0;
        const colorClass = isZeroBeds ? '#e11d48' : isHighBeds ? '#059669' : '#d97706';

        const customIcon = L.divIcon({
          className: 'custom-facility-pin',
          html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <div style="width: 38px; height: 38px; border-radius: 14px; background-color: ${colorClass}; color: white; font-weight: 800; font-size: 11px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                ${clinic.type}
              </div>
              <div style="position: absolute; top: -6px; right: -8px; background-color: #0f172a; color: white; font-size: 10px; font-weight: 800; border-radius: 9999px; padding: 2px 6px; border: 1.5px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                ${clinic.emergencyBeds}🛏️
              </div>
            </div>
          `,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
          popupAnchor: [0, -20]
        });

        const marker = L.marker([lat, lng], { icon: customIcon });

        const distBadge = clinic.distanceKm !== null
          ? `<span style="background-color: #ecfdf5; color: #047857; font-weight: 800; padding: 2px 6px; border-radius: 6px; font-size: 10px; border: 1px solid #a7f3d0;">📍 ${clinic.distanceKm} km</span>`
          : '';

        const popupHtml = `
          <div style="font-family: system-ui, sans-serif; min-width: 230px; padding: 4px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
              <span style="font-size: 10px; font-weight: 800; color: #059669; text-transform: uppercase;">
                ${clinic.type} • ${clinic.district}
              </span>
              ${distBadge}
            </div>
            <div style="font-size: 13px; font-weight: bold; color: #0f172a; margin-top: 2px;">
              ${clinic.name}
            </div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
              ${clinic.address || clinic.block}
            </div>
            <div style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between; font-size: 11px; font-weight: bold;">
              <span style="color: ${clinic.emergencyBeds > 0 ? '#059669' : '#e11d48'};">
                🛏️ ${clinic.emergencyBeds} Emergency Beds
              </span>
              <span style="color: #475569;">
                📞 ${clinic.contact ? clinic.contact.phone : '108'}
              </span>
            </div>
            <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #e2e8f0; display: flex; gap: 6px;">
              <button
                id="popup-book-btn-${clinic.id}"
                style="flex: 1; padding: 6px 8px; background-color: #059669; color: white; border: none; border-radius: 8px; font-size: 11px; font-weight: bold; cursor: pointer;"
              >
                🎫 Book OPD Token
              </button>
            </div>
          </div>
        `;

        marker.bindPopup(popupHtml);

        marker.on('popupopen', () => {
          setSelectedClinic(clinic);
          // Attach click event to the popup button
          const btn = document.getElementById(`popup-book-btn-${clinic.id}`);
          if (btn) {
            btn.onclick = () => {
              if (onBookToken) onBookToken(clinic);
            };
          }
        });

        marker.on('click', () => {
          setSelectedClinic(clinic);
          if (onSelectFacility) onSelectFacility(clinic);
        });

        layer.addLayer(marker);
      }
    });

    if (bounds.length > 0 && mapInstanceRef.current && !userLocation) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }, [sortedFacilities, userLocation]);

  const panToFacility = (clinic) => {
    setSelectedClinic(clinic);
    if (!mapInstanceRef.current || !clinic.coordinates) return;
    const lat = Number(clinic.coordinates.lat);
    const lng = Number(clinic.coordinates.lng);
    if (!isNaN(lat) && !isNaN(lng)) {
      mapInstanceRef.current.flyTo([lat, lng], 13, { duration: 1.2 });
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs flex flex-col lg:flex-row h-[640px]">
      {/* Sidebar List of Facilities with Geolocation */}
      <div className="w-full lg:w-84 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col h-64 lg:h-full bg-slate-50/50">
        {/* Geolocation Toolbar */}
        <div className="p-3.5 bg-white border-b border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>📍 Health Facility Map</span>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {facilities.length} Centres
            </span>
          </div>

          <button
            type="button"
            onClick={handleGetLocation}
            disabled={locating}
            className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <span>{locating ? '🔄' : '📍'}</span>
            <span>{locating ? 'Detecting Location...' : 'Use My Current Location'}</span>
          </button>

          {locationError && (
            <div className="text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
              {locationError}
            </div>
          )}
          {userLocation && !locationError && (
            <div className="text-[10px] text-emerald-800 bg-emerald-50 p-1.5 rounded-lg border border-emerald-200 font-semibold flex items-center justify-between">
              <span>GPS Active ({userLocation.lat.toFixed(2)}°, {userLocation.lng.toFixed(2)}°)</span>
              <span>Sorted by distance</span>
            </div>
          )}
        </div>

        {/* Facilities list */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
          {sortedFacilities.map((clinic) => {
            const isSelected = selectedClinic && selectedClinic.id === clinic.id;
            return (
              <div
                key={clinic.id}
                onClick={() => panToFacility(clinic)}
                className={`p-3 rounded-2xl border text-xs cursor-pointer transition ${
                  isSelected
                    ? 'bg-white border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                    : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase ${
                      clinic.type === 'CHC' ? 'bg-purple-100 text-purple-800' : 'bg-teal-100 text-teal-800'
                    }`}>
                      {clinic.type}
                    </span>
                    {clinic.distanceKm !== null && (
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        📍 {clinic.distanceKm} km
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold ${clinic.emergencyBeds > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    🛏️ {clinic.emergencyBeds} Beds
                  </span>
                </div>

                <div className="font-bold text-slate-900 leading-snug">{clinic.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{clinic.district} • {clinic.block}</div>

                <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100 text-[11px]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onAskAI) onAskAI(clinic);
                    }}
                    className="text-slate-600 hover:text-slate-900 font-medium"
                  >
                    🤖 Ask AI
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onBookToken) onBookToken(clinic);
                    }}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition"
                  >
                    🎫 Book Token
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Map Canvas */}
      <div className="flex-1 relative h-full">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Legend Overlay */}
        <div className="absolute top-3 right-3 z-20 bg-white/95 backdrop-blur-sm p-2.5 rounded-xl border border-slate-200 text-[11px] shadow-sm space-y-1 font-medium">
          <div className="font-bold text-slate-800 text-[10px] uppercase tracking-wider mb-1">Emergency Bed Status</div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <span>&gt;5 Emergency Beds</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>1–5 Emergency Beds</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
            <span>0 Beds Available</span>
          </div>
        </div>

        {/* Quick Action Bottom Card */}
        {selectedClinic && (
          <div className="absolute bottom-4 left-4 right-4 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">{selectedClinic.name}</span>
                <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                  {selectedClinic.district}
                </span>
                {selectedClinic.distanceKm !== null && (
                  <span className="bg-emerald-50 text-emerald-700 font-extrabold px-2 py-0.5 rounded text-[10px] border border-emerald-200">
                    📍 {selectedClinic.distanceKm} km away
                  </span>
                )}
              </div>
              <div className="text-slate-500 text-[11px] mt-0.5">
                {selectedClinic.operatingHours} • Contact: {selectedClinic.contact ? selectedClinic.contact.phone : '108'}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onAskAI && onAskAI(selectedClinic)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
              >
                🤖 Ask AI Info
              </button>
              <button
                type="button"
                onClick={() => onBookToken && onBookToken(selectedClinic)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition cursor-pointer"
              >
                🎫 Book OPD Token
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
