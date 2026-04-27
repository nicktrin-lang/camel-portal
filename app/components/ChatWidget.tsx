"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Where is my driver?",
  "What is my booking status?",
  "How does the fuel deposit work?",
  "How do I cancel a booking?",
];

function WhatsAppLink({ text }: { text: string }) {
  // Detect phone numbers in assistant messages and make them WhatsApp links
  const parts = text.split(/(\+?[\d\s\-()]{9,15})/g);
  return (
    <>
      {parts.map((part, i) => {
        const digits = part.replace(/\D/g, "");
        if (digits.length >= 9 && digits.length <= 15 && /\d/.test(part)) {
          return (
            <a
              key={i}
              href={`https://wa.me/${digits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 bg-green-500 text-white px-2 py-0.5 text-xs font-black hover:bg-green-600 transition-colors mx-0.5"
            >
              💬 {part.trim()}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export default function ChatWidget({
  getToken,
  apiPath = "/api/chat",
}: {
  getToken: () => Promise<string | null>;
  apiPath?: string;
}) {
  const [open, setOpen]         = useState(false);
  const [msgs, setMsgs]         = useState<Msg[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [unread, setUnread]     = useState(0);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    setInput("");
    setError(null);

    const newMsgs: Msg[] = [...msgs, { role: "user", content }];
    setMsgs(newMsgs);
    setLoading(true);

    try {
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(apiPath, {
        method: "POST",
        headers,
        body: JSON.stringify({ messages: newMsgs }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || "Failed to get a response.");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      setMsgs(m => [...m, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMsgs(m => {
          const updated = [...m];
          updated[updated.length - 1] = { role: "assistant", content: assistantText };
          return updated;
        });
      }

      if (!open) setUnread(u => u + 1);
    } catch (e: any) {
      setError(e?.message || "Something went wrong. Please try again.");
      setMsgs(m => m.slice(0, -1)); // remove empty assistant msg if error
    } finally {
      setLoading(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  }

  const isEmpty = msgs.length === 0;

  return (
    <>
      {/* Floating bubble */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-[9999] flex h-14 w-14 items-center justify-center bg-[#ff7a00] text-white shadow-lg hover:opacity-90 transition-opacity"
        aria-label="Open help chat"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        ) : (
          <>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-black rounded-full">{unread}</span>
            )}
          </>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-[9998] flex w-[360px] max-w-[calc(100vw-24px)] flex-col bg-white shadow-2xl border border-black/10"
          style={{ height: "520px" }}>

          {/* Header */}
          <div className="flex items-center gap-3 bg-black px-4 py-3 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center bg-[#ff7a00]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-black text-white leading-none">Camel Help</p>
              <p className="text-xs text-white/50 mt-0.5">AI assistant · usually instant</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {isEmpty && (
              <div className="space-y-3">
                <div className="bg-[#f0f0f0] px-4 py-3 text-sm font-semibold text-black max-w-[85%]">
                  👋 Hi! I'm Camel Help. I can answer questions about your bookings, driver details, fuel deposits, and more. How can I help?
                </div>
                <div className="space-y-2 pt-1">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="block w-full text-left border border-black/10 px-3 py-2 text-xs font-bold text-black hover:bg-[#f0f0f0] transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-4 py-3 text-sm font-medium leading-relaxed ${
                  m.role === "user"
                    ? "bg-[#ff7a00] text-white font-semibold"
                    : "bg-[#f0f0f0] text-black"
                }`}>
                  {m.role === "assistant"
                    ? <WhatsAppLink text={m.content || (loading && i === msgs.length - 1 ? "▍" : "…")} />
                    : m.content}
                  {m.role === "assistant" && loading && i === msgs.length - 1 && m.content === "" && (
                    <span className="inline-block w-2 h-4 bg-black/40 animate-pulse" />
                  )}
                </div>
              </div>
            ))}

            {error && (
              <div className="bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">{error}</div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-black/10 p-3 shrink-0 flex gap-2">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              disabled={loading}
              placeholder="Type a message…"
              className="flex-1 resize-none bg-[#f0f0f0] px-3 py-2.5 text-sm font-medium text-black outline-none placeholder:text-black/30 disabled:opacity-50"
              style={{ maxHeight: "80px" }}
            />
            <button
              type="button"
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              className="shrink-0 bg-[#ff7a00] px-4 py-2 text-sm font-black text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {loading ? (
                <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : "→"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}