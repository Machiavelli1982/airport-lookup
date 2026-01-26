"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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
  has_ils: boolean; // Neues Feld vom API-Response
};

export default function AirportSearch() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);

  const canSearch = useMemo(() => q.trim().length >= 2, [q]);

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

      <div className="mt-3">
        {loading && (
          <div className="text-sm text-neutral-600 dark:text-neutral-300 flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            Searching…
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800 overflow-hidden bg-white dark:bg-neutral-900 shadow-lg">
            {items.map((a) => (
              <Link
                key={a.id}
                href={`/airports/${encodeURIComponent(a.icao)}`}
                className="block px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0 mb-0.5">
                  <span className="font-bold shrink-0 text-neutral-900 dark:text-neutral-100">
                    {a.icao}
                  </span>

                  {/* SEO ILS Badge: Signalisierter Mehrwert für den User */}
                  {a.has_ils && (
                    <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-1 py-0.5 rounded leading-none shrink-0 uppercase tracking-tighter">
                      ILS
                    </span>
                  )}

                  {a.iata && (
                    <span className="text-[10px] font-medium rounded border border-neutral-300 dark:border-neutral-700 px-1.5 py-0.5 shrink-0 text-neutral-600 dark:text-neutral-400">
                      {a.iata}
                    </span>
                  )}

                  {a.type && (
                    <span className="text-xs text-neutral-500 dark:text-neutral-500 truncate min-w-0 italic">
                      {a.type.replace('_', ' ')}
                    </span>
                  )}
                </div>

                <div className="text-sm min-w-0">
                  <span className="block truncate text-neutral-900 dark:text-neutral-100 font-medium">
                    {a.name}
                  </span>

                  {(a.municipality || a.iso_country) && (
                    <span className="block truncate text-neutral-500 dark:text-neutral-400 text-xs">
                      {a.municipality ?? ""}
                      {a.municipality && a.iso_country ? ", " : ""}
                      {a.iso_country ?? ""}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && touched && canSearch && items.length === 0 && (
          <div className="text-sm text-neutral-600 dark:text-neutral-300">
            No matches found for verfied 2026 data.
          </div>
        )}

        {!loading && !canSearch && (
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            Type at least 2 characters to search...
          </div>
        )}
      </div>
    </div>
  );
}
