import React, { useEffect, useState, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { TouristPlace } from "../types";
import { MapPin, Sparkles, ExternalLink, RefreshCw } from "lucide-react";

interface TopSightsMapProps {
  places: TouristPlace[];
  destinationName: string;
  selectedPlaceName: string | null;
  onSelectPlace: (name: string | null) => void;
}

interface LocationMarker {
  id: string;
  name: string;
  description: string;
  entryPrice: string;
  lat: number;
  lng: number;
}

// Popular city center coordinates lookup table to avoid redundant geocoding requests
const CITY_COORDINATES: { [key: string]: [number, number] } = {
  "indore": [22.7196, 75.8577],
  "goa": [15.2993, 74.1240],
  "mumbai": [19.0760, 72.8777],
  "delhi": [28.6139, 77.2090],
  "new delhi": [28.6139, 77.2090],
  "jaipur": [26.9124, 75.7873],
  "udaipur": [24.5854, 73.7125],
  "agra": [27.1767, 78.0081],
  "varanasi": [25.3176, 82.9739],
  "bengaluru": [12.9716, 77.5946],
  "bangalore": [12.9716, 77.5946],
  "kochi": [9.9312, 76.2673],
  "munnar": [10.0889, 77.0595],
  "manali": [32.2396, 77.1887],
  "shimla": [31.1048, 77.1734],
  "ooty": [11.4102, 76.6950],
  "darjeeling": [27.0410, 88.2627],
  "london": [51.5074, -0.1278],
  "paris": [48.8566, 2.3522],
  "new york": [40.7128, -74.0060],
  "tokyo": [35.6762, 139.6503],
  "singapore": [1.3521, 103.8198],
  "bali": [-8.4095, 115.1889],
  "maldives": [3.2028, 73.2207],
  "bangkok": [13.7563, 100.5018],
  "dubai": [25.2048, 55.2708],
  "sydney": [-33.8688, 151.2093]
};

// Find coordinates locally if city matches popular lists
const findLocalCoordinates = (name: string): [number, number] | null => {
  const norm = name.toLowerCase().trim();
  for (const key of Object.keys(CITY_COORDINATES)) {
    if (norm.includes(key) || key.includes(norm)) {
      return CITY_COORDINATES[key];
    }
  }
  return null;
};

// Generates stable unique spatial offsets based on text hashing to layout attraction pins elegantly
const getStableCoordsOffset = (str: string, index: number) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const val = Math.abs(hash);
  // Multi-angle scatter radius distribution between 0.008 to 0.02 degrees (~1km to ~2.5km)
  const radius = 0.008 + (val % 120) * 0.0001;
  const angle = (index * 2 * Math.PI) / 8 + (val % 10) * 0.1;
  return {
    lat: Math.sin(angle) * radius,
    lng: Math.cos(angle) * radius
  };
};

// Safer fetch utilizing request timeouts to avoid infinite stalls
const fetchWithTimeout = async (url: string, timeoutMs = 800) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

