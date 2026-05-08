"use client";

import { useState, useRef } from "react";

type Result = {
  display_name: string;
  lat: string;
  lon: string;
};

export default function LocationSearch({
  onSelect,
}: {
  onSelect: (data: { lat: number; lng: number; label: string }) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    function handleSearch(value: string) {
      setQuery(value);
      setResults([]);
      if (value.trim().length < 3) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(async () => {
        setSearching(true);
        try {
          const res = await fetch(
            `/api/maps/search?q=${encodeURIComponent(value.trim())}`,
            { method: "GET", cache: "no-store" }
          );
          const json = await res.json().catch(() => null);
          setResults((json?.data || []) as Result[]);
        } catch {
          // silent
        } finally {
          setSearching(false);
        }
      }, 400);
    }

  return (

    <div
      style={{
        position: "absolute",
        top: "80px",
        right: "16px",
        width: "340px",
        zIndex: 9999,
        pointerEvents: "auto",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Search input box */}
      <div
        style={{
          background: "rgba(255,255,255,0.15)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          padding: "10px 12px",
          borderRadius: "999px",
          border: "1px solid rgba(255,255,255,0.32)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        }}
      >
        {/* Search icon */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.85)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search pickup location..."
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: "0.95rem",
            fontWeight: 600,
            color: "#ffffff",
            caretColor: "#ffffff",
          }}
        />

        {searching && (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="2.5"
            style={{ flexShrink: 0, animation: "spin 1s linear infinite" }}
          >
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        )}
      </div>

      {/* Results dropdown */}
      {results.length > 0 && (
        <div
          style={{
            background: "rgba(255,255,255,0.97)",
            backdropFilter: "blur(12px)",
            borderRadius: "16px",
            marginTop: "8px",
            boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
            border: "1px solid rgba(0,0,0,0.06)",
            overflowY: "auto",
            maxHeight: "240px",
            pointerEvents: "auto",
          }}
        >
          {results.map((r, i) => (
            <div
              key={i}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect({
                  lat: parseFloat(r.lat),
                  lng: parseFloat(r.lon),
                  label: r.display_name,
                });
                setQuery(r.display_name);
                setResults([]);
              }}
              style={{
                padding: "11px 16px",
                fontSize: "0.88rem",
                fontWeight: 500,
                color: "#1a1a1a",
                cursor: "pointer",
                borderBottom: i < results.length - 1 ? "1px solid #f0f0f0" : "none",
                pointerEvents: "auto",
                lineHeight: 1.4,
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLDivElement).style.background = "#f5f7ff")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLDivElement).style.background = "transparent")
              }
            >
              {r.display_name}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        ::placeholder { color: rgba(255,255,255,0.65) !important; font-weight: 500; }
      `}</style>
    </div>
  );
}