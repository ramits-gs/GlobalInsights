export default function SearchBar({
  onSearch, onSample, loading
}: { onSearch:(q:string)=>void; onSample:()=>void; loading:boolean }) {
  return (
    <div className="bg-white p-4 rounded shadow flex gap-2">
      <input
        id="q"
        className="flex-1 border rounded px-3 py-2"
        placeholder="Search keyword… (e.g., electric cars)"
        onKeyDown={(e)=>{ if(e.key==='Enter'){ onSearch((document.getElementById('q') as HTMLInputElement).value); } }}
      />
      <button
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={()=>onSearch((document.getElementById('q') as HTMLInputElement).value)}
      >
        {loading ? "Searching…" : "Search"}
      </button>
      <button className="bg-gray-200 px-3 py-2 rounded" onClick={onSample}>Use sample</button>
    </div>
  );
}
