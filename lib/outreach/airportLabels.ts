// How an airport is named in outreach copy, in the language its own country's operators
// use ("aeropuerto de Sevilla", "aeroporto di Bergamo", "Flughafen München"). OurAirports'
// municipality field can't be used for this: it often names the parish the runway sits in
// (Malpensa → "Ferno", Murcia → "Corvera"). Airports not listed here are written as
// "the airport (XYZ)" instead, so a missing entry is safe, just less specific.
export const AIRPORT_LABEL: Record<string, string> = {
  // Spain
  AGP: "Málaga", ALC: "Alicante", BCN: "Barcelona", BIO: "Bilbao", BJZ: "Badajoz", CDT: "Castellón",
  EAS: "San Sebastián", FUE: "Fuerteventura", GMZ: "La Gomera", GRO: "Girona", GRX: "Granada",
  IBZ: "Ibiza", ILD: "Lleida", LCG: "A Coruña", LEI: "Almería", LEN: "León", LPA: "Gran Canaria",
  ACE: "Lanzarote", MAD: "Madrid", MAH: "Menorca", MLN: "Melilla", ODB: "Córdoba", OVD: "Asturias",
  PMI: "Palma", PNA: "Pamplona", REU: "Reus", RJL: "Logroño", RMU: "Murcia", SCQ: "Santiago",
  SDR: "Santander", SLM: "Salamanca", SPC: "La Palma", SVQ: "Sevilla", TFN: "Tenerife Norte",
  TFS: "Tenerife Sur", VDE: "El Hierro", VGO: "Vigo", VIT: "Vitoria", VLC: "Valencia",
  VLL: "Valladolid", XRY: "Jerez", ZAZ: "Zaragoza",
  // Portugal
  LIS: "Lisboa", OPO: "Porto", FAO: "Faro", FNC: "Madeira", PDL: "Ponta Delgada", PXO: "Porto Santo",
  TER: "Terceira", HOR: "Horta", PIX: "Pico",
  // Italy
  AHO: "Alghero", AOI: "Ancona", BDS: "Brindisi", BGY: "Bergamo", BLQ: "Bologna", BRI: "Bari",
  BZO: "Bolzano", CAG: "Cagliari", CIA: "Roma Ciampino", CIY: "Comiso", CRV: "Crotone", CTA: "Catania",
  CUF: "Cuneo", FCO: "Roma Fiumicino", FLR: "Firenze", FOG: "Foggia", FRL: "Forlì", GOA: "Genova",
  LIN: "Milano Linate", LMP: "Lampedusa", MXP: "Milano Malpensa", NAP: "Napoli", OLB: "Olbia",
  PEG: "Perugia", PMF: "Parma", PMO: "Palermo", PNL: "Pantelleria", PSA: "Pisa", PSR: "Pescara",
  QSR: "Salerno", REG: "Reggio Calabria", RMI: "Rimini", SUF: "Lamezia Terme", TPS: "Trapani",
  TRN: "Torino", TRS: "Trieste", TSF: "Treviso", VBS: "Brescia", VCE: "Venezia", VRN: "Verona",
  // France
  AJA: "Ajaccio", AVN: "Avignon", BIA: "Bastia", BIQ: "Biarritz", BES: "Brest", BOD: "Bordeaux",
  BSL: "Bâle-Mulhouse", BVA: "Beauvais", BZR: "Béziers", CCF: "Carcassonne", CDG: "Paris-Charles de Gaulle",
  CFE: "Clermont-Ferrand", CFR: "Caen", CLY: "Calvi", CMF: "Chambéry", DOL: "Deauville", EGC: "Bergerac",
  ETZ: "Metz-Nancy", FNI: "Nîmes", FSC: "Figari", GNB: "Grenoble", LDE: "Tarbes-Lourdes", LIG: "Limoges",
  LIL: "Lille", LRH: "La Rochelle", LYS: "Lyon", MPL: "Montpellier", MRS: "Marseille", NCE: "Nice",
  NTE: "Nantes", ORY: "Paris-Orly", PGF: "Perpignan", PIS: "Poitiers", PUF: "Pau", RDZ: "Rodez",
  RNS: "Rennes", SXB: "Strasbourg", TLN: "Toulon-Hyères", TLS: "Toulouse", TUF: "Tours",
  // Germany
  BER: "Berlin", BRE: "Bremen", CGN: "Köln/Bonn", DRS: "Dresden", DTM: "Dortmund", DUS: "Düsseldorf",
  ERF: "Erfurt", FDH: "Friedrichshafen", FKB: "Karlsruhe/Baden-Baden", FMM: "Memmingen", FMO: "Münster/Osnabrück",
  FRA: "Frankfurt", HAJ: "Hannover", HAM: "Hamburg", HHN: "Frankfurt-Hahn", LEJ: "Leipzig/Halle",
  MUC: "München", NRN: "Weeze", NUE: "Nürnberg", PAD: "Paderborn", RLG: "Rostock", SCN: "Saarbrücken",
  STR: "Stuttgart", GWT: "Sylt",
  // United Kingdom
  ABZ: "Aberdeen", BFS: "Belfast International", BHD: "Belfast City", BHX: "Birmingham", BOH: "Bournemouth",
  BRS: "Bristol", CWL: "Cardiff", EDI: "Edinburgh", EMA: "East Midlands", EXT: "Exeter", GLA: "Glasgow",
  HUY: "Humberside", INV: "Inverness", LBA: "Leeds Bradford", LCY: "London City", LGW: "Gatwick",
  LHR: "Heathrow", LPL: "Liverpool", LTN: "Luton", MAN: "Manchester", MME: "Teesside", NCL: "Newcastle",
  NQY: "Newquay", NWI: "Norwich", PIK: "Prestwick", SEN: "Southend", SOU: "Southampton", STN: "Stansted",
  // Greece (outreach copy is English there)
  ATH: "Athens", CFU: "Corfu", CHQ: "Chania", EFL: "Kefalonia", GPA: "Patras", HER: "Heraklion",
  IOA: "Ioannina", JMK: "Mykonos", JNX: "Naxos", JSI: "Skiathos", JTR: "Santorini", KGS: "Kos",
  KLX: "Kalamata", KVA: "Kavala", MJT: "Mytilene", PAS: "Paros", PVK: "Preveza", RHO: "Rhodes",
  SKG: "Thessaloniki", SMI: "Samos", ZTH: "Zakynthos",
};
