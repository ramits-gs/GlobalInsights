// frontend/src/App.tsx
import { useState } from "react";
import SentimentMap from "./components/SentimentMap";
// Comment out these imports if you haven’t created the files yet.
import SummaryCards from "./components/SummaryCards";
import SentimentDonut from "./components/SentimentDonut";
import TimeSeriesChart from "./components/TimeSeriesChart";
import TopCountriesBar from "./components/TopCountriesBar";
import GeminiChat from "./components/GeminiChat";

const API_BASE = "http://localhost:8000";

type Engine = "auto" | "vader" | "gemini";

export default function App() {
  const [query, setQuery] = useState("electric cars");
  const [search, setSearch] = useState<any>(null);
  const [geo, setGeo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCC, setSelectedCC] = useState<string | null>(null);

  // Controls
  const [hours, setHours] = useState<number>(168); // 7d default so you see more data
  const [engine, setEngine] = useState<Engine>("auto");

  // Insights state
  const [insights, setInsights] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  async function fetchInsights(q: string) {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const r = await fetch(
        `${API_BASE}/api/insights?q=${encodeURIComponent(q)}&hours=${hours}`
      );
      if (!r.ok) {
        const t = await r.json().catch(() => ({ detail: "Failed" }));
        throw new Error(t.detail || "Failed to generate insights");
      }
      const data = await r.json();
      setInsights(data);
    } catch (e: any) {
      console.error(e);
      setInsightsError(e?.message || "Insights unavailable.");
      setInsights(null);
    } finally {
      setInsightsLoading(false);
    }
  }

  async function runSearch(q: string, useSample = false) {
    if (!q.trim()) return;
    setLoading(true);
    setInsights(null);
    setInsightsError(null);

    try {
      const params = new URLSearchParams({
        q,
        hours: String(hours),
        engine, // auto|vader|gemini
      });
      if (useSample) params.append("use_sample", "true");

      // Fetch search + geo in parallel
      const [s, g] = await Promise.all([
        fetch(`${API_BASE}/api/search?${params}`).then((r) => r.json()),
        fetch(`${API_BASE}/api/geo?${params}`).then((r) => r.json()),
      ]);

      setSearch(s);
      setGeo(g);
      setSelectedCC(null);

      // Kick off insights only if we actually have posts
      const count =
        (s?.count as number) ??
        (Array.isArray(s?.posts) ? (s.posts as any[]).length : 0);
      if (count && count > 0) {
        // fire and forget; insights has its own loading spinner
        fetchInsights(q);
      } else {
        setInsights(null);
      }
    } catch (err) {
      console.error("search error", err);
      alert("Could not reach backend. Is it running on port 8000?");
    } finally {
      setLoading(false);
    }
  }

  // Country filter
  const filteredPosts = (() => {
    if (!search?.posts) return [];
    if (!selectedCC) return search.posts;
    return search.posts.filter(
      (p: any) => (p.country_code || "").toUpperCase() === selectedCC
    );
  })();

  // Donut + cards counts
  const counts = filteredPosts.reduce(
    (acc: any, p: any) => {
      const k = p.sentiment_label.startsWith("pos")
        ? "pos"
        : p.sentiment_label.startsWith("neg")
        ? "neg"
        : "neu";
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    },
    { pos: 0, neu: 0, neg: 0 }
  );

  // Time series (avg sentiment per hour)
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
        {/* Controls */}
        <div className="bg-white p-4 rounded shadow flex flex-col md:flex-row md:items-center gap-3">
          <input
            className="flex-1 border rounded px-3 py-2"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topic (e.g. electric cars)"
          />

          {/* Time window */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Window</label>
            <select
              className="border rounded px-2 py-2"
              value={hours}
              onChange={(e) => setHours(parseInt(e.target.value, 10))}
            >
              <option value={24}>Last 24h</option>
              <option value={72}>Last 72h</option>
              <option value={168}>Last 7d</option>
              <option value={720}>Last 30d</option>
            </select>
          </div>

          {/* Sentiment engine */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Engine</label>
            <select
              className="border rounded px-2 py-2"
              value={engine}
              onChange={(e) => setEngine(e.target.value as Engine)}
            >
              <option value="auto">Auto</option>
              <option value="vader">VADER</option>
              <option value="gemini">Gemini</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              onClick={() => runSearch(query, false)}
              disabled={loading}
            >
              {loading ? "Searching…" : "Search"}
            </button>
            <button
              className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded"
              onClick={() => runSearch(query || "electric cars", true)}
              disabled={loading}
            >
              Use sample
            </button>
          </div>
        </div>

        {/* Status line */}
        {search && (
          <div className="text-sm text-gray-600">
            Engine: <b>{search.engine_used ?? engine}</b> • Window:{" "}
            <b>last {hours}h</b> • Returned:{" "}
            <b>{search.count ?? (search.posts?.length || 0)}</b> posts
            {selectedCC ? (
              <>
                {" "}
                • Filter: <b>{selectedCC}</b>
              </>
            ) : null}
          </div>
        )}

        {/* Visualizations */}
        {search && (
          <>
            {/* KPI cards */}
            <SummaryCards
              keyword={search.keyword}
              counts={counts}
              total={filteredPosts.length}
            />

            {/* Donut + time series */}
            <div className="grid md:grid-cols-2 gap-6">
              <SentimentDonut counts={counts} />
              <TimeSeriesChart points={series} />
            </div>

            {/* Top countries by posts */}
            {geo?.countries?.length ? (
              <TopCountriesBar countries={geo.countries} />
            ) : null}

            {/* Map (click to filter) */}
            <SentimentMap
              data={geo?.countries ?? []}
              selectedCC={selectedCC}
              onSelectCountry={setSelectedCC}
            />

            {/* Gemini Insights */}
            <div className="bg-white p-4 rounded shadow space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Gemini Insights</div>
                {insightsLoading && (
                  <div className="text-xs text-gray-500">Generating…</div>
                )}
              </div>
              {insightsError && (
                <div className="text-sm text-red-600">{insightsError}</div>
              )}
              {insights && (
                <>
                  <p className="text-gray-800">{insights.summary}</p>
                  {insights.themes?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {insights.themes.map((t: string, i: number) => (
                        <span
                          key={i}
                          className="text-xs bg-gray-100 px-2 py-1 rounded"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {insights.aspects && (
                    <div className="text-sm text-gray-700">
                      Aspects — Price:{" "}
                      {Number(insights.aspects.price).toFixed(2)}, Quality:{" "}
                      {Number(insights.aspects.quality).toFixed(2)}, Service:{" "}
                      {Number(insights.aspects.service).toFixed(2)}
                    </div>
                  )}
                  {insights.quotes?.length ? (
                    <ul className="text-sm list-disc pl-5 space-y-1">
                      {insights.quotes.slice(0, 5).map((q: any, i: number) => (
                        <li key={i}>
                          “{q.text}”{" "}
                          <span className="text-xs text-gray-500">
                            ({q.sentiment})
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              )}
            </div>

            {search && (
              <GeminiChat
                apiBase={API_BASE}
                keyword={search.keyword}
                hours={hours}
              />
            )}

            {/* Recent posts list */}
            {filteredPosts.length ? (
              <div className="bg-white p-4 rounded shadow">
                <div className="font-semibold mb-2">
                  Recent posts {selectedCC ? `for ${selectedCC}` : ""}
                </div>
                <ul className="space-y-2 max-h-80 overflow-y-auto">
                  {filteredPosts.map((p: any) => (
                    <li key={p.id} className="border rounded p-2">
                      <div className="text-xs text-gray-500">
                        {p.source} • {new Date(p.created_at).toLocaleString()}
                        {p.country_code ? ` • ${p.country_code}` : ""}
                      </div>
                      <div className="mt-1">{p.text}</div>
                      <div
                        className={`mt-1 text-xs font-semibold ${
                          p.sentiment_label.startsWith("pos")
                            ? "text-green-600"
                            : p.sentiment_label.startsWith("neg")
                            ? "text-red-600"
                            : "text-gray-600"
                        }`}
                      >
                        {p.sentiment_label.toUpperCase()} (
                        {p.sentiment_score?.toFixed?.(2)})
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
