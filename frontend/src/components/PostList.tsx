export default function PostList({ posts }:{ posts:any[] }) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="font-semibold mb-2">Representative Posts</div>
      <div className="space-y-3 max-h-96 overflow-auto">
        {posts.map((p,i)=>(
          <div key={i} className="border rounded p-3">
            <div className="text-xs text-gray-500">
              {p.source} • {new Date(p.created_at).toLocaleString()}
            </div>
            <div className="mt-1">{p.text}</div>
            <div className={`mt-2 text-xs font-semibold ${
              p.sentiment_label.startsWith('pos')?'text-green-600':
              p.sentiment_label.startsWith('neg')?'text-red-600':'text-gray-600'
            }`}>
              {p.sentiment_label.toUpperCase()} ({p.sentiment_score.toFixed(2)})
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
