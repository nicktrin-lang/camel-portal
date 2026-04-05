"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { translations } from "./marketing/translations";
import { hostname } from "zod/v4/mini";
import CustomerMapWrapper from "@/app/components/CustomerMapWrapper";
import { MapContainer } from "react-leaflet";

type Lang = keyof typeof translations;

type Coords = {
  lat: number;
  lng: number;
};

function CustomerMapHome() {
  const router = useRouter();
  const [pickupMode, setPickupMode] = useState<"map" | "current">("map");
  const [coords, setCoords] = useState({
    lat: 51.5074,
    lng: -0.1278,
  });
  const [locationLabel, setLocationLabel] = useState("Central London");
  const [isLocating, setIsLocating] = useState(false);

  function continueToBooking() {
    const params = new URLSearchParams({
      pickupLat: String(coords.lat),
      pickupLng: String(coords.lng),
      pickupLabel: locationLabel,
      pickupMode,
    });

    router.push(`/test-booking/new?${params.toString()}`);
  }

  function useCurrentLocation() {
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setCoords({ lat, lng }); // THIS is what moves map
        setLocationLabel("Current location");

        setIsLocating(false);
      },
      () => {
        alert("Failed to get location");
        setIsLocating(false);
      }
    );
  }
  
  function setPresetLocation(name: string, lat: number, lng: number) {
    setPickupMode("map");
    setCoords({ lat, lng });
    setLocationLabel(name);
  }

  return (
    <>
      <style>{`
        :root {
          --camel-blue: #005b9f;
          --camel-blue-dark: #003768;
          --camel-orange: #ff7a00;
        }

        * { box-sizing: border-box; }

        html, body {
          margin: 0;
          padding: 0;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        body {
          background: #fff;
        }

        a {
          text-decoration: none;
        }

        .customer-page {
          position: relative;
          width: 100%;
          height: 100vh;
          overflow: hidden;
          background: #dbeafe;
        }

        .customer-map {
          position: absolute;
          inset: 0;
          z-index: 1;
        }

        .customer-map iframe {
          display: block;
          width: 100%;
          height: 100%;
          border: 0;
        }

        .customer-overlay {
          position: absolute;
          inset: 0;
          z-index: 2;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 1.25rem;
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.42) 0%,
            rgba(0, 0, 0, 0.15) 35%,
            rgba(0, 0, 0, 0.55) 100%
          );
          color: #fff;
        }

        .customer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .customer-logo img {
          height: 64px;
          width: auto;
          display: block;
        }

        .customer-header-actions {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          flex-wrap: wrap;
        }

        .customer-header-link {
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.32);
          border-radius: 999px;
          padding: 0.65rem 1rem;
          font-size: 0.9rem;
          font-weight: 600;
          backdrop-filter: blur(4px);
          background: rgba(255, 255, 255, 0.08);
        }

        .customer-header-link-primary {
          background: var(--camel-orange);
          border-color: transparent;
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18);
        }

        .customer-content {
          width: 100%;
          max-width: 560px;
          margin-bottom: 2rem;
        }

        .customer-kicker {
          display: inline-block;
          margin-bottom: 0.7rem;
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.9);
        }

        .customer-title {
          margin: 0;
          font-size: clamp(2.1rem, 5vw, 3.8rem);
          line-height: 1.02;
          font-weight: 800;
          color: #fff;
          text-shadow: 0 2px 18px rgba(0, 0, 0, 0.35);
        }

        .customer-subtext {
          margin-top: 0.9rem;
          font-size: 1rem;
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.95);
          max-width: 520px;
          text-shadow: 0 2px 14px rgba(0, 0, 0, 0.24);
        }

        .customer-location {
          margin-top: 1rem;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.22);
          padding: 0.7rem 1rem;
          color: #fff;
          font-size: 0.95rem;
          font-weight: 600;
          backdrop-filter: blur(6px);
        }

        .customer-actions {
          margin-top: 1rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .customer-btn {
          appearance: none;
          border: none;
          border-radius: 999px;
          padding: 0.95rem 1.3rem;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.15s ease, opacity 0.15s ease;
        }

        .customer-btn:hover {
          transform: translateY(-1px);
        }

        .customer-btn:disabled {
          opacity: 0.75;
          cursor: not-allowed;
          transform: none;
        }

        .customer-btn-primary {
          background: var(--camel-orange);
          color: #fff;
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.22);
        }

        .customer-btn-secondary {
          background: rgba(255, 255, 255, 0.94);
          color: var(--camel-blue-dark);
          border: 1px solid rgba(0, 0, 0, 0.08);
        }

        .customer-presets {
          margin-top: 1rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.55rem;
        }

        .customer-preset {
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.14);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.22);
          padding: 0.55rem 0.85rem;
          font-size: 0.84rem;
          font-weight: 600;
          cursor: pointer;
          backdrop-filter: blur(6px);
        }

        @media (max-width: 900px) {
          .customer-content {
            max-width: 100%;
          }
        }

        @media (max-width: 640px) {
          .customer-overlay {
            padding: 1rem;
          }

          .customer-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .customer-logo img {
            height: 58px;
          }

          .customer-header-actions {
            width: 100%;
          }

          .customer-title {
            font-size: 2rem;
          }

          .customer-subtext {
            font-size: 0.95rem;
          }

          .customer-content {
            margin-bottom: 1rem;
          }
        }
      `}</style>

      <div className="customer-page">
        <div className="customer-map">
          <CustomerMapWrapper
            position={coords}
            onSelect={(pos) => {
              setCoords(pos);
              setLocationLabel("Selected location");
            }}
          />
        </div>

        <div
          className="customer-overlay"
          style={{ pointerEvents: "none" }}
        >
          <div className="customer-header">
            <Link 
              href="/" 
              className="customer-logo"
            >
              <img src="/camel-logo.png" alt="Camel Global Ltd logo" />
            </Link>

            <div className="customer-header-actions">

              <Link
                href="/test-booking/login"
                className="customer-header-link"
                style={{ pointerEvents: "auto" }}
              >
                Customer Login
              </Link>

              <Link
                href="/test-booking/signup"
                className="customer-header-link customer-header-link-primary"
                style={{ pointerEvents: "auto" }}
              >
                Create Account
              </Link>

            </div>
          </div>

          <div className="customer-content">
            <div className="customer-kicker">Camel Global Customer Staging</div>

            <h1 className="customer-title">
              Start your booking on the map.
            </h1>

            <div className="customer-subtext">
              Choose your pickup location and continue into the booking details.
              Customers can begin the booking flow first, then sign in or create
              an account before final processing.
            </div>

            <div className="customer-location">
              Selected pickup: {locationLabel}
            </div>

            <div className="customer-actions">
              <button
                type="button"
                className="customer-btn customer-btn-primary"
                onClick={continueToBooking}
                style={{ pointerEvents: "auto" }}
              >
                Continue to booking details
              </button>

              <button
                type="button"
                className="customer-btn customer-btn-secondary"
                onClick={useCurrentLocation}
                disabled={isLocating}
                style={{ pointerEvents: "auto" }}
              >
                {isLocating ? "Getting location..." : "Use current location"}
              </button>
            </div>

            <div className="customer-presets">
              <button
                type="button"
                className="customer-preset"
                onClick={() => setPresetLocation("Central London", 51.5074, -0.1278)}
                style={{ pointerEvents: "auto" }}
              >
                London
              </button>
              <button
                type="button"
                className="customer-preset"
                onClick={() => setPresetLocation("Manchester City Centre", 53.4808, -2.2426)}
                style={{ pointerEvents: "auto" }}
              >
                Manchester
              </button>
              <button
                type="button"
                className="customer-preset"
                onClick={() => setPresetLocation("Birmingham City Centre", 52.4862, -1.8904)}
                style={{ pointerEvents: "auto" }}
              >
                Birmingham
              </button>
              <button
                type="button"
                className="customer-preset"
                onClick={() => setPresetLocation("Gatwick Airport", 51.1537, -0.1821)}
                style={{ pointerEvents: "auto" }}
              >
                Gatwick
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function PartnerMarketingHome() {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
    setLanguage("en");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setLanguage(nextLang: Lang) {
    setLang(nextLang);
    document.documentElement.setAttribute("lang", nextLang);

    const dict = translations[nextLang] || translations.en;

    document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!key) return;
      const value = (dict as any)[key];
      if (value) el.innerHTML = value;
    });
  }

  function toggleMobileNav() {
    const navLinks = document.querySelector(".nav-links");
    const navToggle = document.querySelector(".nav-toggle");
    if (!navLinks || !navToggle) return;

    const isOpen = navLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  function closeMobileNavIfOpen() {
    const navLinks = document.querySelector(".nav-links");
    const navToggle = document.querySelector(".nav-toggle");
    if (!navLinks || !navToggle) return;

    if (window.innerWidth <= 880 && navLinks.classList.contains("open")) {
      navLinks.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  }

  return (
    <>
      <style>{`
        :root {
          --camel-blue: #005b9f;
          --camel-blue-dark: #003768;
          --camel-orange: #ff7a00;
          --camel-light: #e3f4ff;
          --camel-grey: #f5f7fa;
          --text-main: #1a1a1a;
        }

        * { box-sizing: border-box; }

        body {
          margin: 0;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: var(--text-main);
          background: var(--camel-light);
          line-height: 1.6;
          padding-top: 115px;
        }

        img {
          max-width: 100%;
          height: auto;
          display: block;
        }

        a { color: var(--camel-orange); text-decoration: none; }
        a:hover { text-decoration: underline; }

        header {
          background: linear-gradient(135deg, var(--camel-blue-dark), var(--camel-blue));
          color: #fff;
          padding: 0.6rem 1.2rem;
          width: 100%;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 9999;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        }

        header .nav-wrapper {
          position: relative;
          max-width: 1200px;
          margin: 0 auto;
        }

        .nav {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 0.75rem;
          flex-wrap: nowrap;
        }

        .logo-wrap { display: flex; align-items: center; flex-shrink: 0; }
        .logo-link { display: inline-flex; align-items: center; }
        .logo-wrap img { height: 80px; width: auto; }

        .nav-right {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .lang-switch { position: relative; }

        .lang-select {
          background: rgba(0, 0, 0, 0.2);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 999px;
          padding: 0.25rem 0.8rem;
          font-size: 0.8rem;
          cursor: pointer;
          outline: none;
          appearance: none;
        }

        .lang-select option { color: #000; }

        .nav-toggle {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.3rem;
        }

        .nav-toggle-box {
          width: 24px;
          height: 18px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .nav-toggle-line {
          height: 3px;
          border-radius: 3px;
          background: #fff;
          width: 100%;
        }

        .nav-links {
          display: flex;
          flex-wrap: nowrap;
          gap: 0.75rem;
          font-size: 0.9rem;
          justify-content: flex-end;
          margin-left: 1.2rem;
        }

        .nav-links a {
          color: #fff;
          padding: 0.3rem 0.7rem;
          border-radius: 999px;
          border: 1px solid transparent;
          white-space: nowrap;
        }

        .nav-links a:hover {
          border-color: rgba(255, 255, 255, 0.4);
          text-decoration: none;
        }

        .hero {
          background: linear-gradient(135deg, rgba(0, 91, 159, 0.95), rgba(0, 118, 210, 0.95));
          color: #fff;
          padding: 3.3rem 1.5rem 3rem;
        }

        .hero-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
          gap: 2.5rem;
          align-items: center;
        }

        .partner-title {
          font-size: clamp(2rem, 4vw, 2.8rem);
          margin: 0 0 1rem;
        }

        .hero p {
          margin: 0 0 1.25rem;
          font-size: 1.05rem;
        }

        .hero-highlight {
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 0.85rem;
          opacity: 0.9;
        }

        .hero-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-top: 1rem;
        }

        .badge {
          padding: 0.35rem 0.9rem;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.4);
          font-size: 0.8rem;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .hero-cta {
          margin-top: 1.5rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          align-items: center;
        }

        .partner-btn {
          display: inline-block;
          padding: 0.8rem 1.4rem;
          border-radius: 999px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          font-size: 0.95rem;
          text-align: center;
        }

        .partner-btn-primary {
          background: var(--camel-orange);
          color: #fff;
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18);
        }

        .hero-card {
          background: rgba(255, 255, 255, 0.97);
          color: var(--text-main);
          border-radius: 1.2rem;
          padding: 1.5rem;
          box-shadow: 0 18px 45px rgba(0, 0, 0, 0.16);
        }

        .hero-card h2 {
          font-size: 1.1rem;
          margin-top: 0;
          margin-bottom: 0.75rem;
          color: var(--camel-blue-dark);
        }

        .hero-card ul {
          list-style: none;
          padding: 0;
          margin: 0 0 1rem;
          font-size: 0.9rem;
        }

        .hero-card li::before {
          content: "✓";
          color: var(--camel-orange);
          font-weight: 700;
          margin-right: 0.35rem;
        }

        .hero-card li { margin-bottom: 0.35rem; }
        .hero-card p { margin: 0; }

        main { background: #fff; }
        section { padding: 3rem 1.5rem; }

        .section-inner { max-width: 1200px; margin: 0 auto; }

        h2.section-title {
          font-size: 1.7rem;
          margin-top: 0;
          margin-bottom: 0.5rem;
          color: var(--camel-blue-dark);
        }

        .section-subtitle {
          margin: 0 0 1.5rem;
          color: #555;
          font-size: 0.95rem;
          text-transform: uppercase;
          letter-spacing: 0.15em;
        }

        .two-col {
          display: grid;
          grid-template-columns: minmax(0, 3fr) minmax(0, 3fr);
          gap: 2rem;
          align-items: start;
        }

        .pill-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
          margin: 1.25rem 0 0;
          padding: 0;
          list-style: none;
          font-size: 0.85rem;
        }

        .pill-list li {
          padding: 0.3rem 0.7rem;
          border-radius: 999px;
          border: 1px solid rgba(0, 0, 0, 0.08);
          background: var(--camel-grey);
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.5rem;
          margin-top: 1.5rem;
        }

        .card {
          background: #fff;
          border-radius: 1rem;
          padding: 1.2rem 1.3rem;
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.07);
          border: 1px solid rgba(0, 0, 0, 0.04);
        }

        .card h3 {
          margin-top: 0;
          margin-bottom: 0.75rem;
          font-size: 1.05rem;
          color: var(--camel-blue);
        }

        .card p { margin: 0 0 0.5rem; font-size: 0.95rem; }
        .card ul { padding-left: 1.1rem; margin: 0.25rem 0 0; font-size: 0.93rem; }

        .steps {
          counter-reset: steps;
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .steps li {
          counter-increment: steps;
          margin-bottom: 1rem;
          padding-left: 2.5rem;
          position: relative;
          font-size: 0.96rem;
        }

        .steps li::before {
          content: counter(steps);
          position: absolute;
          left: 0;
          top: 0.15rem;
          width: 1.6rem;
          height: 1.6rem;
          border-radius: 999px;
          background: var(--camel-orange);
          color: #fff;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }

        .highlight-bar {
          padding: 1rem 1.2rem;
          border-radius: 0.9rem;
          background: #fff7ed;
          border: 1px solid #ffd8a6;
          font-size: 0.95rem;
        }

        .screens-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
          margin-top: 1.5rem;
        }

        figure {
          margin: 0;
          background: #fff;
          border-radius: 0.9rem;
          overflow: hidden;
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.07);
          border: 1px solid rgba(0, 0, 0, 0.04);
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        figure img { flex: 1 1 auto; object-fit: cover; }
        figcaption { padding: 0.7rem 0.9rem; font-size: 0.9rem; background: var(--camel-grey); }

        .kpis {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .kpi {
          padding: 1rem 1.1rem;
          border-radius: 0.9rem;
          background: var(--camel-blue-dark);
          color: #fff;
          font-size: 0.9rem;
        }

        .kpi strong { display: block; font-size: 1.05rem; margin-bottom: 0.3rem; }

        .cta {
          background: var(--camel-blue-dark);
          color: #fff;
          text-align: center;
          padding: 3rem 1.5rem 2.5rem;
        }

        .cta-inner { max-width: 800px; margin: 0 auto; }

        .cta h2 { margin-top: 0; font-size: 1.9rem; }
        .cta p { margin: 0 0 1rem; font-size: 1rem; }

        footer {
          background: #02182d;
          color: #c4d0e5;
          padding: 1.3rem 1.5rem;
          font-size: 0.85rem;
        }

        .footer-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          align-items: center;
          justify-content: space-between;
        }

        @media (max-width: 880px) {
          body { padding-top: 105px; }
          .logo-wrap img { height: 64px; }
          .nav-toggle { display: block; }

          .nav-links {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, var(--camel-blue-dark), var(--camel-blue));
            display: none;
            flex-direction: column;
            gap: 0.4rem;
            padding: 0.7rem 1.3rem 1rem;
            margin-left: 0;
          }

          .nav-links.open { display: flex; }

          .nav-links a {
            padding: 0.55rem 0.8rem;
            border-radius: 0.6rem;
            background: rgba(0, 0, 0, 0.18);
          }

          .hero-inner { grid-template-columns: minmax(0, 1fr); }
          .hero-card { margin-top: 1.5rem; }
          .two-col { grid-template-columns: minmax(0, 1fr); }
        }
      `}</style>

      <div id="top"></div>

      <header>
        <div className="nav-wrapper">
          <div className="nav">
            <div className="logo-wrap">
              <a href="#top" className="logo-link" onClick={closeMobileNavIfOpen}>
                <img src="/camel-logo.png" alt="Camel Global Ltd logo" />
              </a>
            </div>

            <div className="nav-right">
              <div className="lang-switch">
                <select
                  id="lang-select"
                  className="lang-select"
                  aria-label="Language selector"
                  value={lang}
                  onChange={(e) => {
                    setLanguage(e.target.value as Lang);
                    closeMobileNavIfOpen();
                  }}
                >
                  <option value="en">EN</option>
                  <option value="es">ES</option>
                  <option value="it">IT</option>
                  <option value="fr">FR</option>
                  <option value="de">DE</option>
                </select>
              </div>

              <button className="nav-toggle" aria-label="Toggle navigation" aria-expanded="false" onClick={toggleMobileNav}>
                <span className="nav-toggle-box">
                  <span className="nav-toggle-line"></span>
                  <span className="nav-toggle-line"></span>
                  <span className="nav-toggle-line"></span>
                </span>
              </button>
            </div>

            <nav className="nav-links">
              <a href="#intro" data-i18n="nav_about" onClick={closeMobileNavIfOpen}>About</a>
              <a href="#concept" data-i18n="nav_concept" onClick={closeMobileNavIfOpen}>The Concept</a>
              <a href="#customer" data-i18n="nav_customer" onClick={closeMobileNavIfOpen}>Customer Journey</a>
              <a href="#partner" data-i18n="nav_partner" onClick={closeMobileNavIfOpen}>Partner Platform</a>
              <a href="#payment" data-i18n="nav_payment" onClick={closeMobileNavIfOpen}>Payment & Reporting</a>
              <a href="#apps" data-i18n="nav_apps" onClick={closeMobileNavIfOpen}>Apps & Screens</a>
            </nav>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="hero-inner">
          <div>
            <div className="hero-highlight" data-i18n="hero_tagline">
              Meet & Greet Car Hire – Built for the UK Market
            </div>
            <h1 className="partner-title" data-i18n="hero_title">NO PAPERWORK. NO QUEUING. NO HIDDEN COSTS.</h1>
            <p data-i18n="hero_p1">
              Camel Global Ltd is a UK company formed as a result of real car-hire experiences in Spain.
              We are an online meet-and-greet car hire platform built solely for customers and partners,
              delivering the car hire service the British public actually wants.
            </p>
            <p data-i18n="hero_p2">
              Think of Camel Global as <strong>“UBER for car hire”</strong> – connecting customers with
              trusted, off-airport car hire partners via our customer app, partner app and web admin portal.
            </p>

            <div className="hero-badges">
              <div className="badge" data-i18n="hero_badge1">Multi-million-pound UK marketing rollout</div>
              <div className="badge" data-i18n="hero_badge2">Off-airport partners only</div>
              <div className="badge" data-i18n="hero_badge3">App + Web Admin Platform</div>
            </div>

            <div className="hero-cta">
              <a className="partner-btn partner-btn-primary" href="/partner/login" onClick={closeMobileNavIfOpen}>
                Join the System
              </a>
            </div>
          </div>

          <aside className="hero-card">
            <h2 data-i18n="hero_box_title">Why customers choose Camel Global</h2>
            <ul>
              <li data-i18n="hero_box_li1">Meet & greet at the agreed location – no queues at airport desks.</li>
              <li data-i18n="hero_box_li2">Full insurance with <strong>no excess</strong> included.</li>
              <li data-i18n="hero_box_li3">Full tank of fuel on arrival – pay only for the fuel actually used.</li>
              <li data-i18n="hero_box_li4">All paperwork &amp; payment completed at time of booking.</li>
              <li data-i18n="hero_box_li5">Location tracking in-app to make meeting the agent effortless.</li>
            </ul>
            <p className="hero-domain" data-i18n="hero_box_p">
              Camel Global distributes bookings to smaller, off-airport car hire companies,
              giving customers the exact experience they want – and partners the business they deserve.
            </p>
          </aside>
        </div>
      </section>

      <main>
        <section id="intro">
          <div className="section-inner">
            <h2 className="section-title" data-i18n="intro_title">Introduction</h2>
            <p className="section-subtitle" data-i18n="intro_subtitle">Camel Global &amp; the UK meet-and-greet opportunity</p>

            <div className="two-col">
              <div>
                <p data-i18n="intro_p1">
                  Camel Global Ltd is a UK-based meet-and-greet car hire platform born from real customer
                  frustrations with traditional airport car hire – long queues, piles of paperwork, and
                  unexpected extra costs on arrival.
                </p>
                <div className="highlight-bar" data-i18n="intro_highlight">
                  Provide a <strong>meet-and-greet car hire service</strong> with
                  <strong>no paperwork, no queuing and no hidden costs</strong>, where
                  customers are willing to pay a premium for simplicity and transparency.
                </div>
                <p style={{ marginTop: "1rem" }} data-i18n="intro_p2">
                  The platform has been built to bring car hire customers and car hire partners together.
                  Customers enjoy the frictionless experience they want, while partners gain a powerful new
                  channel for quality business.
                </p>
              </div>

              <div>
                <p data-i18n="intro_defs_title"><strong>Key definitions used throughout this site:</strong></p>
                <ul>
                  <li data-i18n="intro_def_partners"><strong>Partners</strong> – Car hire companies.</li>
                  <li data-i18n="intro_def_agents"><strong>Agents</strong> – Partner delivery / collection drivers.</li>
                </ul>

                <ul className="pill-list">
                  <li data-i18n="intro_pill1">UK-headquartered</li>
                  <li data-i18n="intro_pill2">Off-airport partners only</li>
                  <li data-i18n="intro_pill3">Customer &amp; Partner Apps</li>
                  <li data-i18n="intro_pill4">Partner Web Admin Portal</li>
                  <li data-i18n="intro_pill5">Feedback-driven system</li>
                  <li data-i18n="intro_pill6">European Law–compliant client accounts</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="concept" style={{ background: "var(--camel-grey)" }}>
          <div className="section-inner">
            <h2 className="section-title" data-i18n="concept_title">The Concept</h2>
            <p className="section-subtitle" data-i18n="concept_subtitle">Meet &amp; greet car hire with everything included</p>

            <div className="two-col">
              <div>
                <p data-i18n="concept_p1">
                  The Camel Global concept is a <strong>meet and greet car hire service</strong> designed so that
                  everything is taken care of before the customer even lands:
                </p>
                <ul>
                  <li data-i18n="concept_ul1">Full insurance with <strong>no excess</strong> included.</li>
                  <li data-i18n="concept_ul2">Full tank of fuel on arrival with <strong>no fuel penalties</strong>.</li>
                  <li data-i18n="concept_ul3">No hidden extras when the customer arrives.</li>
                  <li data-i18n="concept_ul4">The customer pays only for the fuel actually used.</li>
                </ul>
                <p data-i18n="concept_p2">
                  All paperwork is completed and payment made in full at the time of booking. When the customer
                  arrives, there is nothing left to do except meet the agent at the agreed location, take the keys,
                  and go.
                </p>
              </div>

              <div>
                <h3 data-i18n="concept_h3">Built for the British customer</h3>
                <p data-i18n="concept_p3">The British public increasingly expects a service-led model where:</p>
                <ul>
                  <li data-i18n="concept_ul2_1">There is <strong>no queue</strong> at an airport desk.</li>
                  <li data-i18n="concept_ul2_2">There is <strong>no last-minute paperwork</strong>.</li>
                  <li data-i18n="concept_ul2_3">There are <strong>no surprise add-ons</strong>.</li>
                </ul>
                <p data-i18n="concept_p4">
                  A large proportion of customers are prepared to pay a premium for this level of clarity, speed
                  and convenience. Camel Global is designed to meet that demand at scale.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="customer">
          <div className="section-inner">
            <h2 className="section-title" data-i18n="customer_title">Customer Journey</h2>
            <p className="section-subtitle" data-i18n="customer_subtitle">From booking to feedback – all in the Camel Global app</p>

            <div className="two-col">
              <div>
                <ol className="steps">
                  <li data-i18n="customer_step1">
                    The customer opens the Camel Global customer app, selects the pickup location and enters
                    their full requirements – including dates and duration of car hire.
                  </li>
                  <li data-i18n="customer_step2">
                    All registered partners within a <strong>30km radius</strong> of the pickup location are notified
                    of the meet-and-greet requirement and can submit their prices.
                  </li>
                  <li data-i18n="customer_step3">
                    The customer is notified of partner offers. They review all offers, select one, upload their
                    driving licence, accept the partner’s terms &amp; conditions and make full payment.
                  </li>
                  <li data-i18n="customer_step4">
                    At collection time, the customer and agent meet at the agreed location. Through the app they
                    confirm that the car has been collected and that the fuel tank is full.
                  </li>
                  <li data-i18n="customer_step5">
                    <strong>Location services</strong> are enabled in the app so both agent and customer can see where
                    each other are, making the meet-up and handover as smooth as possible.
                  </li>
                  <li data-i18n="customer_step6">
                    At the end of the hire period, the customer meets the agent again at the agreed location.
                    Together they confirm the car return and agree the fuel level remaining in the tank, rounded
                    to the nearest 25%.
                  </li>
                  <li data-i18n="customer_step7">
                    The customer leaves feedback through the app regarding their experience with the partner and
                    the service received.
                  </li>
                </ol>
              </div>

              <div>
                <div className="card">
                  <h3 data-i18n="customer_card_title">The Customer</h3>
                  <p data-i18n="customer_card_p1">The app keeps the customer fully informed at every step:</p>
                  <ul>
                    <li data-i18n="customer_card_li1">All meet-and-greet requests and offers in one place.</li>
                    <li data-i18n="customer_card_li2">Clear breakdown of car hire cost and fuel cost.</li>
                    <li data-i18n="customer_card_li3">Real-time booking status and countdowns to pickup/drop-off.</li>
                    <li data-i18n="customer_card_li4">Fuel level confirmation screens at collection and return.</li>
                    <li data-i18n="customer_card_li5">Simple interface to rate and review their experience.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="screens-grid" style={{ marginTop: "2rem" }}>
              <figure>
                <img src="/Screenshot 2025-12-11 at 11.50.34.png" alt="Customer app booking and fuel confirmation screens" />
                <figcaption data-i18n="customer_fig1">
                  Customer App – Confirm car collection, fuel level at collection and return, and overall booking status.
                </figcaption>
              </figure>
              <figure>
                <img src="/Screenshot 2025-12-11 at 11.50.47.png" alt="Customer app main journey screens" />
                <figcaption data-i18n="customer_fig2">
                  Customer App – Booking flow from pending request through to arrival countdown.
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section id="partner" style={{ background: "var(--camel-grey)" }}>
          <div className="section-inner">
            <h2 className="section-title" data-i18n="partner_title">The Partner</h2>
            <p className="section-subtitle" data-i18n="partner_subtitle">Web admin portal + partner app for agents</p>

            <div className="two-col">
              <div>
                <h3 data-i18n="partner_h3_partner">The Partner</h3>
                <p data-i18n="partner_p1">
                  Through a web-based platform, the partner will see all the customer car hire requests. The partner will
                  enter their prices for both car hire and a full tank of fuel. The car hire price needs to include:
                </p>
                <ul>
                  <li data-i18n="partner_li1">Drop off and collection of the car at the desired location.</li>
                  <li data-i18n="partner_li2">Full insurance with zero excess.</li>
                </ul>
                <p data-i18n="partner_p2">
                  The fuel price is for a full tank of fuel. Each partner will enter their prices of which the customer will
                  be notified on the customer app, and the customer is free to select an offer, upload their driving licence,
                  accept the partner&apos;s terms and conditions and make payment.
                </p>
                <p data-i18n="partner_p3">
                  The partner will be notified of all successful bookings through the web admin panel. Full account reporting
                  will be available in the partner administration panel.
                </p>
              </div>

              <div>
                <h3 data-i18n="partner_h3_app">The Partner App</h3>
                <p data-i18n="partner_p4">
                  The partner also has an App that each agent (partner delivery and drop off driver) can download that displays
                  the cars to deliver, on hire or due to collect. Full App location services will be on, so through the app,
                  the agent and customer can see exactly where each other are to make the drop off / collection as smooth as
                  possible.
                </p>
                <p data-i18n="partner_p5">
                  Upon car drop off, both the customer and agent will confirm through the app that the car has been dropped off
                  and the fuel tank level. When the car is due for collection, the app location services will be on to assist
                  with the meet, and once collected, both the customer and agent will confirm the car collection and fuel level
                  to the nearest 25% in the fuel tank.
                </p>
                <p data-i18n="partner_p6">
                  Once the collection and fuel level are confirmed, payment is transferred to the partner account. The partner
                  then leaves feedback for the customer.
                </p>
              </div>
            </div>

            <div className="screens-grid" style={{ marginTop: "2rem" }}>
              <figure>
                <img src="/Screenshot 2025-12-11 at 11.50.54.png" alt="Partner app menu and status screens" />
                <figcaption data-i18n="partner_fig1">
                  Partner App – Cars Manager with Today / Week / All views for Deliver, On Hire and Collect.
                </figcaption>
              </figure>
              <figure>
                <img src="/Screenshot 2025-12-11 at 11.51.02.png" alt="Partner app confirmation and feedback screens" />
                <figcaption data-i18n="partner_fig2">
                  Partner App – Collect car confirmation, fuel level confirmation and customer feedback screens.
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section id="payment">
          <div className="section-inner">
            <h2 className="section-title" data-i18n="payment_title">Payment</h2>
            <p className="section-subtitle" data-i18n="payment_subtitle">Secure, transparent and compliant with European Law</p>

            <div className="info-grid">
              <div className="card">
                <h3 data-i18n="payment_flow_title">Payment Flow</h3>
                <p data-i18n="payment_flow_p1">
                  All customer payments are held in a client account (covered by European Law) and controlled
                  by Camel Global Ltd. Payments will be released to the partner once the car hire service is
                  confirmed as complete by both the customer and partner.
                </p>
                <p data-i18n="payment_flow_p2">Payments will be calculated as follows:</p>
                <ul>
                  <li data-i18n="payment_flow_li1">Car hire cost minus Camel Global commission (tbc) = cost transferred to partner.</li>
                  <li data-i18n="payment_flow_li2">Fuel cost minus fuel left in tank = cost transferred to partner.</li>
                </ul>
              </div>

              <div className="card">
                <h3 data-i18n="payment_ops_title">Operational Notes</h3>
                <ul>
                  <li data-i18n="payment_ops_li1">The customer requests and books the meet and greet service through the app.</li>
                  <li data-i18n="payment_ops_li2">The partner has a web-based administration panel to fully manage all bookings and reporting.</li>
                  <li data-i18n="payment_ops_li3">The partner has an app so that each agent (delivery/pickup driver) can see what cars are due out, on hire, or to be collected.</li>
                  <li data-i18n="payment_ops_li4">The apps are available on both Android and iOS.</li>
                  <li data-i18n="payment_ops_li5">When submitting prices, ensure your cost includes full car hire, including delivery and pick up, full insurance with zero excess, and a full tank of fuel.</li>
                  <li data-i18n="payment_ops_li6">The price you enter is your choice, so ensure your costs are covered.</li>
                  <li data-i18n="payment_ops_li7">All terms and conditions and contracts are between the customer and the partner and are accepted by the customer at the time of booking.</li>
                  <li data-i18n="payment_ops_li8">The customer's driving licence is uploaded at the time of booking.</li>
                  <li data-i18n="payment_ops_li9">All payments are held in a client account and controlled by Camel Global Ltd, and are released once the car hire service is confirmed as complete.</li>
                </ul>
              </div>

              <div className="card">
                <h3 data-i18n="payment_offair_title">Off-Airport Only</h3>
                <p data-i18n="payment_offair_p1">
                  The Camel Global system is <strong>NOT</strong> available to any car hire company located at the airport and is
                  designed to distribute the business to the smaller companies off airport, giving the customer the exact
                  experience they want.
                </p>
                <p data-i18n="payment_offair_p2">
                  This is a feedback-based system, therefore it is essential that all bookings are fulfilled and full customer
                  satisfaction is paramount.
                </p>
              </div>
            </div>

            <div className="screens-grid" style={{ marginTop: "2.2rem" }}>
              <figure>
                <img src="/Screenshot 2025-12-11 at 11.51.09.png" alt="Partner web admin login" />
                <figcaption data-i18n="payment_fig1">Partner Web Admin – Secure login for partners.</figcaption>
              </figure>
              <figure>
                <img src="/Screenshot 2025-12-11 at 11.51.16.png" alt="Partner web admin all cars status" />
                <figcaption data-i18n="payment_fig2">Partner Web Admin – Overview of all hire car statuses.</figcaption>
              </figure>
              <figure>
                <img src="/Screenshot 2025-12-11 at 11.51.23.png" alt="Partner web admin booking requests" />
                <figcaption data-i18n="payment_fig3">Partner Web Admin – List of booking requests for partners to price.</figcaption>
              </figure>
              <figure>
                <img src="/Screenshot 2025-12-11 at 11.51.31.png" alt="Partner web admin car hire and fuel cost entry" />
                <figcaption data-i18n="payment_fig4">Partner Web Admin – Enter car hire and fuel costs, including full tank pricing.</figcaption>
              </figure>
              <figure>
                <img src="/Screenshot 2025-12-11 at 11.51.37.png" alt="Partner web admin confirm cost and collect car" />
                <figcaption data-i18n="payment_fig5">Partner Web Admin – Confirm final cost and manage the collect car process.</figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section id="apps" style={{ background: "var(--camel-grey)" }}>
          <div className="section-inner">
            <h2 className="section-title" data-i18n="apps_title">Key Points</h2>
            <p className="section-subtitle" data-i18n="apps_subtitle">Why Camel Global matters to customers and partners</p>

            <div className="kpis">
              <div className="kpi">
                <strong data-i18n="apps_kpi1_title">Multi-million-pound Marketing Budget</strong>
                <span data-i18n="apps_kpi1_body">
                  There is a multi-million-pound marketing budget in place to roll this out across the UK in the
                  coming months, driving demand straight to participating partners.
                </span>
              </div>
              <div className="kpi">
                <strong data-i18n="apps_kpi2_title">Free for Partners to Use</strong>
                <span data-i18n="apps_kpi2_body">
                  It is free for partners to sign up and use the Camel Global system. If you are not part of it,
                  your competitors will be.
                </span>
              </div>
              <div className="kpi">
                <strong data-i18n="apps_kpi3_title">End-to-End Digital Journey</strong>
                <span data-i18n="apps_kpi3_body">
                  From the customer request and booking to payment, fuel confirmation and feedback, everything is
                  handled digitally through the apps and web admin portal.
                </span>
              </div>
            </div>
          </div>
        </section>

        <section id="join" className="cta">
          <div className="cta-inner">
            <h2 data-i18n="join_title">Summary &amp; Join the Camel Global System</h2>
            <p data-i18n="join_p1">
              A multi-million-pound marketing budget is in place to roll this out across the UK in the coming months.
              Sign up and be part of the Camel Global meet and greet car hire system.
            </p>
            <p data-i18n="join_p2">
              It’s free for you to use, and if you’re not part of it…
              <strong>your competitors will be!</strong>
            </p>

            <div style={{ margin: "1.5rem 0" }}>
              <a className="partner-btn partner-btn-primary" href="https://www.camel-global.com" target="_blank" rel="noreferrer" data-i18n="join_button">
                Visit www.camel-global.com
              </a>
            </div>

            <p style={{ fontSize: "0.9rem", opacity: 0.9 }} data-i18n="join_footer">
              Partners = Car hire companies &nbsp; | &nbsp; Agents = Car hire company delivery drivers
            </p>
          </div>
        </section>
      </main>

      <footer>
        <div className="footer-inner">
          <div>
            &copy; <span id="year"></span> Camel Global Ltd.{" "}
            <span data-i18n="footer_rights">All rights reserved.</span>
          </div>
          <div>
            <span data-i18n="footer_website_label">Website:</span>{" "}
            <a href="https://www.camel-global.com" target="_blank" rel="noreferrer">
              www.camel-global.com
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}

export default function Page() {
  const [host, setHost] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
      window.location.replace("/partner/reset-password" + window.location.hash);
      return;
    }
    setHost(window.location.hostname);
  }, []);

  if (host === "test.camel-global.com" || host.includes("localhost")) {
    return <CustomerMapHome />
  }

  return <PartnerMarketingHome />;
}
