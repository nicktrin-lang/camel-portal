"use client";

type Props = {
  lat: number | null;
  lng: number | null;
  label?: string | null;
};

export default function PartnerLocationMap({ lat, lng, label }: Props) {
  if (lat === null || lng === null) {
    return (
      <div className="rounded-xl border border-black/10 bg-white p-4 text-sm text-gray-600">
        No saved map location for this partner.
      </div>
    );
  }

  const bbox = `${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}`;
  const marker = `${lat}%2C${lng}`;

  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`;
  const openStreetMapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
      <iframe
        title={label || "Partner location"}
        src={src}
        className="h-[340px] w-full border-0"
        loading="lazy"
      />
      <div className="flex items-center justify-between border-t border-black/10 px-4 py-3 text-sm">
        <span className="text-gray-700">
          {label || "Saved location"} — {lat}, {lng}
        </span>
        <a
          href={openStreetMapUrl}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-[#005b9f] hover:underline"
        >
          Open larger map
        </a>
      </div>
    </div>
  );
}