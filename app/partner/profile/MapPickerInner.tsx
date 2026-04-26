"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

function RecenterMap({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat !== null && lng !== null) map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

type Props = { lat: number | null; lng: number | null; onPick: (lat: number, lng: number) => void };

export default function MapPickerInner({ lat, lng, onPick }: Props) {
  const defaultLat = lat ?? 39.4699;
  const defaultLng = lng ?? -0.3763;

  return (
    <div className="border border-black/10 overflow-hidden">
      <MapContainer center={[defaultLat, defaultLng]} zoom={13} scrollWheelZoom className="h-[360px] w-full">
        <TileLayer
          attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
          minZoom={0}
          maxZoom={20}
        />
        <ClickHandler onPick={onPick} />
        <RecenterMap lat={lat} lng={lng} />
        {lat !== null && lng !== null && <Marker position={[lat, lng]} />}
      </MapContainer>
    </div>
  );
}