// frontend/src/components/SentimentMap.tsx
import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  useMap,
} from "react-leaflet";
import L, { LatLngBounds, PathOptions } from "leaflet";
import "leaflet/dist/leaflet.css";
import { colorForAvg } from "../utils/colors";

type CountryPoint = { cc: string; n: number; avg: number };

const CENTROIDS: Record<string, [number, number]> = {
  US: [39.7837, -100.4459],
  CA: [61.0667, -107.9917],
  MX: [23.6345, -102.5528],
  BR: [-10.3333, -53.2000],
  AR: [-34.9965, -64.9673],
  GB: [54.7024, -3.2766],
  UK: [54.7024, -3.2766], // alias if backend sends UK
  IE: [53.4129, -8.2439],
  FR: [46.6034, 1.8883],
  DE: [51.1638, 10.4478],
  ES: [40.0028, -4.0031],
  IT: [42.6384, 12.6743],
  SE: [62.1980, 17.5510],
  NO: [64.5741, 11.5280],
  NL: [52.1326, 5.2913],
  BE: [50.6403, 4.6667],
  CH: [46.7986, 8.2320],
  AT: [47.5884, 14.1402],
  PT: [39.6620, -8.1350],
  PL: [52.0977, 19.0258],
  UA: [49.0, 31.0],
  TR: [38.9598, 34.9250],
  RU: [61.5240, 105.3188],
  IN: [22.3511, 78.6677],
  CN: [35.0001, 105.0000],
  JP: [36.5748, 139.2394],
  KR: [36.6384, 127.6961],
  SG: [1.3521, 103.8198],
  ID: [-2.5, 118.0],
  AU: [-25.2744, 133.7751],
  NZ: [-41.5001, 172.8344],
  AE: [24.0, 54.0],
  SA: [23.8859, 45.0792],
  IL: [31.4117, 35.0818],
  NG: [9.0820, 8.6753],
  ZA: [-30.5595, 22.9375],
  EG: [26.8206, 30.8025],
  KE: [-0.0236, 37.9062],
};

function radiusForCount(n: number) {
  // Bigger, more legible bubbles
  return 6 + 4 * Math.sqrt(Math.max(0, n));
}

function FitToMarkers({ points }: { points: L.LatLngExpression[] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const b = new LatLngBounds(points);
    map.fitBounds(b.pad(0.2), { animate: true });
  }, [points, map]);
  return null;
}

export default function SentimentMap({
  data,
  selectedCC,
  onSelectCountry,
}: {
  data: CountryPoint[] | undefined;
  selectedCC?: string | null;
  onSelectCountry?: (cc: string | null) => void;
}) {
  const rows = Array.isArray(data) ? data : [];

  // Map ISO2 -> lat/lng
  const markers = useMemo(() => {
    return rows
      .map((d) => {
        const cc = (d.cc || "").toUpperCase();
        const c = CENTROIDS[cc];
        return c ? { ...d, cc, lat: c[0], lng: c[1] } : null;
      })
      .filter(Boolean) as Array<CountryPoint & { lat: number; lng: number }>;
  }, [rows]);

  const positions = markers.map((m) => [m.lat, m.lng]) as L.LatLngExpression[];

  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="font-semibold mb-2">Global sentiment map</div>

      <div className="relative">
        {/* Legend overlay */}
        <div className="absolute right-3 top-3 z-[1000]">
          <Legend />
        </div>

        <MapContainer
          center={[20, 0]}
          zoom={2}
          style={{ height: 480, width: "100%", borderRadius: "0.75rem" }}
          scrollWheelZoom
          preferCanvas
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />

          <FitToMarkers points={positions} />

          {markers.map((m) => {
            const selected = selectedCC?.toUpperCase() === m.cc;
            const r = radiusForCount(m.n);
            const col = colorForAvg(m.avg);
            const opts: PathOptions = {
              color: selected ? "#111827" : col,
              weight: selected ? 3 : 1.5,
              fillColor: col,
              fillOpacity: 0.8,
            };
            return (
              <CircleMarker
                key={m.cc}
                center={[m.lat, m.lng]}
                radius={selected ? r * 1.1 : r}
                pathOptions={opts}
                eventHandlers={{
                  click: () =>
                    onSelectCountry?.(selected ? null : (m.cc as string)),
                }}
              >
                <Tooltip offset={[0, -6]} opacity={1}>
                  <div style={{ minWidth: 160 }}>
                    <div style={{ fontWeight: 700 }}>{m.cc}</div>
                    <div>Posts: {m.n}</div>
                    <div>Avg sentiment: {m.avg.toFixed(2)}</div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                      Click to {selected ? "clear filter" : "filter"}
                    </div>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-2 bg-white/95 border border-gray-200 rounded-md px-2 py-1 shadow-sm text-xs">
      <span
        className="inline-block w-3 h-3 rounded-full border"
        style={{ background: "hsl(0 80% 50%)" }}
      />
      <span>Neg</span>
      <span
        className="inline-block w-3 h-3 rounded-full border"
        style={{ background: "hsl(60 80% 50%)" }}
      />
      <span>Neutral</span>
      <span
        className="inline-block w-3 h-3 rounded-full border"
        style={{ background: "hsl(120 80% 50%)" }}
      />
      <span>Pos</span>
      <span className="ml-1 text-gray-500">• Size = #posts</span>
    </div>
  );
}
