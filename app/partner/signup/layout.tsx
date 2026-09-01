// The signup page is a client component and can't export metadata, so its well-written
// metadata.ts sat unused. This server layout activates it for the /partner/signup route
// (unique title, description, keywords, canonical and OpenGraph).
export { metadata } from "./metadata";

export default function PartnerSignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
