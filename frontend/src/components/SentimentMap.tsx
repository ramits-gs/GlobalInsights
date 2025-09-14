// frontend/src/components/SentimentMap.tsx
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import MapLegend from "./MapLegend";
// @ts-ignore  — Vite can import JSON; your file should be at src/assets/world.geo.json
import world from "../assets/world.geo.json";

export type GeoDatum = { cc: string; n: number; avg: number };

const MAP_CENTER: LatLngTuple = [20, 0]; // typed tuple fixes TS on `center`

export default function SentimentMap({
  data,
  selectedCC,
  onSelectCountry,
}: {
  data: GeoDatum[];
  selectedCC?: string | null;
  onSelectCountry?: (iso2: string) => void;
}) {
  // Build lookup for quick access by ISO2
  const byIso = new Map<string, GeoDatum>();
  (data || []).forEach((d) => byIso.set((d.cc || "").toUpperCase(), d));

  function colorFor(val?: number) {
    // Grey when no data
    if (val === undefined) return "#e5e7eb"; // gray-200
    // Map -1..0..+1 to red..gray..green
    const t = Math.max(-1, Math.min(1, val));
    const r = t < 0 ? 220 : Math.round(220 * (1 - t));
    const g = t > 0 ? 220 : Math.round(220 * (1 + t));
    const b = 140;
    return `rgb(${r}, ${g}, ${b})`;
  }

  function style(feature: any) {
    const iso = (feature?.properties?.ISO_A2 || "").toUpperCase();
    const rec = byIso.get(iso);
    const isSelected = selectedCC && iso === selectedCC.toUpperCase();
    return {
      fillColor: colorFor(rec?.avg),
      color: isSelected ? "#111827" : "#666",
      weight: isSelected ? 1.5 : 0.6,
      fillOpacity: rec ? 0.85 : 0.35,
    };
  }

  function onEachFeature(feature: any, layer: any) {
    const iso = (feature?.properties?.ISO_A2 || "").toUpperCase();
    const name = feature?.properties?.ADMIN || iso;
    const rec = byIso.get(iso);

    const html = rec
      ? `<b>${name}</b><br/>Avg sentiment: ${rec.avg.toFixed(2)}<br/>Posts: ${rec.n}`
      : `<b>${name}</b><br/>No data`;
    layer.bindTooltip(html, { sticky: true });

    layer.on("click", () => {
      onSelectCountry?.(iso);
    });
  }

  return (
    <div className="bg-white p-4 rounded shadow relative">
      <div className="font-semibold mb-2">Geography</div>

      <MapContainer
        center={MAP_CENTER}
        zoom={2}
        style={{ height: 360, width: "100%", borderRadius: "0.75rem" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* @ts-ignore — JSON is fine at runtime */}
        <GeoJSON data={world as any} style={style} onEachFeature={onEachFeature} />
      </MapContainer>

      {/* Legend overlay */}
      <div className="absolute bottom-4 right-4">
        <MapLegend />
      </div>
    </div>
  );
}
