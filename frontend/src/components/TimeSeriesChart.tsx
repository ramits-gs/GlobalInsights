import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function TimeSeriesChart({ points }:{ points:{t:string;avg:number}[] }) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="font-semibold mb-2">Sentiment Over Time</div>
      <div style={{height:260}}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="t" hide />
            <YAxis domain={[-1,1]} />
            <Tooltip />
            <Line type="monotone" dataKey="avg" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
