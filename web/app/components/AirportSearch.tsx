// web/app/components/AirportSearch.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Item = {
  id: number;
  icao: string;
  iata: string | null;
  name: string;
  municipality: string | null;
  iso_country: string | null;
  iso_region: string | null;
  type: string | null;
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
      <label className="block text-sm font-medium mb-2">
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
        className="w-full rounded-xl border px-4 py-3 text-base"
      />

      <div className="mt-3">
        {loading && <div className="text-sm opacity-70">Searching…</div>}

        {!loading && items.length > 0 && (
          <div className="rounded-xl border divide-y overflow-hidden">
            {items.map((a) => (
              <Link
                key={a.id}
                href={`/airports/${encodeURIComponent(a.icao)}`}
                className="block px-4 py-3 hover:bg-black/5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold shrink-0">{a.icao}</span>

                  {a.iata && (
                    <span className="text-xs rounded-md border px-2 py-0.5 shrink-0">
                      {a.iata}
                    </span>
                  )}

                  {/* type can get long; prevent horizontal overflow */}
                  {a.type && (
                    <span className="text-sm opacity-80 truncate min-w-0">
                      {a.type}
                    </span>
                  )}
                </div>

                <div className="text-sm min-w-0">
                  <span className="block truncate">{a.name}</span>

                  {(a.municipality || a.iso_country) && (
                    <span className="block opacity-70 truncate">
                      {a.municipality ?? ""}
                      {a.municipality && a.iso_country ? " " : ""}
                      {a.iso_country ? `(${a.iso_country})` : ""}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && touched && canSearch && items.length === 0 && (
          <div className="text-sm opacity-70">No matches.</div>
        )}

        {!loading && !canSearch && (
          <div className="text-sm opacity-70">
            Type at least 2 characters to search.
          </div>
        )}
      </div>
    </div>
  );
}
