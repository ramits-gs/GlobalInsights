import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import world from "../assets/world.geo.json";

type GeoDatum = { cc: string; n: number; avg: number };

export default function SentimentMap({ data }:{ data: GeoDatum[] }) {
  const lookup = new Map<string, GeoDatum>();
  data.forEach(d => lookup.set(d.cc.toUpperCase(), d));

  function colorFor(v?: number) {
    if (v === undefined) return "#e5e7eb"; // gray-200
    // map -1..0..+1 to red..gray..green
    const r = v < 0 ? 220 : 120 - Math.round(v*100);
    const g = v > 0 ? 220 : 120 + Math.round(v*100);
    return `rgb(${Math.max(0,r)}, ${Math.max(0,g)}, 130)`;
  }

  function style(feature:any) {
    const iso = (feature.properties?.ISO_A2 || "").toUpperCase();
    const rec = lookup.get(iso);
    return {
      fillColor: colorFor(rec?.avg),
      weight: 0.6,
      opacity: 1,
      color: "#666",
      fillOpacity: rec ? 0.8 : 0.35,
    };
  }

  function onEachFeature(feature:any, layer:any) {
    const iso = (feature.properties?.ISO_A2 || "").toUpperCase();
    const name = feature.properties?.ADMIN || iso;
    const rec = lookup.get(iso);
    const txt = rec
      ? `<b>${name}</b><br/>Avg sentiment: ${rec.avg.toFixed(2)}<br/>Posts: ${rec.n}`
      : `<b>${name}</b><br/>No data`;
    layer.bindTooltip(txt, { sticky: true });
  }

  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="font-semibold mb-2">Geography</div>
      <MapContainer center={[20, 0]} zoom={2} style={{height:360, width:"100%"}} scrollWheelZoom={false}>
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
        {/* @ts-ignore */}
        <GeoJSON data={world as any} style={style} onEachFeature={onEachFeature} />
      </MapContainer>
    </div>
  );
}
