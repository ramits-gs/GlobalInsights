export default function SummaryCards({
  keyword, counts, total
}: { keyword:string; counts:{pos:number;neu:number;neg:number}; total:number }) {
  const pct = (k:keyof typeof counts)=> total ? Math.round((counts[k]*100)/total) : 0;
  return (
    <div className="grid md:grid-cols-4 gap-4">
      <div className="bg-white p-4 rounded shadow">
        <div className="text-sm text-gray-500">Keyword</div>
        <div className="text-xl font-semibold">{keyword}</div>
        <div className="text-xs text-gray-500 mt-1">{total} posts</div>
      </div>
      <Card label="Positive" value={`${pct("pos")}%`} color="text-green-600"/>
      <Card label="Neutral" value={`${pct("neu")}%`} color="text-gray-700"/>
      <Card label="Negative" value={`${pct("neg")}%`} color="text-red-600"/>
    </div>
  );
}

function Card({label, value, color}:{label:string; value:string; color:string}) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}
