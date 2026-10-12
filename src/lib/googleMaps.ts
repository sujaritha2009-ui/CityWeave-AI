import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

const PROVIDER_KEY = "cityweave_map_provider";

export type MapProvider = "google" | "osm";

export const DEFAULT_GOOGLE_MAPS_KEY = "";

let cachedMapsApiKey: string | null = null;

export async function fetchGoogleMapsApiKey(): Promise<string> {
  if (cachedMapsApiKey) return cachedMapsApiKey;

  try {
    const res = await fetch("/api/config/maps-key");
    if (res.ok) {
      const data = await res.json();
      if (data.googleMapsApiKey) {
        cachedMapsApiKey = data.googleMapsApiKey;
        return cachedMapsApiKey!;
      }
    }
  } catch {
    // backend offline or direct
  }

  const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (envKey && typeof envKey === "string" && envKey.trim()) {
    cachedMapsApiKey = envKey.trim();
    return cachedMapsApiKey;
  }

  cachedMapsApiKey = DEFAULT_GOOGLE_MAPS_KEY;
  return cachedMapsApiKey;
}

export function getGoogleMapsApiKey(): string {
  return cachedMapsApiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || DEFAULT_GOOGLE_MAPS_KEY;
}

export function getMapProvider(): MapProvider {
  if (typeof window === "undefined") return "google";
  const stored = localStorage.getItem(PROVIDER_KEY);
  if (stored === "osm") return "osm";
  return "google";
}

export function setMapProvider(provider: MapProvider): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROVIDER_KEY, provider);
  window.dispatchEvent(new Event("cityweave_map_provider_change"));
}

let loaderPromise: Promise<typeof google> | null = null;
let lastApiKeyLoaded = "";

export async function loadGoogleMaps(apiKey?: string): Promise<typeof google> {
  const key = apiKey || (await fetchGoogleMapsApiKey());
  if (!key) {
    return Promise.reject(new Error("No Google Maps API key available from backend."));
  }

  // If already loaded with the same key
  if (typeof window !== "undefined" && window.google?.maps && lastApiKeyLoaded === key) {
    return window.google;
  }

  if (loaderPromise && lastApiKeyLoaded === key) {
    return loaderPromise;
  }

  lastApiKeyLoaded = key;
  setOptions({
    key,
    v: "weekly",
  });

  loaderPromise = (async () => {
    await Promise.all([
      importLibrary("maps"),
      importLibrary("places"),
      importLibrary("geometry"),
    ]);
    return window.google;
  })();

  return loaderPromise;
}

/** Modern urban map styling for traffic and institutional corridor inspection */
export const GOOGLE_MAP_STYLES: google.maps.MapTypeStyle[] = [
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "water",
    elementType: "geometry.fill",
    stylers: [{ color: "#dbeafe" }],
  },
  {
    featureType: "landscape.natural",
    elementType: "geometry.fill",
    stylers: [{ color: "#f8fafc" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.fill",
    stylers: [{ color: "#cbd5e1" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry.fill",
    stylers: [{ color: "#e2e8f0" }],
  },
  {
    featureType: "road.local",
    elementType: "geometry.fill",
    stylers: [{ color: "#f1f5f9" }],
  },
];
