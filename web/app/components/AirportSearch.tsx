"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plane, Helicopter, Loader2 } from "lucide-react";

// Erweiterter Typ für die ILS-Daten-Erkennung
type Item = {
  id: number;
  icao: string;
  iata: string | null;
  name: string;
  municipality: string | null;
  iso_country: string | null;
  iso_region: string | null;
  type: string | null;
  has_ils: boolean;
};

export default function AirportSearch() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);

  const canSearch = useMemo(() => q.trim().length >= 2, [q]);

  // Icon-Logic für unterschiedliche Airport-Typen
  const getAirportIcon = (type: string | null) => {
    switch (type) {
      case "large_airport":
        return <Plane className="w-5 h-5 text-blue-600 shrink-0" />;
      case "medium_airport":
        return <Plane className="w-4 h-4 text-emerald-600 shrink-0" />;
      case "small_airport":
        // Ein kleineres Flugzeug für Kleinflugplätze
        return <Plane className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
      case "heliport":
        return <Helicopter className="w-4 h-4 text-purple-600 shrink-0" />;
      default:
        return <Plane className="w-4 h-4 text-neutral-400 shrink-0" />;
    }
  };

  useEffect(() => {
    if (!canSearch) {
      setItems([]);
      setLoading(false);
      return;
    }

    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/airports?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        const data = await res.json();
        setItems(data.items ?? []);
      } catch {
        // ignore abort/errors
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [q, canSearch]);

  return (
    <div className="w-full max-w-xl">
      <label className="block text-sm font-medium mb-2 text-neutral-900 dark:text-neutral-100">
        Search airport (ICAO / IATA / city / name)
      </label>

      <div className="relative">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (!touched) setTouched(true);
          }}
          placeholder="Examples: LOWW, VIE, Vienna, Frankfurt…"
          inputMode="search"
          autoComplete="off"
          className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-4 py-3 text-base text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-neutral-500 shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
        />
        {loading && (
          <div className="absolute right-4 top-3.5">
            <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
          </div>
        )}
      </div>

      <div className="mt-3">
        {!loading && items.length > 0 && (
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800 overflow-hidden bg-white dark:bg-neutral-900 shadow-lg">
            {items.map((a) => (
              <Link
                key={a.id}
                href={`/airports/${encodeURIComponent(a.icao)}`}
                className="group block px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Das dynamische Icon basierend auf dem Typ */}
                  <div className="flex-shrink-0 w-8 flex justify-center">
                    {getAirportIcon(a.type)}
                  </div>
                  
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-neutral-900 dark:text-neutral-100">
                        {a.icao}
                      </span>

                      {a.has_ils && (
                        <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-1 py-0.5 rounded leading-none uppercase tracking-tighter shrink-0">
                          ILS
                        </span>
                      )}

                      {a.iata && (
                        <span className="text-[10px] font-medium rounded border border-neutral-300 dark:border-neutral-700 px-1.5 py-0.5 shrink-0 text-neutral-600 dark:text-neutral-400">
                          {a.iata}
                        </span>
                      )}
                    </div>

                    <div className="text-sm min-w-0">
                      <span className="block truncate text-neutral-900 dark:text-neutral-100 font-medium">
                        {a.name}
                      </span>
                      {(a.municipality || a.iso_country) && (
                        <span className="block truncate text-neutral-500 dark:text-neutral-400 text-xs">
                          {a.municipality ?? ""}{a.municipality && a.iso_country ? ", " : ""}{a.iso_country ?? ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && touched && canSearch && items.length === 0 && (
          <div className="text-sm text-neutral-600 dark:text-neutral-300">
            No matches found for verified 2026 data.
          </div>
        )}
      </div>
    </div>
  );
}