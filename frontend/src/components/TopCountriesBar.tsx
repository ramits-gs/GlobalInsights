// frontend/src/components/TopCountriesBar.tsx
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { colorForAvg } from "../utils/colors"; // ✅ shared function

type CountryRow = { cc: string; n: number; avg: number };

export default function TopCountriesBar({
  countries,
}: {
  countries: CountryRow[] | undefined;
}) {
  const data = Array.isArray(countries) ? countries : [];
  const top = [...data].sort((a, b) => b.n - a.n).slice(0, 10);

  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="font-semibold mb-2">Top Countries (by posts)</div>

      {top.length === 0 ? (
        <div className="text-sm text-gray-500">No country data.</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={top} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="cc" />
            <YAxis allowDecimals={false} />
            <Tooltip
              formatter={(value: any, name: any) => {
                if (name === "n") return [`${value} posts`, "Posts"];
                if (name === "avg") return [Number(value).toFixed(2), "Avg sentiment"];
                return [value, name];
              }}
            />
            <Bar dataKey="n" name="Posts" isAnimationActive>
              {top.map((row, i) => (
                <Cell key={`cell-${i}`} fill={colorForAvg(row.avg)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
