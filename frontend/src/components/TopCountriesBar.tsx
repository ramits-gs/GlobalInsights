import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function TopCountriesBar({ countries }:{ countries:{cc:string;n:number;avg:number}[] }) {
  const data = [...countries].sort((a,b)=>b.n-a.n).slice(0,8)
    .map(c=>({ cc:c.cc, n:c.n, avg: Number(c.avg.toFixed(2)) }));
  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="font-semibold mb-2">Top Countries (by posts)</div>
      <div style={{height:260}}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="cc" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="n" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
