import type { Metadata } from "next";
import HomePageContent from "./HomePageContent";
import { getGuideLangs } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Join Camel Global | Meet & Greet Car Hire Partner Portal Spain",
  description: "Become a Camel Global partner and reach customers at Málaga, Alicante, Valencia, Madrid, Barcelona and all major Spanish airports. No monthly fees. Apply in 5 minutes.",
  alternates: { canonical: "https://portal.camel-global.com" },
};

export default function PortalHomePage() {
  // Languages that actually have guides — so the footer Blog link never lands on
  // an empty index (portal content is currently Spanish while the UI defaults to
  // English). Computed server-side; the client picks the best match.
  return <HomePageContent guideLangs={getGuideLangs()} />;
}