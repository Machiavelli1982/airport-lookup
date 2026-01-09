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

  const canSearch = useMemo(() => q.trim().length >= 2, [q]);

  useEffect(() => {
    if (!canSearch) {
      setItems([]);
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
        // ignore abort/errors for now
      } finally {
        setLoading(false);
      }
    }, 200); // debounce

    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [q, canSearch]);

  return (
    <div className="w-full max-w-xl">
      <label className="block text-sm font-medium mb-2">ICAO / IATA</label>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="e.g. LOWW, EDDF, JFK…"
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
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{a.icao}</span>
                  {a.iata && (
                    <span className="text-xs rounded-md border px-2 py-0.5">
                      {a.iata}
                    </span>
                  )}
                  <span className="text-sm opacity-80">{a.type}</span>
                </div>
                <div className="text-sm">
                  {a.name}
                  {(a.municipality || a.iso_country) && (
                    <span className="opacity-70">
                      {" "}
                      — {a.municipality ?? ""}{" "}
                      {a.iso_country ? `(${a.iso_country})` : ""}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && canSearch && items.length === 0 && (
          <div className="text-sm opacity-70">No matches.</div>
        )}
      </div>
    </div>
  );
}
