export default function SummaryCards({
  keyword, counts, total
}: { keyword:string; counts:{pos:number;neu:number;neg:number}; total:number }) {
  const pct = (n:number)=> total ? Math.round((n*100)/total) : 0;
  return (
    <div className="grid md:grid-cols-4 gap-4">
      <Card title="Keyword">
        <div className="text-xl font-semibold">{keyword}</div>
        <div className="text-xs text-gray-500">{total} posts</div>
      </Card>
      <Card title="Positive"><Value v={`${pct(counts.pos)}%`} cls="text-green-600" /></Card>
      <Card title="Neutral"><Value v={`${pct(counts.neu)}%`} cls="text-gray-700" /></Card>
      <Card title="Negative"><Value v={`${pct(counts.neg)}%`} cls="text-red-600" /></Card>
    </div>
  );
}
function Card({title, children}:{title:string;children:any}) {
  return <div className="bg-white p-4 rounded shadow"><div className="text-sm text-gray-500">{title}</div>{children}</div>;
}
function Value({v, cls}:{v:string; cls?:string}) {
  return <div className={`text-2xl font-semibold ${cls||""}`}>{v}</div>;
}
