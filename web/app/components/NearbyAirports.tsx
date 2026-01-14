// web/app/components/NearbyAirports.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Item = {
  icao: string;
  iata: string | null;
  name: string;
  municipality: string | null;
  iso_country: string | null;
  type: string;
  distance_km?: number;
};

type Status = "idle" | "locating" | "loading" | "ready" | "error";

function countryFromNavigator(): string | null {
  const lang =
    (typeof navigator !== "undefined" && (navigator.language || "")) || "";
  // e.g. "de-AT", "en-US"
  const parts = lang.split("-");
  if (parts.length >= 2 && parts[1]) return parts[1].toUpperCase();
  return null;
}

export default function NearbyAirports() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [mode, setMode] = useState<"geo" | "country" | null>(null);

  const fallbackCountry = useMemo(() => countryFromNavigator(), []);

  async function loadByGeo() {
    setError(null);
    setMode(null);
    setStatus("locating");

    if (!("geolocation" in navigator)) {
      setStatus("error");
      setError("Geolocation not supported on this device.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          setStatus("loading");
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;

          const res = await fetch(`/api/nearby?lat=${lat}&lon=${lon}&limit=12`, {
            cache: "no-store",
          });
          if (!res.ok) throw new Error("Failed to load nearby airports.");
          const data = await res.json();

          setItems(data.items || []);
          setMode("geo");
          setStatus("ready");
        } catch (e: any) {
          setStatus("error");
          setError(e?.message || "Failed to load nearby airports.");
        }
      },
      (geoErr) => {
        setStatus("error");
        // Permission denied is common
        if (geoErr.code === 1) setError("Location permission denied.");
        else setError("Could not determine your location.");
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 8_000 }
    );
  }

  async function loadByCountry() {
    const cc = fallbackCountry;
    if (!cc) {
      setStatus("error");
      setError("Could not infer your country from browser settings.");
      return;
    }

    try {
      setError(null);
      setStatus("loading");
      const res = await fetch(`/api/nearby?country=${cc}&limit=12`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load airports for your country.");
      const data = await res.json();

      setItems(data.items || []);
      setMode("country");
      setStatus("ready");
    } catch (e: any) {
      setStatus("error");
      setError(e?.message || "Failed to load airports for your country.");
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Nearby airports
          </h2>
          <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
            Optional: use your device location to show large/medium airports near
            you.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={loadByGeo}
            disabled={status === "locating" || status === "loading"}
            className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-60"
          >
            {status === "locating"
              ? "Locating…"
              : status === "loading"
              ? "Loading…"
              : "Use my location"}
          </button>

          {/* Country fallback only shows if we have a country code */}
          {fallbackCountry && (
            <button
              type="button"
              onClick={loadByCountry}
              disabled={status === "loading"}
              className="text-xs underline underline-offset-2 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              No location? Show airports in {fallbackCountry}
            </button>
          )}
        </div>
      </div>

      {status === "error" && error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {status === "ready" && items.length === 0 && (
        <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-300">
          No nearby airports found.
        </p>
      )}

      {items.length > 0 && (
        <ul className="mt-4 space-y-2">
          {items.map((a) => (
            <li
              key={a.icao}
              className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/airports/${a.icao}`}
                    prefetch={false}
                    className="text-sm font-medium text-neutral-900 dark:text-neutral-100 underline underline-offset-2"
                  >
                    {a.icao}
                    {a.iata ? ` / ${a.iata}` : ""} — {a.name}
                  </Link>
                  <div className="mt-0.5 text-xs text-neutral-700 dark:text-neutral-300">
                    {(a.municipality ? `${a.municipality} · ` : "")}
                    {a.iso_country || ""}
                    {mode === "geo" && typeof a.distance_km === "number"
                      ? ` · ${Math.round(a.distance_km)} km`
                      : ""}
                  </div>
                </div>

                <div className="shrink-0 text-[11px] text-neutral-600 dark:text-neutral-400">
                  {a.type === "large_airport" ? "Large" : "Medium"}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
