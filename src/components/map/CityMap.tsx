import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import { Layers, Sparkles } from "lucide-react";
import { PILOT_CENTER } from "@shared/seed";
import { formatTime } from "@shared/time";
import { junctionStats } from "@shared/traffic";
import type { CongestionLevel, Institution, Junction, TrafficObservation } from "@shared/types";
import { CONGESTION_STYLES } from "../../lib/congestion";
import { INSTITUTION_TYPES } from "../../lib/institutionMeta";
import { OSM_ATTRIBUTION, OSM_TILES } from "../../lib/mapConfig";
import { getMapProvider, setMapProvider, type MapProvider } from "../../lib/googleMaps";
import { GoogleCityMap } from "./GoogleCityMap";

function FlyTo({ target, zoom }: { target?: [number, number]; zoom: number }) {
  const map = useMap();
  const lat = target?.[0];
  const lng = target?.[1];
  useEffect(() => {
    if (lat !== undefined && lng !== undefined) map.flyTo([lat, lng], zoom, { duration: 0.6 });
  }, [map, lat, lng, zoom]);
  return null;
}

export interface CityMapProps {
  junctions: Junction[];
  institutions: Institution[];
  observations: TrafficObservation[];
  visibleLevels?: CongestionLevel[];
  focus?: [number, number];
  zoom?: number;
  className?: string;
  showPopups?: boolean;
}

export function CityMap(props: CityMapProps) {
  const [provider, setProvider] = useState<MapProvider>(getMapProvider());

  useEffect(() => {
    const handleProviderChange = () => setProvider(getMapProvider());
    window.addEventListener("cityweave_map_provider_change", handleProviderChange);
    return () => {
      window.removeEventListener("cityweave_map_provider_change", handleProviderChange);
    };
  }, []);

  const handleToggleProvider = (newProvider: MapProvider) => {
    setProvider(newProvider);
    setMapProvider(newProvider);
  };

  return (
    <div className="space-y-2">
      {/* Map Provider Switcher Bar */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-1.5 font-medium text-slate-600">
          <Layers className="h-3.5 w-3.5 text-muted" />
          <span>Map Engine:</span>
          <div className="inline-flex rounded-lg border border-line bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => handleToggleProvider("google")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                provider === "google"
                  ? "bg-primary text-white shadow-xs"
                  : "text-slate-600 hover:text-brand"
              }`}
            >
              <Sparkles className="h-3 w-3" />
              <span>Google Maps Platform</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleProvider("osm")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                provider === "osm"
                  ? "bg-primary text-white shadow-xs"
                  : "text-slate-600 hover:text-brand"
              }`}
            >
              <span>OpenStreetMap</span>
            </button>
          </div>
        </div>

        {provider === "google" && (
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Traffic &amp; Routes Ready
          </span>
        )}
      </div>

      {/* Render selected map provider */}
      {provider === "google" ? (
        <GoogleCityMap {...props} />
      ) : (
        <MapContainer
          center={props.focus ?? PILOT_CENTER}
          zoom={props.zoom ?? 15}
          scrollWheelZoom
          className={`w-full rounded-xl ${props.className ?? "h-[520px]"}`}
        >
          <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILES} />
          <FlyTo target={props.focus} zoom={props.zoom ?? 15} />

          {props.institutions.map((inst) => {
            const meta = INSTITUTION_TYPES[inst.type];
            return (
              <CircleMarker
                key={inst.id}
                center={[inst.lat, inst.lng]}
                radius={7}
                pathOptions={{ color: "#fff", weight: 2, fillColor: meta.color, fillOpacity: 1 }}
              >
                <Tooltip direction="top" offset={[0, -6]}>
                  <strong>{inst.name}</strong>
                  <br />
                  {meta.label} · {formatTime(inst.startTime)} – {formatTime(inst.endTime)}
                </Tooltip>
              </CircleMarker>
            );
          })}

          {props.junctions.map((j) => {
            const stats = junctionStats(j.id, props.observations);
            const level = stats?.congestion ?? "low";
            if (props.visibleLevels && !props.visibleLevels.includes(level)) return null;
            const style = CONGESTION_STYLES[level];
            const nearby = props.institutions.filter((i) => i.junctionId === j.id).length;
            return (
              <CircleMarker
                key={j.id}
                center={[j.lat, j.lng]}
                radius={level === "high" ? 20 : level === "moderate" ? 16 : 12}
                pathOptions={{ color: style.color, weight: 3, fillColor: style.color, fillOpacity: 0.35 }}
              >
                {props.showPopups !== false ? (
                  <Popup>
                    <div className="min-w-48 space-y-1 text-brand">
                      <p className="text-sm font-bold">{j.name}</p>
                      <p style={{ color: style.color }} className="font-semibold">● {style.label}</p>
                      {stats && (
                        <p>
                          Peak: {formatTime(stats.peakStart)} – {formatTime(stats.peakEnd)}
                        </p>
                      )}
                      <p>{nearby} nearby institution{nearby === 1 ? "" : "s"}</p>
                      <Link to={`/app/junctions/${j.id}`} className="font-semibold text-primary">
                        View junction details →
                      </Link>
                    </div>
                  </Popup>
                ) : (
                  <Tooltip>{j.name}</Tooltip>
                )}
              </CircleMarker>
            );
          })}
        </MapContainer>
      )}
    </div>
  );
}
