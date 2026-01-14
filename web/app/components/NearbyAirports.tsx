"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";

type NearbyAirport = {
  icao: string;
  iata: string | null;
  name: string;
  municipality: string | null;
  iso_country: string | null;
  distance_km: number;
};

type Status = "idle" | "locating" | "loading" | "ready" | "error";

export default function NearbyAirports() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<NearbyAirport[]>([]);

  const canUseGeo = useMemo(() => {
    return typeof window !== "undefined" && "geolocation" in navigator;
  }, []);

  const fetchNearby = useCallback(async (lat: number, lon: number) => {
    setStatus("loading");
    setError(null);

    try {
      const url = `/api/nearby?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&limit=12`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Request failed (${res.status})`);
      }

      const data = (await res.json()) as { items: NearbyAirport[] };
      setItems(Array.isArray(data.items) ? data.items : []);
      setStatus("ready");
    } catch (e: any) {
      setItems([]);
      setStatus("error");
      setError(e?.message || "Failed to load nearby airports.");
    }
  }, []);

  const onUseMyLocation = useCallback(() => {
    if (!canUseGeo) {
      setStatus("error");
      setError("Geolocation is not available in this browser.");
      return;
    }

    setStatus("locating");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        fetchNearby(latitude, longitude);
      },
      (err) => {
        setStatus("error");
        setError(err?.message || "Location permission denied.");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
    );
  }, [canUseGeo, fetchNearby]);

  return (
    <section className="mt-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Nearby airports
          </h2>
          <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
            Optional: uses your device location to show large/medium airports near you.
          </p>
        </div>

        <button
          type="button"
          onClick={onUseMyLocation}
          disabled={status === "locating" || status === "loading"}
          className="shrink-0 rounded-full border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-1.5 text-sm text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50"
        >
          {status === "locating" ? "Locating…" : status === "loading" ? "Loading…" : "Use my location"}
        </button>
      </div>

      {status === "error" && error ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      {status === "ready" && items.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-300">
          No nearby airports found.
        </p>
      ) : null}

      {items.length > 0 ? (
        <ul className="mt-4 divide-y divide-neutral-200 dark:divide-neutral-800">
          {items.map((a) => (
            <li key={a.icao} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/airports/${a.icao}`}
                    prefetch={false}
                    className="text-sm font-medium text-neutral-900 dark:text-neutral-100 underline underline-offset-2"
                  >
                    {a.icao}
                    {a.iata ? ` / ${a.iata}` : ""} — {a.name}
                  </Link>

                  <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                    {(a.municipality || "").trim()}
                    {a.municipality && a.iso_country ? " · " : ""}
                    {a.iso_country || ""}
                  </div>
                </div>

                <div className="shrink-0 text-xs text-neutral-600 dark:text-neutral-400">
                  {Math.round(a.distance_km)} km
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
