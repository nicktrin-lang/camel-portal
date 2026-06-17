"use client";

import dynamic from "next/dynamic";

const MapContainer = dynamic(async () => (await import("react-leaflet")).MapContainer, { ssr: false });
const TileLayer    = dynamic(async () => (await import("react-leaflet")).TileLayer,    { ssr: false });

export type MapPartner = {
  id: string;
  company_name: string | null;
  address: string | null;
  lat: number;
  lng: number;
  is_live: boolean;
};

const BoundsUpdater = dynamic(
  async () => {
    const { useMap } = await import("react-leaflet");
    const L = (await import("leaflet")).default;
    return function BoundsUpdater({ partners }: { partners: MapPartner[] }) {
      const map = useMap();
      if (partners.length === 1) {
        map.setView([partners[0].lat, partners[0].lng], 10);
      } else if (partners.length > 1) {
        const bounds = L.latLngBounds(partners.map(p => [p.lat, p.lng]));
        map.fitBounds(bounds, { padding: [40, 40] });
      }
      return null;
    };
  },
  { ssr: false }
);

const MarkerWithIcon = dynamic(
  async () => {
    const { Marker: RLMarker, Popup: RLPopup } = await import("react-leaflet");
    const L = (await import("leaflet")).default;
    const liveIcon = L.divIcon({
      className: "",
      html: `<div style="width:14px;height:14px;background:#16a34a;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
      iconSize: [14, 14], iconAnchor: [7, 7], popupAnchor: [0, -8],
    });
    const notLiveIcon = L.divIcon({
      className: "",
      html: `<div style="width:14px;height:14px;background:#ff7a00;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
      iconSize: [14, 14], iconAnchor: [7, 7], popupAnchor: [0, -8],
    });
    return function MarkerWithIcon({ p }: { p: MapPartner }) {
      return (
        <RLMarker position={[p.lat, p.lng]} icon={p.is_live ? liveIcon : notLiveIcon}>
          <RLPopup>
            <div style={{ fontFamily: "sans-serif", minWidth: 160 }}>
              <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 4 }}>{p.company_name || "Unknown"}</div>
              {p.address && <div style={{ fontSize: 11, color: "#555", marginBottom: 6 }}>{p.address}</div>}
              <span style={{
                display: "inline-block", padding: "2px 8px", fontSize: 10, fontWeight: 900,
                letterSpacing: "0.08em", textTransform: "uppercase",
                background: p.is_live ? "#f0fdf4" : "#fff7f0",
                color: p.is_live ? "#16a34a" : "#ff7a00",
                border: `1px solid ${p.is_live ? "#bbf7d0" : "#ffcba0"}`,
              }}>
                {p.is_live ? "✓ Live" : "Not live"}
              </span>
            </div>
          </RLPopup>
        </RLMarker>
      );
    };
  },
  { ssr: false }
);

type Props = { partners: MapPartner[] };

export default function PartnersMap({ partners }: Props) {
  if (partners.length === 0) return null;
  const center: [number, number] = [partners[0].lat, partners[0].lng];
  return (
    <div className="relative overflow-hidden border border-black/10" style={{ height: 420, zIndex: 0 }}>
      <MapContainer center={center} zoom={5} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* @ts-ignore */}
        <BoundsUpdater partners={partners} />
        {partners.map(p => (
          /* @ts-ignore */
          <MarkerWithIcon key={p.id} p={p} />
        ))}
      </MapContainer>
      <div className="absolute bottom-4 left-4 z-[1000] flex flex-col gap-1.5 border border-black/10 bg-white px-3 py-2 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-black text-black">
          <span className="inline-block h-3 w-3 rounded-full bg-green-600 border-2 border-white shadow" />
          Live
        </div>
        <div className="flex items-center gap-2 text-xs font-black text-black">
          <span className="inline-block h-3 w-3 rounded-full bg-[#ff7a00] border-2 border-white shadow" />
          Approved / not live
        </div>
      </div>
    </div>
  );
}
