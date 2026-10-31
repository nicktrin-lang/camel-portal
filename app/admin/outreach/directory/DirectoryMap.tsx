"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";

// Map view of one country in the Car Hire Directory. Load with next/dynamic (ssr: false):
// Leaflet touches window on import. Places are drawn as canvas circle markers, which stay
// smooth at ~10,000 points without a clustering library. Camel's partners sit on top.

// [id, lat, lng, status, name, town, phone, website, email, is_chain]
export type MapPoint = [string, number, number, string, string, string | null, string | null, string | null, string | null, boolean];
export type MapPartner = { name: string; address: string | null; lat: number; lng: number; live: boolean };

// Drawn in this order, so the useful colours land on top.
const STATUSES: { key: string; label: string; color: string }[] = [
  { key: "pending",    label: "Not scanned",      color: "#d4d4d4" },
  { key: "no_website", label: "No website",       color: "#a3a3a3" },
  { key: "failed",     label: "Site didn't load", color: "#a3a3a3" },
  { key: "none",       label: "No email on site", color: "#525252" },
  { key: "email",      label: "Has email",        color: "#ff7a00" },
  { key: "added",      label: "In outreach",      color: "#16a34a" },
];

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function websiteHref(w: string) {
  return /^https?:\/\//i.test(w) ? w : `https://${w}`;
}

// Bounds from the 1st–99th percentile, so one mis-geocoded place doesn't zoom out to the world.
function trimmedBounds(points: MapPoint[]): L.LatLngBounds | null {
  if (!points.length) return null;
  const lats = points.map((p) => p[1]).sort((a, b) => a - b);
  const lngs = points.map((p) => p[2]).sort((a, b) => a - b);
  const at = (arr: number[], q: number) => arr[Math.min(arr.length - 1, Math.max(0, Math.floor(q * (arr.length - 1))))];
  const lo = points.length > 50 ? 0.01 : 0, hi = points.length > 50 ? 0.99 : 1;
  return L.latLngBounds([at(lats, lo), at(lngs, lo)], [at(lats, hi), at(lngs, hi)]);
}

