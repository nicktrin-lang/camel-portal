// ── Camel Global — City / Country search bias config ─────────────────────────
// Add one entry per city as you expand. lat/lng is the city centre used as
// Photon search bias — results are weighted here but not hard-blocked, so
// customers can still find addresses slightly outside the radius.
// radiusKm is cosmetic only (shown to user). Photon bias is always applied.

export type CityEntry = {
  country:  string;   // Display name for the country group
  city:     string;   // Display name shown in selector
  lat:      number;   // City centre latitude
  lng:      number;   // City centre longitude
  radiusKm: number;   // Approximate search radius shown to user
};

export const CITIES: CityEntry[] = [
  // ── Spain ──────────────────────────────────────────────────────────────────
  { country: "Spain",          city: "Valencia",        lat: 39.4699,  lng: -0.3763,  radiusKm: 60 },
  { country: "Spain",          city: "Alicante",        lat: 38.3452,  lng: -0.4810,  radiusKm: 60 },
  { country: "Spain",          city: "Benidorm",        lat: 38.5402,  lng: -0.1328,  radiusKm: 40 },
  { country: "Spain",          city: "Málaga",          lat: 36.7213,  lng: -4.4213,  radiusKm: 60 },
  { country: "Spain",          city: "Barcelona",       lat: 41.3851,  lng:  2.1734,  radiusKm: 60 },
  { country: "Spain",          city: "Madrid",          lat: 40.4168,  lng: -3.7038,  radiusKm: 60 },
  { country: "Spain",          city: "Palma (Mallorca)",lat: 39.5696,  lng:  2.6502,  radiusKm: 50 },
  { country: "Spain",          city: "Ibiza",           lat: 38.9067,  lng:  1.4200,  radiusKm: 30 },
  { country: "Spain",          city: "Tenerife",        lat: 28.2916,  lng: -16.6291, radiusKm: 50 },
  { country: "Spain",          city: "Lanzarote",       lat: 28.9630,  lng: -13.5500, radiusKm: 40 },
  { country: "Spain",          city: "Fuerteventura",   lat: 28.3338,  lng: -14.0030, radiusKm: 40 },
  { country: "Spain",          city: "Gran Canaria",    lat: 27.9202,  lng: -15.5472, radiusKm: 50 },
  { country: "Spain",          city: "Seville",         lat: 37.3891,  lng: -5.9845,  radiusKm: 60 },
  { country: "Spain",          city: "Murcia",          lat: 37.9922,  lng: -1.1307,  radiusKm: 50 },

  // ── United Kingdom ─────────────────────────────────────────────────────────
  { country: "United Kingdom", city: "London",          lat: 51.5074,  lng: -0.1278,  radiusKm: 60 },
  { country: "United Kingdom", city: "Manchester",      lat: 53.4808,  lng: -2.2426,  radiusKm: 50 },
  { country: "United Kingdom", city: "Birmingham",      lat: 52.4862,  lng: -1.8904,  radiusKm: 50 },
  { country: "United Kingdom", city: "Edinburgh",       lat: 55.9533,  lng: -3.1883,  radiusKm: 40 },
  { country: "United Kingdom", city: "Glasgow",         lat: 55.8642,  lng: -4.2518,  radiusKm: 40 },

  // ── Portugal ───────────────────────────────────────────────────────────────
  { country: "Portugal",       city: "Lisbon",          lat: 38.7223,  lng: -9.1393,  radiusKm: 50 },
  { country: "Portugal",       city: "Porto",           lat: 41.1579,  lng: -8.6291,  radiusKm: 40 },
  { country: "Portugal",       city: "Faro (Algarve)",  lat: 37.0194,  lng: -7.9322,  radiusKm: 60 },

  // ── France ─────────────────────────────────────────────────────────────────
  { country: "France",         city: "Paris",           lat: 48.8566,  lng:  2.3522,  radiusKm: 60 },
  { country: "France",         city: "Nice",            lat: 43.7102,  lng:  7.2620,  radiusKm: 50 },

  // ── Italy ──────────────────────────────────────────────────────────────────
  { country: "Italy",          city: "Rome",            lat: 41.9028,  lng: 12.4964,  radiusKm: 60 },
  { country: "Italy",          city: "Milan",           lat: 45.4642,  lng:  9.1900,  radiusKm: 60 },

  // ── Greece ─────────────────────────────────────────────────────────────────
  { country: "Greece",         city: "Athens",          lat: 37.9838,  lng: 23.7275,  radiusKm: 50 },
  { country: "Greece",         city: "Crete (Heraklion)",lat:35.3387,  lng: 25.1442,  radiusKm: 60 },

  // ── USA ────────────────────────────────────────────────────────────────────
  { country: "United States",  city: "New York",        lat: 40.7128,  lng: -74.0060, radiusKm: 60 },
  { country: "United States",  city: "Los Angeles",     lat: 34.0522,  lng: -118.2437,radiusKm: 80 },
  { country: "United States",  city: "Miami",           lat: 25.7617,  lng: -80.1918, radiusKm: 60 },

  // ── UAE ────────────────────────────────────────────────────────────────────
  { country: "UAE",            city: "Dubai",           lat: 25.2048,  lng: 55.2708,  radiusKm: 60 },
  { country: "UAE",            city: "Abu Dhabi",       lat: 24.4539,  lng: 54.3773,  radiusKm: 50 },

  // Add more cities here as you expand ────────────────────────────────────────
];

// Default city shown on first load
export const DEFAULT_CITY: CityEntry = CITIES[0]; // Valencia

// Group cities by country for the selector UI
export function citiesByCountry(): Record<string, CityEntry[]> {
  const map: Record<string, CityEntry[]> = {};
  for (const c of CITIES) {
    if (!map[c.country]) map[c.country] = [];
    map[c.country].push(c);
  }
  return map;
}