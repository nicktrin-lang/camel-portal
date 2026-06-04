import type { Metadata } from "next";
import HomePageContent from "./HomePageContent";

export const metadata: Metadata = {
  title: "Join Camel Global | Meet & Greet Car Hire Partner Portal Spain",
  description: "Become a Camel Global partner and reach customers at Málaga, Alicante, Valencia, Madrid, Barcelona and all major Spanish airports. No monthly fees. Apply in 5 minutes.",
  alternates: { canonical: "https://portal.camel-global.com" },
};

export default function PortalHomePage() {
  return <HomePageContent />;
}