function popupHtml(p: MapPoint) {
  const [id, , , status, name, town, phone, website, email, isChain] = p;
  const label = STATUSES.find((s) => s.key === status)?.label ?? status;
  const color = STATUSES.find((s) => s.key === status)?.color ?? "#999";
  return `<div style="font-family:sans-serif;min-width:200px;max-width:260px">
    <div style="font-weight:900;font-size:13px">${esc(name)}</div>
    ${town ? `<div style="font-size:11px;color:#555;margin-top:2px">${esc(town)}</div>` : ""}
    ${isChain ? `<div style="font-size:10px;font-weight:900;color:#777;text-transform:uppercase;margin-top:2px">Chain</div>` : ""}
    <div style="font-size:12px;margin-top:6px;line-height:1.5">
      ${phone ? `<div><a href="tel:${esc(phone)}">${esc(phone)}</a></div>` : ""}
      ${website ? `<div><a href="${esc(websiteHref(website))}" target="_blank" rel="noopener noreferrer" style="color:#ff7a00;word-break:break-all">${esc(website.replace(/^https?:\/\//i, "").replace(/\/$/, ""))}</a></div>` : ""}
      ${email ? `<div style="word-break:break-all;font-weight:700">${esc(email)}</div>` : ""}
    </div>
    <div style="margin-top:6px;display:inline-block;padding:1px 6px;font-size:10px;font-weight:900;text-transform:uppercase;border:1px solid ${color};color:${status === "pending" ? "#777" : color}">${esc(label)}</div>
    ${status === "email" && !isChain
      ? `<div style="margin-top:8px"><button data-add="${esc(id)}" style="background:#000;color:#fff;font-weight:900;font-size:12px;padding:5px 10px;border:0;cursor:pointer">Add to outreach</button></div>`
      : ""}
  </div>`;
}

const partnerIcon = (live: boolean) => L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;background:${live ? "#000" : "#fff"};border:3px solid #000;transform:rotate(45deg);box-shadow:0 1px 4px rgba(0,0,0,.5)"></div>`,
  iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -10],
});

type Props = {
  country: string;
  points: MapPoint[];
  partners: MapPartner[];
  onAdd: (id: string) => Promise<boolean>;
};

export default function DirectoryMap({ country, points, partners, onAdd }: Props) {
  const el = useRef<HTMLDivElement>(null);
  // The map and its layers live in state, created and torn down together, so a remount
  // (React dev mode mounts twice) never draws onto a removed map.
  const [ctx, setCtx] = useState<{ map: L.Map; places: L.LayerGroup; partners: L.LayerGroup; renderer: L.Canvas } | null>(null);
  const fittedFor = useRef<string>("");
  const onAddRef = useRef(onAdd);
  onAddRef.current = onAdd;
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [showPartners, setShowPartners] = useState(true);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of points) c[p[3]] = (c[p[3]] || 0) + 1;
    return c;
  }, [points]);

  // Create the map once.
  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { preferCanvas: true, worldCopyJump: true }).setView([40, -3], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · places: Overture Maps',
      maxZoom: 19,
    }).addTo(m);
    const renderer = L.canvas({ padding: 0.5 });
    setCtx({ map: m, places: L.layerGroup().addTo(m), partners: L.layerGroup().addTo(m), renderer });

    // "Add to outreach" buttons live inside popup HTML, so listen on the container.
    const container = el.current;
    const onClick = async (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-add]");
      if (!btn || btn.disabled) return;
      btn.disabled = true;
      btn.textContent = "Adding…";
      const ok = await onAddRef.current(btn.dataset.add!);
      btn.textContent = ok ? "Added ✓" : "Failed — try again";
      if (!ok) btn.disabled = false;
    };
    container.addEventListener("click", onClick);
    return () => {
      container.removeEventListener("click", onClick);
      m.remove();
      setCtx(null);
      fittedFor.current = "";
    };
  }, []);

  // Redraw places when the data or the legend toggles change.
  useEffect(() => {
    if (!ctx) return;
    const { places: layer, renderer } = ctx;
    layer.clearLayers();
    for (const s of STATUSES) {
      if (hidden.has(s.key)) continue;
      const big = s.key === "email" || s.key === "added";
      for (const p of points) {
        if (p[3] !== s.key) continue;
        L.circleMarker([p[1], p[2]], {
          renderer, radius: big ? 5 : 4, weight: 1, color: "#fff", fillColor: s.color, fillOpacity: 0.9,
        }).bindPopup(() => popupHtml(p)).addTo(layer);
      }
    }
  }, [ctx, points, hidden]);

  useEffect(() => {
    if (!ctx) return;
    const layer = ctx.partners;
    layer.clearLayers();
    if (!showPartners) return;
    for (const p of partners) {
      L.marker([p.lat, p.lng], { icon: partnerIcon(p.live), zIndexOffset: 1000 })
        .bindPopup(`<div style="font-family:sans-serif"><div style="font-weight:900;font-size:13px">${esc(p.name)}</div>${p.address ? `<div style="font-size:11px;color:#555;margin-top:2px">${esc(p.address)}</div>` : ""}<div style="margin-top:6px;font-size:10px;font-weight:900;text-transform:uppercase">Camel partner · ${p.live ? "live" : "not live yet"}</div></div>`)
        .addTo(layer);
    }
  }, [ctx, partners, showPartners]);

  // Zoom to the country once per country (not after every add).
  useEffect(() => {
    if (!ctx || !points.length || fittedFor.current === country) return;
    const b = trimmedBounds(points);
    if (b) ctx.map.fitBounds(b, { padding: [30, 30], maxZoom: 12 });
    fittedFor.current = country;
  }, [ctx, country, points]);

  const toggle = (key: string) => setHidden((h) => {
    const next = new Set(h);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  return (
    <div className="relative overflow-hidden border border-black/10" style={{ height: "70vh", minHeight: 420, zIndex: 0, position: "relative" }}>
      <div ref={el} style={{ height: "100%", width: "100%" }} />
      <div className="absolute bottom-4 left-4 z-[1000] flex flex-col gap-1 border border-black/10 bg-white/95 px-3 py-2 shadow-sm">
        {[...STATUSES].reverse().map((s) => (
          <label key={s.key} className="flex cursor-pointer items-center gap-2 text-xs font-black text-black">
            <input type="checkbox" checked={!hidden.has(s.key)} onChange={() => toggle(s.key)} />
            <span className="inline-block h-3 w-3 rounded-full border border-white shadow" style={{ background: s.color }} />
            {s.label} <span className="font-semibold text-black/40">{(counts[s.key] || 0).toLocaleString("en-GB")}</span>
          </label>
        ))}
        <label className="mt-1 flex cursor-pointer items-center gap-2 border-t border-black/10 pt-1 text-xs font-black text-black">
          <input type="checkbox" checked={showPartners} onChange={(e) => setShowPartners(e.target.checked)} />
          <span className="inline-block h-2.5 w-2.5 rotate-45 border-2 border-black bg-black" />
          Camel partners <span className="font-semibold text-black/40">{partners.length}</span>
        </label>
      </div>
    </div>
  );
}
