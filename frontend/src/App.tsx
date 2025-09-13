import { useState } from "react";
import SearchBar from "./components/SearchBar";
import SummaryCards from "./components/SummaryCards";
import SentimentDonut from "./components/SentimentDonut";
import TimeSeriesChart from "./components/TimeSeriesChart";
import PostList from "./components/PostList";
import SentimentMap from "./components/SentimentMap";

type Post = {
  source:string; author:string; text:string;
  created_at:string; sentiment_label:string; sentiment_score:number;
  country_code?: string|null;
}
type SearchResponse = { keyword:string; count:number; posts:Post[] };
type GeoResponse = { keyword:string; hours:number; countries:{cc:string;n:number;avg:number}[] };

const API_BASE = "http://localhost:8000"; // change if your backend port differs

export default function App() {
  const [search, setSearch] = useState<SearchResponse | null>(null);
  const [geo, setGeo] = useState<GeoResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function runSearch(q: string, hours = 24, useSample = false) {
    if (!q.trim()) return;
    setLoading(true);
    const s = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(q)}&hours=${hours}&use_sample=${useSample}`).then(r=>r.json());
    setSearch(s);
    const g = await fetch(`${API_BASE}/api/geo?q=${encodeURIComponent(q)}&hours=${hours}`).then(r=>r.json());
    setGeo(g);
    setLoading(false);
  }

  const counts = (() => {
    const c = { pos:0, neu:0, neg:0 };
    (search?.posts||[]).forEach(p=>{
      if (p.sentiment_label.startsWith("pos")) c.pos++;
      else if (p.sentiment_label.startsWith("neg")) c.neg++;
      else c.neu++;
    });
    return c;
  })();

  const series = (() => {
    const m = new Map<string, {sum:number;n:number}>();
    (search?.posts||[]).forEach(p=>{
      const d = new Date(p.created_at);
      const bucket = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), Math.floor(d.getMinutes()/30)*30);
      const key = bucket.toISOString();
      const obj = m.get(key) || {sum:0, n:0};
      obj.sum += p.sentiment_score; obj.n += 1;
      m.set(key, obj);
    });
    return Array.from(m.entries())
      .sort((a,b)=>a[0].localeCompare(b[0]))
      .map(([t,v])=>({ t, avg: v.sum / v.n }));
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto p-5 flex items-center gap-4">
          <h1 className="text-2xl font-bold">GlobalInsights</h1>
          <div className="text-gray-500">Keyword → Social Sentiment</div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-5 space-y-6">
        <SearchBar
          loading={loading}
          onSearch={(q)=>runSearch(q, 24, false)}
          onSample={()=>runSearch("electric cars", 24, true)}
        />

        {search && (
          <>
            <SummaryCards keyword={search.keyword} counts={counts} total={search.count}/>
            <div className="grid md:grid-cols-2 gap-6">
              <SentimentDonut counts={counts}/>
              <TimeSeriesChart points={series}/>
            </div>
            {geo?.countries?.length ? <SentimentMap data={geo.countries}/> : null}
            <PostList posts={search.posts}/>
          </>
        )}

        {!search && !loading && (
          <p className="text-gray-600">
            Try a search like <b>“heat pump”</b> or click <b>Use sample</b>.
          </p>
        )}
      </main>
    </div>
  );
}
