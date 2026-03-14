"use client";

import dynamic from "next/dynamic";

const MapContainer = dynamic(
  async () => {
    const mod = await import("react-leaflet");
    return mod.MapContainer;
  },
  { ssr: false }
);

const TileLayer = dynamic(
  async () => {
    const mod = await import("react-leaflet");
    return mod.TileLayer;
  },
  { ssr: false }
);

const Marker = dynamic(
  async () => {
    const mod = await import("react-leaflet");
    return mod.Marker;
  },
  { ssr: false }
);

const Popup = dynamic(
  async () => {
    const mod = await import("react-leaflet");
    return mod.Popup;
  },
  { ssr: false }
);

type Props = {
  lat: number | null;
  lng: number | null;
  label?: string | null;
};

export default function PartnerLocationMap({ lat, lng, label }: Props) {
  if (lat === null || lng === null) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-2xl border border-black/10 bg-[#f8fbff] text-sm text-slate-500">
        No map location available.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-black/10">
      <MapContainer
        center={[lat, lng]}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: 320, width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]}>
          <Popup>{label || "Partner location"}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}