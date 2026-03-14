"use client";

type Props = {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
};

export default function PortalTopbar({ title, subtitle, onMenuClick }: Props) {
  return (
    <div className="sticky top-[105px] z-20 border-b border-black/5 bg-[#e3f4ff]/95 backdrop-blur md:top-[115px]">
      <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-8">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold text-[#003768] md:text-3xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-slate-600 md:text-base">{subtitle}</p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex items-center rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[#003768] shadow-sm hover:bg-black/5 lg:hidden"
        >
          Menu
        </button>
      </div>
    </div>
  );
}