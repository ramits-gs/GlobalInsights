// frontend/src/App.tsx
import { useState } from "react";
import SentimentMap from "./components/SentimentMap";
import SummaryCards from "./components/SummaryCards";
import SentimentDonut from "./components/SentimentDonut";
import TimeSeriesChart from "./components/TimeSeriesChart";
import TopCountriesBar from "./components/TopCountriesBar";

const API_BASE = "http://localhost:8000"; // backend

function App() {
  const [query, setQuery] = useState("electric cars");
  const [search, setSearch] = useState<any>(null);
  const [geo, setGeo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCC, setSelectedCC] = useState<string | null>(null);

  async function runSearch(q: string, useSample = false) {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/search?q=${encodeURIComponent(q)}&use_sample=${useSample}`
      );
      const data = await res.json();
      setSearch(data);

      const geoRes = await fetch(`${API_BASE}/api/geo?q=${encodeURIComponent(q)}`);
      const geoData = await geoRes.json();
      setGeo(geoData);

      setSelectedCC(null); // reset country filter
    } catch (err) {
      console.error("search error", err);
    } finally {
      setLoading(false);
    }
  }

  // Filter posts if a country is selected
  const filteredPosts = (() => {
    if (!search?.posts) return [];
    if (!selectedCC) return search.posts;
    return search.posts.filter(
      (p: any) => (p.country_code || "").toUpperCase() === selectedCC
    );
  })();

  // Sentiment counts for donut + cards
  const counts = filteredPosts.reduce(
    (acc: any, p: any) => {
      const k =
        p.sentiment_label.startsWith("pos")
          ? "pos"
          : p.sentiment_label.startsWith("neg")
          ? "neg"
          : "neu";
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    },
    { pos: 0, neu: 0, neg: 0 }
  );

  // Time series chart data
  const series = (() => {
    const m = new Map<string, { sum: number; n: number }>();
    filteredPosts.forEach((p: any) => {
      const d = new Date(p.created_at);
      const bucket = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        d.getHours(),
        0,
        0
      );
      const k = bucket.toISOString();
      const v = m.get(k) || { sum: 0, n: 0 };
      v.sum += p.sentiment_score;
      v.n += 1;
      m.set(k, v);
    });
    return [...m.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([t, v]) => ({ t, avg: v.sum / v.n }));
  })();

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto p-5 flex items-center gap-4">
          <h1 className="text-3xl font-extrabold">GlobalInsights</h1>
          <div className="text-gray-500">Keyword → Social Sentiment</div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-5 space-y-6">
        {/* Search bar + buttons */}
        <div className="bg-white p-4 rounded shadow flex gap-2">
          <input
            className="flex-1 border rounded px-3 py-2"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topic (e.g. electric cars)"
          />
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            onClick={() => runSearch(query, false)}
            disabled={loading}
          >
            Search
          </button>
          <button
            className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded"
            onClick={() => runSearch("electric cars", true)}
            disabled={loading}
          >
            Use sample
          </button>
        </div>

        {/* Visualizations */}
        {search && (
          <>
            <SummaryCards
              keyword={search.keyword}
              counts={counts}
              total={filteredPosts.length}
            />

            <div className="grid md:grid-cols-2 gap-6">
              <SentimentDonut counts={counts} />
              <TimeSeriesChart points={series} />
            </div>

            {geo?.countries?.length ? (
              <TopCountriesBar countries={geo.countries} />
            ) : null}

            <SentimentMap
              data={geo?.countries ?? []}
              selectedCC={selectedCC}
              onSelectCountry={setSelectedCC}
            />

            {/* Optional: show selected country */}
            {selectedCC && (
              <div className="bg-white p-4 rounded shadow">
                <div>
                  Filtering for country:{" "}
                  <b className="text-blue-600">{selectedCC}</b>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
