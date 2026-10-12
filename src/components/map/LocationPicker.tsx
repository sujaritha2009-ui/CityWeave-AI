import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMapEvents } from "react-leaflet";
import type { Junction } from "@shared/types";
import { OSM_ATTRIBUTION, OSM_TILES } from "../../lib/mapConfig";
import { getMapProvider, setMapProvider, type MapProvider } from "../../lib/googleMaps";
import { GoogleLocationPicker } from "./GoogleLocationPicker";

const pinIcon = L.divIcon({
  className: "",
  html: `<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg"><path d="M15 0C6.7 0 0 6.7 0 15c0 11.2 15 25 15 25s15-13.8 15-25C30 6.7 23.3 0 15 0z" fill="#ef4444"/><circle cx="15" cy="15" r="6" fill="#fff"/></svg>`,
  iconSize: [30, 40],
  iconAnchor: [15, 40],
});

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onChange(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

export function LocationPicker({
  lat,
  lng,
  junctions,
  onChange,
}: {
  lat: number;
  lng: number;
  junctions: Junction[];
  onChange: (lat: number, lng: number) => void;
}) {
  const [provider, setProvider] = useState<MapProvider>(getMapProvider());

  useEffect(() => {
    const handleProviderChange = () => setProvider(getMapProvider());
    window.addEventListener("cityweave_map_provider_change", handleProviderChange);
    return () => {
      window.removeEventListener("cityweave_map_provider_change", handleProviderChange);
    };
  }, []);

  const handlers = useMemo(
    () => ({
      dragend: (e: L.LeafletEvent) => {
        const p = (e.target as L.Marker).getLatLng();
        onChange(p.lat, p.lng);
      },
    }),
    [onChange],
  );

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs px-1 text-slate-500">
        <span>Click or drag pin to position</span>
        <button
          type="button"
          onClick={() => {
            const next = provider === "google" ? "osm" : "google";
            setProvider(next);
            setMapProvider(next);
          }}
          className="text-[11px] font-semibold text-primary hover:underline"
        >
          {provider === "google" ? "Switch to OpenStreetMap" : "Switch to Google Maps"}
        </button>
      </div>

      {provider === "google" ? (
        <GoogleLocationPicker lat={lat} lng={lng} junctions={junctions} onChange={onChange} />
      ) : (
        <MapContainer center={[lat, lng]} zoom={15} scrollWheelZoom className="h-72 w-full rounded-xl">
          <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILES} />
          <ClickHandler onChange={onChange} />
          {junctions.map((j) => (
            <CircleMarker key={j.id} center={[j.lat, j.lng]} radius={8} pathOptions={{ color: "#1677f8", fillOpacity: 0.25 }}>
              <Tooltip>{j.name}</Tooltip>
            </CircleMarker>
          ))}
          <Marker position={[lat, lng]} draggable icon={pinIcon} eventHandlers={handlers} />
        </MapContainer>
      )}
    </div>
  );
}
