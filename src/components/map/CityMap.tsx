import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { CongestionLevel, Institution, Junction, TrafficObservation } from "../../data/types";
import { PILOT_CENTER } from "../../data/seed";
import { INSTITUTION_TYPES } from "../../lib/institutionMeta";
import { formatTime } from "../../lib/time";
import { OSM_ATTRIBUTION, OSM_TILES } from "../../lib/mapConfig";
import { CONGESTION_STYLES, junctionStats } from "../../lib/traffic";

function FlyTo({ target, zoom }: { target?: [number, number]; zoom: number }) {
  const map = useMap();
  const lat = target?.[0];
  const lng = target?.[1];
  useEffect(() => {
    if (lat !== undefined && lng !== undefined) map.flyTo([lat, lng], zoom, { duration: 0.6 });
  }, [map, lat, lng, zoom]);
  return null;
}

interface CityMapProps {
  junctions: Junction[];
  institutions: Institution[];
  observations: TrafficObservation[];
  visibleLevels?: CongestionLevel[];
  focus?: [number, number];
  zoom?: number;
  className?: string;
  showPopups?: boolean;
}

export function CityMap({
  junctions,
  institutions,
  observations,
  visibleLevels,
  focus,
  zoom = 15,
  className = "h-[520px]",
  showPopups = true,
}: CityMapProps) {
  return (
    <MapContainer center={focus ?? PILOT_CENTER} zoom={zoom} scrollWheelZoom className={`w-full rounded-xl ${className}`}>
      <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILES} />
      <FlyTo target={focus} zoom={zoom} />

      {institutions.map((inst) => {
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

      {junctions.map((j) => {
        const stats = junctionStats(j.id, observations);
        const level = stats?.congestion ?? "low";
        if (visibleLevels && !visibleLevels.includes(level)) return null;
        const style = CONGESTION_STYLES[level];
        const nearby = institutions.filter((i) => i.junctionId === j.id).length;
        return (
          <CircleMarker
            key={j.id}
            center={[j.lat, j.lng]}
            radius={level === "high" ? 20 : level === "moderate" ? 16 : 12}
            pathOptions={{ color: style.color, weight: 3, fillColor: style.color, fillOpacity: 0.35 }}
          >
            {showPopups ? (
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
  );
}
