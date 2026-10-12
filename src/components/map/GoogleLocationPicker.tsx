import { useEffect, useRef, useState, useCallback } from "react";
import { AlertCircle, Layers, MapPin, Search } from "lucide-react";
import type { Junction } from "@shared/types";
import {
  GOOGLE_MAP_STYLES,
  loadGoogleMaps,
  setMapProvider,
} from "../../lib/googleMaps";

interface GoogleLocationPickerProps {
  lat: number;
  lng: number;
  junctions: Junction[];
  onChange: (lat: number, lng: number) => void;
}

export function GoogleLocationPicker({
  lat,
  lng,
  junctions,
  onChange,
}: GoogleLocationPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const junctionCirclesRef = useRef<google.maps.Circle[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addressPreview, setAddressPreview] = useState<string>("");

  // Reverse geocode coordinate using Google Geocoder
  const reverseGeocode = useCallback((posLat: number, posLng: number) => {
    if (!window.google?.maps?.Geocoder) return;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat: posLat, lng: posLng } }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        setAddressPreview(results[0].formatted_address);
      } else {
        setAddressPreview(`Coordinates: ${posLat.toFixed(5)}, ${posLng.toFixed(5)}`);
      }
    });
  }, []);

  const initMap = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await loadGoogleMaps();
      if (!containerRef.current) return;

      const position = { lat, lng };

      const map = new google.maps.Map(containerRef.current, {
        center: position,
        zoom: 15,
        styles: GOOGLE_MAP_STYLES,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
      });
      mapRef.current = map;

      // Draggable Institution Marker
      const pinSvg = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="34" height="42" viewBox="0 0 34 42" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 0C7.6 0 0 7.6 0 17c0 12.8 17 25 17 25s17-12.2 17-25C34 7.6 26.4 0 17 0z" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
          <circle cx="17" cy="16" r="6" fill="#ffffff"/>
        </svg>
      `)}`;

      const marker = new google.maps.Marker({
        position,
        map,
        draggable: true,
        animation: google.maps.Animation?.DROP,
        icon: {
          url: pinSvg,
          scaledSize: new google.maps.Size(32, 40),
          anchor: new google.maps.Point(16, 40),
        },
      });
      markerRef.current = marker;

      // Handle Drag End
      marker.addListener("dragend", () => {
        const pos = marker.getPosition();
        if (pos) {
          const newLat = pos.lat();
          const newLng = pos.lng();
          onChange(newLat, newLng);
          reverseGeocode(newLat, newLng);
        }
      });

      // Handle Map Click
      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const newLat = e.latLng.lat();
        const newLng = e.latLng.lng();
        marker.setPosition(e.latLng);
        onChange(newLat, newLng);
        reverseGeocode(newLat, newLng);
      });

      // Show nearby junctions as circle markers
      junctionCirclesRef.current.forEach((c) => c.setMap(null));
      junctionCirclesRef.current = junctions.map((j) => {
        return new google.maps.Circle({
          strokeColor: "#1677f8",
          strokeOpacity: 0.7,
          strokeWeight: 2,
          fillColor: "#1677f8",
          fillOpacity: 0.15,
          map,
          center: { lat: j.lat, lng: j.lng },
          radius: 120,
        });
      });

      // Google Places Autocomplete integration
      if (searchInputRef.current && window.google?.maps?.places?.Autocomplete) {
        const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current, {
          fields: ["geometry", "formatted_address", "name"],
          componentRestrictions: { country: "in" },
        });

        autocomplete.bindTo("bounds", map);

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (!place.geometry || !place.geometry.location) return;

          const newLat = place.geometry.location.lat();
          const newLng = place.geometry.location.lng();

          map.panTo(place.geometry.location);
          map.setZoom(16);
          marker.setPosition(place.geometry.location);
          onChange(newLat, newLng);
          setAddressPreview(place.formatted_address || place.name || "");
        });
      }

      reverseGeocode(lat, lng);
      setLoading(false);
    } catch (err) {
      console.error("Google LocationPicker error:", err);
      setError(err instanceof Error ? err.message : "Failed to load Google Maps.");
      setLoading(false);
    }
  }, [lat, lng, junctions, onChange, reverseGeocode]);

  useEffect(() => {
    initMap();
  }, [initMap]);

  // Keep marker position synchronized with props if changed externally
  useEffect(() => {
    if (markerRef.current) {
      const current = markerRef.current.getPosition();
      if (!current || Math.abs(current.lat() - lat) > 0.0001 || Math.abs(current.lng() - lng) > 0.0001) {
        markerRef.current.setPosition({ lat, lng });
        if (mapRef.current) mapRef.current.panTo({ lat, lng });
      }
    }
  }, [lat, lng]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-canvas">
      {/* Places Search Bar */}
      <div className="p-3 bg-white border-b border-line flex items-center gap-2">
        <Search className="h-4 w-4 text-muted shrink-0" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search place or address with Google Places API…"
          className="w-full text-xs bg-transparent focus:outline-hidden text-slate-800"
        />
      </div>

      {/* Map Container */}
      <div ref={containerRef} className="h-72 w-full" />

      {/* Address Resolution Bar */}
      {addressPreview && (
        <div className="p-2 bg-slate-50 border-t border-line text-[11px] text-slate-600 flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="truncate">{addressPreview}</span>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-xs">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-2 text-xs font-semibold text-brand">Loading Google Maps &amp; Places…</p>
        </div>
      )}

      {/* Fallback Overlay */}
      {!loading && error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/95 p-4 text-center">
          <AlertCircle className="h-6 w-6 text-amber-600" />
          <p className="mt-2 text-xs text-slate-600">{error}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setMapProvider("osm")}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600"
            >
              <Layers className="inline h-3 w-3 mr-1" /> Use OpenStreetMap View
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
