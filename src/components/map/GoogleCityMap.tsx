import { useEffect, useRef, useState, useCallback } from "react";
import { AlertCircle, Car, Layers, Navigation, Sparkles } from "lucide-react";
import { PILOT_CENTER } from "@shared/seed";
import { formatTime } from "@shared/time";
import { junctionStats } from "@shared/traffic";
import type { CongestionLevel, Institution, Junction, TrafficObservation } from "@shared/types";
import { CONGESTION_STYLES } from "../../lib/congestion";
import { INSTITUTION_TYPES } from "../../lib/institutionMeta";
import {
  GOOGLE_MAP_STYLES,
  loadGoogleMaps,
  setMapProvider,
} from "../../lib/googleMaps";

interface GoogleCityMapProps {
  junctions: Junction[];
  institutions: Institution[];
  observations: TrafficObservation[];
  visibleLevels?: CongestionLevel[];
  focus?: [number, number];
  zoom?: number;
  className?: string;
  showPopups?: boolean;
}

export function GoogleCityMap({
  junctions,
  institutions,
  observations,
  visibleLevels,
  focus,
  zoom = 15,
  className = "h-[560px]",
  showPopups = true,
}: GoogleCityMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
  const markersRef = useRef<(google.maps.Marker | google.maps.Circle | google.maps.Polyline)[]>([]);
  const activeInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trafficActive, setTrafficActive] = useState(true);
  const [corridorsActive, setCorridorsActive] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize Google Maps instance directly from backend
  const initMap = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await loadGoogleMaps();
      if (!containerRef.current) return;

      const center = focus ? { lat: focus[0], lng: focus[1] } : { lat: PILOT_CENTER[0], lng: PILOT_CENTER[1] };

      const map = new google.maps.Map(containerRef.current, {
        center,
        zoom,
        styles: GOOGLE_MAP_STYLES,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
      });

      mapInstanceRef.current = map;

      // Google Maps TrafficLayer Product
      const traffic = new google.maps.TrafficLayer();
      trafficLayerRef.current = traffic;
      if (trafficActive) {
        traffic.setMap(map);
      }

      setMapLoaded(true);
      setLoading(false);
    } catch (err) {
      console.error("Google Maps load error:", err);
      setError(err instanceof Error ? err.message : "Failed to load Google Maps Platform.");
      setLoading(false);
    }
  }, [focus, zoom, trafficActive]);

  useEffect(() => {
    initMap();
    const handleKeyChange = () => initMap();
    window.addEventListener("cityweave_maps_key_change", handleKeyChange);
    return () => {
      window.removeEventListener("cityweave_maps_key_change", handleKeyChange);
    };
  }, [initMap]);

  // Handle focus updates
  useEffect(() => {
    if (mapInstanceRef.current && focus) {
      mapInstanceRef.current.panTo({ lat: focus[0], lng: focus[1] });
      mapInstanceRef.current.setZoom(zoom);
    }
  }, [focus, zoom]);

  // Handle traffic layer toggle
  useEffect(() => {
    if (trafficLayerRef.current && mapInstanceRef.current) {
      trafficLayerRef.current.setMap(trafficActive ? mapInstanceRef.current : null);
    }
  }, [trafficActive]);

  // Render Overlays: Junctions, Institutions, Circles & Influx Corridors
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !window.google?.maps) return;

    const map = mapInstanceRef.current;

    // Clear old markers and overlays
    markersRef.current.forEach((item) => item.setMap(null));
    markersRef.current = [];

    if (activeInfoWindowRef.current) {
      activeInfoWindowRef.current.close();
    }

    // 1. Draw Influx Corridors (Routes from Institutions to their Junction)
    if (corridorsActive) {
      institutions.forEach((inst) => {
        const junc = junctions.find((j) => j.id === inst.junctionId);
        if (!junc) return;

        const meta = INSTITUTION_TYPES[inst.type];
        const line = new google.maps.Polyline({
          path: [
            { lat: inst.lat, lng: inst.lng },
            { lat: junc.lat, lng: junc.lng },
          ],
          geodesic: true,
          strokeColor: meta.color,
          strokeOpacity: 0.55,
          strokeWeight: 3,
          map,
        });

        markersRef.current.push(line);
      });
    }

    // 2. Render Junctions (Congestion Hotspots + Impact Circles)
    junctions.forEach((j) => {
      const stats = junctionStats(j.id, observations);
      const level = stats?.congestion ?? "low";
      if (visibleLevels && !visibleLevels.includes(level)) return;

      const style = CONGESTION_STYLES[level];
      const radiusMeters = level === "high" ? 180 : level === "moderate" ? 130 : 90;

      // Google Maps Circle for congestion impact zone
      const circle = new google.maps.Circle({
        strokeColor: style.color,
        strokeOpacity: 0.85,
        strokeWeight: 2,
        fillColor: style.color,
        fillOpacity: 0.22,
        map,
        center: { lat: j.lat, lng: j.lng },
        radius: radiusMeters,
      });
      markersRef.current.push(circle);

      // Custom Junction Icon
      const junctionSvg = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="42" height="42" viewBox="0 0 42 42" xmlns="http://www.w3.org/2000/svg">
          <circle cx="21" cy="21" r="18" fill="${style.color}" fill-opacity="0.3"/>
          <circle cx="21" cy="21" r="13" fill="${style.color}" stroke="#ffffff" stroke-width="2.5"/>
          <circle cx="21" cy="21" r="5" fill="#ffffff"/>
        </svg>
      `)}`;

      const marker = new google.maps.Marker({
        position: { lat: j.lat, lng: j.lng },
        map,
        title: j.name,
        icon: {
          url: junctionSvg,
          scaledSize: new google.maps.Size(36, 36),
          anchor: new google.maps.Point(18, 18),
        },
      });

      if (showPopups) {
        const nearbyCount = institutions.filter((i) => i.junctionId === j.id).length;
        const infoContent = document.createElement("div");
        infoContent.className = "p-2 font-sans max-w-xs text-slate-900";
        infoContent.innerHTML = `
          <div style="font-family: system-ui, sans-serif; font-size: 13px; line-height: 1.4;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
              <strong style="font-size: 14px; color: #0f172a;">${j.name}</strong>
              <span style="background-color: ${style.color}20; color: ${style.color}; font-weight: 700; font-size: 11px; padding: 2px 6px; border-radius: 9999px; text-transform: uppercase;">
                ${style.label}
              </span>
            </div>
            ${stats ? `<div style="margin-top: 6px; font-size: 12px; color: #475569;">
              <strong>Peak Window:</strong> ${formatTime(stats.peakStart)} – ${formatTime(stats.peakEnd)} (${stats.peakCount} veh/15m)
            </div>` : ""}
            <div style="margin-top: 4px; font-size: 12px; color: #475569;">
              <strong>Estimated Delay:</strong> ${j.avgDelayMinutes[0]}–${j.avgDelayMinutes[1]} min
            </div>
            <div style="margin-top: 4px; font-size: 12px; color: #475569;">
              <strong>Corridor Influx:</strong> ${nearbyCount} nearby institution${nearbyCount === 1 ? "" : "s"}
            </div>
            <div style="margin-top: 8px; border-top: 1px solid #e2e8f0; padding-top: 6px;">
              <a href="/app/junctions/${j.id}" style="color: #1677f8; font-weight: 600; text-decoration: none; font-size: 12px;">
                Open Junction Traffic Details &rarr;
              </a>
            </div>
          </div>
        `;

        const infoWindow = new google.maps.InfoWindow({
          content: infoContent,
        });

        marker.addListener("click", () => {
          if (activeInfoWindowRef.current) activeInfoWindowRef.current.close();
          infoWindow.open(map, marker);
          activeInfoWindowRef.current = infoWindow;
        });
      }

      markersRef.current.push(marker);
    });

    // 3. Render Institutions (Institutions pins color-coded by type)
    institutions.forEach((inst) => {
      const meta = INSTITUTION_TYPES[inst.type];
      const instSvg = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="34" height="42" viewBox="0 0 34 42" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 0C7.6 0 0 7.6 0 17c0 12.8 17 25 17 25s17-12.2 17-25C34 7.6 26.4 0 17 0z" fill="${meta.color}" stroke="#ffffff" stroke-width="2"/>
          <circle cx="17" cy="16" r="7" fill="#ffffff"/>
        </svg>
      `)}`;

      const marker = new google.maps.Marker({
        position: { lat: inst.lat, lng: inst.lng },
        map,
        title: `${inst.name} (${meta.label})`,
        icon: {
          url: instSvg,
          scaledSize: new google.maps.Size(28, 35),
          anchor: new google.maps.Point(14, 35),
        },
      });

      if (showPopups) {
        const infoContent = document.createElement("div");
        infoContent.innerHTML = `
          <div style="font-family: system-ui, sans-serif; font-size: 13px; line-height: 1.4; padding: 2px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 9999px; background: ${meta.color};"></span>
              <strong style="font-size: 14px; color: #0f172a;">${inst.name}</strong>
            </div>
            <div style="margin-top: 4px; font-size: 12px; color: #475569;">
              <strong>Type:</strong> ${meta.label}
            </div>
            <div style="margin-top: 4px; font-size: 12px; color: #475569;">
              <strong>Operating Hours:</strong> ${formatTime(inst.startTime)} – ${formatTime(inst.endTime)}
            </div>
            <div style="margin-top: 4px; font-size: 12px; color: #475569;">
              <strong>Daily Influx:</strong> ~${inst.dailyArrivals.toLocaleString()} arrivals
            </div>
            <div style="margin-top: 4px; font-size: 12px; color: #475569;">
              <strong>Stated Flexibility:</strong> &plusmn;${inst.flexibilityMinutes} minutes
            </div>
          </div>
        `;

        const infoWindow = new google.maps.InfoWindow({
          content: infoContent,
        });

        marker.addListener("click", () => {
          if (activeInfoWindowRef.current) activeInfoWindowRef.current.close();
          infoWindow.open(map, marker);
          activeInfoWindowRef.current = infoWindow;
        });
      }

      markersRef.current.push(marker);
    });
  }, [mapLoaded, institutions, junctions, observations, visibleLevels, corridorsActive, showPopups]);

  const handleSwitchToOsm = () => {
    setMapProvider("osm");
  };

  return (
    <div className={`relative overflow-hidden rounded-xl border border-line bg-canvas ${className}`}>
      {/* Map Header Floating Controls */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTrafficActive(!trafficActive)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition-all ${
            trafficActive
              ? "border-emerald-500 bg-white text-emerald-700 ring-2 ring-emerald-500/20"
              : "border-line bg-white/95 text-slate-600 hover:bg-white"
          }`}
          title="Toggle Google Maps Live & Typical Traffic Layer"
        >
          <Car className={`h-3.5 w-3.5 ${trafficActive ? "text-emerald-600 animate-pulse" : "text-slate-400"}`} />
          <span>Google Live Traffic</span>
          {trafficActive && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
        </button>

        <button
          type="button"
          onClick={() => setCorridorsActive(!corridorsActive)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition-all ${
            corridorsActive
              ? "border-primary bg-white text-primary ring-2 ring-primary/20"
              : "border-line bg-white/95 text-slate-600 hover:bg-white"
          }`}
          title="Toggle Arrival Corridors from Institutions to Junctions"
        >
          <Navigation className="h-3.5 w-3.5 text-primary" />
          <span>Arrival Corridors</span>
        </button>

      </div>

      {/* Floating Product Badge */}
      <div className="absolute top-3 right-14 z-10 hidden md:flex items-center gap-1.5 rounded-full border border-line/80 bg-white/90 px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-xs backdrop-blur-xs">
        <Sparkles className="h-3 w-3 text-brand" />
        <span>Google Maps Platform</span>
      </div>

      {/* Map Canvas */}
      <div ref={containerRef} className="h-full w-full" />

      {/* Loading State Overlay */}
      {loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-xs">
          <div className="h-9 w-9 animate-spin rounded-full border-3 border-primary border-t-transparent" />
          <p className="mt-3 text-sm font-semibold text-brand">Initializing Google Maps Platform…</p>
          <p className="text-xs text-muted">Loading Maps JS API, Traffic Layer & Geometry libraries</p>
        </div>
      )}

      {/* Error or Fallback Overlay */}
      {!loading && error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/95 p-6 text-center">
          <div className="rounded-full bg-amber-100 p-3 text-amber-700">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h3 className="mt-3 text-base font-bold text-brand">Google Maps Platform</h3>
          <p className="mt-1 max-w-md text-xs text-slate-600">{error}</p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleSwitchToOsm}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-600"
            >
              <Layers className="h-3.5 w-3.5" />
              Use OpenStreetMap View
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