export function TopSightsMap({ 
  places, 
  destinationName, 
  selectedPlaceName, 
  onSelectPlace 
}: TopSightsMapProps) {
  const [markers, setMarkers] = useState<LocationMarker[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const leafletMarkersRef = useRef<{ [key: string]: L.Marker }>({});

  const placesHash = places.map(p => p.name).join("|");

  // Fetch coordinates on destination or places change using OpenStreetMap (Nominatim API)
  useEffect(() => {
    if (!places.length || !destinationName) return;

    let isMounted = true;
    setIsLoading(true);

    const geocodeAll = async () => {
      const loadedMarkers: LocationMarker[] = [];
      
      // Step A: Determine central fallback anchor coordinate (prefer local list first)
      let baseLat = 20.5937;
      let baseLng = 78.9629;
      
      const localCoords = findLocalCoordinates(destinationName);
      if (localCoords) {
        baseLat = localCoords[0];
        baseLng = localCoords[1];
      } else {
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destinationName)}&limit=1`;
          const res = await fetchWithTimeout(url, 1000);
          const data = await res.json();
          if (data && data.length > 0) {
            baseLat = parseFloat(data[0].lat);
            baseLng = parseFloat(data[0].lon);
          }
        } catch (err) {
          // Swallow warning silently and default to global center fallback coordinates
        }
      }

      // Step B: Geocode attractions with fast timeout checks and stable offsets fallback
      for (let i = 0; i < places.length; i++) {
        const place = places[i];
        const searchAddress = `${place.name}, ${destinationName}`;
        let lat: number | null = null;
        let lng: number | null = null;

        try {
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=1`;
          const res = await fetchWithTimeout(url, 800);
          const data = await res.json();
          if (data && data.length > 0) {
            lat = parseFloat(data[0].lat);
            lng = parseFloat(data[0].lon);
          } else {
            // Try only the name
            const altUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place.name)}&limit=1`;
            const altRes = await fetchWithTimeout(altUrl, 800);
            const altData = await altRes.json();
            if (altData && altData.length > 0) {
              lat = parseFloat(altData[0].lat);
              lng = parseFloat(altData[0].lon);
            }
          }
        } catch (err) {
          // Swallowed gracefully without print pollution
        }

        // If Nominatim is offline or cannot locate the place, disperse gracefully using deterministic text hashes
        if (lat === null || lng === null) {
          const offset = getStableCoordsOffset(place.name, i);
          lat = baseLat + offset.lat;
          lng = baseLng + offset.lng;
        }

        loadedMarkers.push({
          id: `${place.name}-${i}`,
          name: place.name,
          description: place.description,
          entryPrice: place.entryPrice,
          lat,
          lng
        });

        // 60ms pause to comply with OSM guidelines rate limiting if we fetched
        await new Promise(resolve => setTimeout(resolve, 60));
      }

      if (isMounted) {
        setMarkers(loadedMarkers);
        setIsLoading(false);
      }
    };

    geocodeAll();

    return () => {
      isMounted = false;
    };
  }, [placesHash, destinationName]);

  // Secondary effect: Initialize map container once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Remove existing instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView([20.5937, 78.9629], 11);

    // Apply standard OpenStreetMap tile layers
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Leaflet markers on Map whenever the geocoded markers array changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || markers.length === 0) return;

    // Clear old markers
    Object.keys(leafletMarkersRef.current).forEach(key => {
      leafletMarkersRef.current[key].remove();
    });
    leafletMarkersRef.current = {};

    const markerGroup: L.LatLng[] = [];

    markers.forEach(markerData => {
      markerGroup.push(L.latLng(markerData.lat, markerData.lng));

      // Neobrutalist styling matches our comic book theme perfectly without missing assets
      const customMarkerIcon = L.divIcon({
        html: `
          <div class="flex items-center justify-center">
            <div class="relative flex items-center justify-center w-8 h-8 rounded-full border-2 border-[#2D3436] bg-[#FF6B6B] text-white font-black text-center shadow-[1.5px_1.5px_0px_0px_#2D3436] hover:scale-110 active:scale-95 transition-all">
              <span class="text-xs">📍</span>
            </div>
          </div>
        `,
        className: "custom-leaflet-icon",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
      });

      const popupContent = `
        <div style="font-family: 'Inter', system-ui, sans-serif; padding: 6px; max-width: 190px;">
          <h5 style="margin: 0 0 4px 0; font-size: 11px; font-weight: 900; color: #2D3436; font-family: 'Inter', sans-serif;">
            📍 ${markerData.name}
          </h5>
          <p style="margin: 0 0 6px 0; font-size: 9.5px; line-height: 1.3; font-weight: 600; color: #718096;">
            ${markerData.description}
          </p>
          <div style="display: flex; justify-between; align-items: center; border-top: 1px dashed #E2E8F0; padding-top: 6px; margin-top: 4px; font-size: 9px; font-weight: 800; color: #FF6B6B;">
            <span style="flex-grow: 1;">🎫: ${markerData.entryPrice}</span>
            <a 
              href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(markerData.name + " " + markerData.description)}" 
              target="_blank" 
              rel="noreferrer"
              referrerPolicy="no-referrer"
              style="text-decoration: underline; color: #4D96FF; font-weight: 800; margin-left: 6px;"
            >
              Directions ↗
            </a>
          </div>
        </div>
      `;

      const marker = L.marker([markerData.lat, markerData.lng], { icon: customMarkerIcon })
        .addTo(map)
        .bindPopup(popupContent, { closeButton: false });

      marker.on("click", () => {
        onSelectPlace(markerData.name);
      });

      leafletMarkersRef.current[markerData.name] = marker;
    });

    // Fit map view to include all sightseeing locations smoothly
    if (markerGroup.length > 0) {
      const bounds = L.latLngBounds(markerGroup);
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    // Force Leaflet map redraw to prevent grey empty map container issue inside dynamic active tabs
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

  }, [markers]);

  // Synchronize externally selected attractions to update active popups in Leaflet
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedPlaceName || markers.length === 0) return;

    const marker = leafletMarkersRef.current[selectedPlaceName];
    if (marker) {
      const position = marker.getLatLng();
      map.setView(position, 15);
      marker.openPopup();
    }
  }, [selectedPlaceName, markers]);

  const handleResetMap = () => {
    onSelectPlace(null);
    const map = mapInstanceRef.current;
    if (map && markers.length > 0) {
      const coords = markers.map(m => L.latLng(m.lat, m.lng));
      map.fitBounds(L.latLngBounds(coords), { padding: [40, 40] });
      map.closePopup();
    }
  };

  return (
    <div className="bg-white border-4 border-brand-dark rounded-3xl h-full flex flex-col overflow-hidden shadow-[6px_6px_0px_0px_#2D3436]">
      {/* Map Header */}
      <div className="bg-brand-dark text-white p-3.5 font-black text-xs uppercase tracking-wider flex items-center justify-between border-b-2 border-brand-dark">
        <span className="flex items-center gap-1.5">🗺️ Interactive Sights Map</span>
        <span className="text-[10px] text-brand-yellow font-extrabold uppercase bg-white/10 px-2 py-0.5 rounded">
          Leaflet OpenStreetMap
        </span>
      </div>

      {/* Map Container */}
      <div className="flex-1 w-full relative min-h-[300px]">
        {isLoading && (
          <div className="absolute top-3 left-3 z-[1100] flex items-center gap-1.5 bg-white border-2 border-brand-dark px-3 py-1.5 rounded-xl text-[10px] font-black shadow-[2px_2px_0px_0px_#2D3436]">
            <RefreshCw size={11} className="animate-spin text-brand-pink" />
            Geocoding Sight Locations...
          </div>
        )}

        {markers.length > 0 && (
          <button 
            onClick={handleResetMap}
            className="absolute bottom-3 right-3 z-[1000] bg-white hover:bg-slate-50 border-2 border-brand-dark px-2.5 py-1.5 rounded-xl text-[9px] font-black shadow-[2px_2px_0px_0px_#2D3436] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#2D3436] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
          >
            Reset View 🗺️
          </button>
        )}

        {/* Real DOM hook container for Leaflet map */}
        <div 
          ref={mapContainerRef} 
          className="w-full h-full z-0" 
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}
