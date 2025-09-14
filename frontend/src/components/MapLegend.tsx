export default function MapLegend() {
  return (
    <div className="bg-white/90 backdrop-blur px-3 py-2 rounded shadow text-xs inline-flex items-center gap-2">
      <span className="inline-block w-3 h-3 rounded" style={{ background: "#dc2626" }} /> Negative
      <span className="inline-block w-3 h-3 rounded" style={{ background: "#9ca3af" }} /> Neutral
      <span className="inline-block w-3 h-3 rounded" style={{ background: "#16a34a" }} /> Positive
    </div>
  );
}
