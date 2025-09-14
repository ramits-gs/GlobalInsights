import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function SentimentDonut({ counts }:{ counts:Record<string,number> }) {
  const data = [
    { name: "Positive", value: counts.pos||0 },
    { name: "Neutral", value: counts.neu||0 },
    { name: "Negative", value: counts.neg||0 },
  ];
  const COLORS = ["#16a34a","#6b7280","#dc2626"];
  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="font-semibold mb-2">Overall Sentiment</div>
      <div style={{height:260}}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} outerRadius={100} dataKey="value" label>
              {data.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
            </Pie>
            <Tooltip /><Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
