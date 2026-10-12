import { useMemo } from "react";
import L from "leaflet";
import { CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMapEvents } from "react-leaflet";
import type { Junction } from "@shared/types";
import { OSM_ATTRIBUTION, OSM_TILES } from "../../lib/mapConfig";

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
  );
}
