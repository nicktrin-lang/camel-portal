// Car hire chains and franchise networks: the outreach directory keeps their branches (so
// the counts are honest) but flags them `is_chain`, and the directory page hides them by
// default. Camel's partner pitch is for independents; a Sixt counter can't sign up.
//
// Matched against the lowercased business name AND its website host. Overture's own
// `brand` field also marks a row as a chain. Extend this list when a chain slips through.

const CHAIN_NAMES = [
  // International majors and their budget brands
  "sixt", "hertz", "avis", "budget", "europcar", "enterprise", "alamo", "national car", "national atesa", "atesa",
  "dollar", "thrifty", "firefly", "keddy", "interrent", "goldcar", "payless", "ace rent", "fox rent", "advantage rent",
  "zipcar", "ubeeqo", "getaround", "share now", "free2move", "drivalia", "leasys", "ayvens", "arval", "northgate",
  "green motion", "surprice", "rent-a-car.fr", "ada location", "ucar", "locauto", "maggiore",
  "sicily by car", "winrent", "noleggiare", "autovia", "starcar", "buchbinder", "cc rent", "flinkster", "miles mobility",
  "turo", "kayak", "rentalcars", "discover cars", "auto europe", "holiday autos", "economy car hire", "doyouspain",
  // Spanish and Portuguese national networks (large regional independents such as CICAR or
  // Auto Jardim are deliberately NOT here: they are realistic partners)
  "centauro", "record go", "ok rent", "okmobility", "ok mobility", "alquiber", "zity", "wiber", "virtuo",
  // UK / US / ANZ
  "arnold clark", "u-haul", "penske", "budget truck", "fox rent", "jucy", "rent-a-wreck", "rent a wreck",
];

const CHAIN_HOSTS = [
  "sixt.", "hertz.", "avis.", "budget.", "europcar.", "enterprise.", "alamo.", "nationalcar.", "atesa.", "dollar.",
  "thrifty.", "firefly.", "keddy.", "goldcar.", "paylesscar.", "centauro.", "recordgo.", "okmobility.", "okrentacar.",
  "drivalia.", "greenmotion.", "surprice.", "rentacar.fr", "ada.fr", "ucar.fr", "locautorent.", "maggiore.",
  "sicilybycar.", "winrent.", "noleggiare.", "starcar.", "buchbinder.", "arnoldclark.", "uhaul.", "pensketruckrental.",
  "zipcar.", "getaround.", "free2move.", "leasys.", "ayvens.", "arval.", "northgate.", "jucy.", "rentawreck.", "turo.",
];

const NAME_RE = new RegExp(`(^|[^a-z])(${CHAIN_NAMES.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})([^a-z]|$)`, "i");

export function isChain(name: string, host: string | null, brand: string | null): boolean {
  if (brand && brand.trim()) return true;
  if (NAME_RE.test(name.toLowerCase())) return true;
  if (host && CHAIN_HOSTS.some((h) => host.startsWith(h) || host.includes(`.${h}`))) return true;
  return false;
}
