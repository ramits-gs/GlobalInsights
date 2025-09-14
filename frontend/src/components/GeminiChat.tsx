import { useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function GeminiChat({
  apiBase,
  keyword,
  hours,
}: {
  apiBase: string;
  keyword: string;
  hours: number;
}) {
  const [history, setHistory] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const msg = input.trim();
    if (!msg || loading) return;
    setLoading(true);
    setError(null);
    setHistory((h) => [...h, { role: "user", content: msg }]);
    setInput("");

    try {
      const r = await fetch(
        `${apiBase}/api/chat?q=${encodeURIComponent(keyword)}&hours=${hours}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: msg, history }),
        }
      );
      const data = await r.json();
      const reply = data?.reply || "No response.";
      setHistory((h) => [...h, { role: "assistant", content: reply }]);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Chat failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white p-4 rounded shadow space-y-3">
      <div className="font-semibold">Ask Gemini about these results</div>

      <div className="max-h-64 overflow-y-auto space-y-2 border rounded p-3 bg-gray-50">
        {history.length === 0 ? (
          <div className="text-sm text-gray-500">
            Ask things like: “Why is sentiment higher in DE than US?” or
            “Summarize key concerns by country.”
          </div>
        ) : (
          history.map((m, i) => (
            <div
              key={i}
              className={`text-sm ${
                m.role === "user" ? "text-blue-800" : "text-gray-900"
              }`}
            >
              <span className="font-semibold mr-1">
                {m.role === "user" ? "You" : "Gemini"}:
              </span>
              {m.content}
            </div>
          ))
        )}
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2"
          placeholder="Type a question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
          onClick={send}
          disabled={loading}
        >
          {loading ? "Asking…" : "Ask"}
        </button>
      </div>
    </div>
  );
}
