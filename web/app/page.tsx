"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function normalizeCode(input: string) {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export default function Home() {
  const router = useRouter();
  const [codeRaw, setCodeRaw] = useState("");

  const code = useMemo(() => normalizeCode(codeRaw), [codeRaw]);
  const isValid = code.length === 3 || code.length === 4;

  function go() {
    if (!isValid) return;
    router.push(`/airports/${code}`);
  }

  return (
    <main className="min-h-screen bg-white px-4 py-6">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Airport Lookup</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Runways, frequencies & navaids. Reference only — not for real-world navigation.
          </p>
        </header>

        <div className="rounded-2xl border border-neutral-200 p-4 shadow-sm">
          <label className="text-sm font-medium text-neutral-900">
            ICAO / IATA code
          </label>

          <div className="mt-2 flex gap-2">
            <input
              className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base outline-none focus:border-neutral-400"
              placeholder="e.g. LOWW or EDDF"
              inputMode="text"
              autoCapitalize="characters"
              autoCorrect="off"
              value={codeRaw}
              onChange={(e) => setCodeRaw(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") go();
              }}
            />
            <button
              type="button"
              onClick={go}
              disabled={!isValid}
              className="shrink-0 rounded-xl bg-neutral-900 px-5 py-3 text-base font-medium text-white disabled:opacity-40"
            >
              Go
            </button>
          </div>

          <p className="mt-2 text-xs text-neutral-600">
            {isValid ? (
              <>Will open: <span className="font-semibold">{code}</span></>
            ) : (
              <>Enter a 3- or 4-letter code (IATA/ICAO).</>
            )}
          </p>

          <div className="mt-4 text-sm text-neutral-700">
            Examples:
            <div className="mt-2 flex flex-wrap gap-2">
              {["LOWW", "EDDF", "EGLL", "KJFK"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => router.push(`/airports/${c}`)}
                  className="rounded-full border border-neutral-200 px-3 py-2"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <footer className="mt-8 space-y-2 text-xs text-neutral-600">
          <p>No official charts are hosted or embedded. We only link to official sources.</p>
          <p>Data: OurAirports (Public Domain) — no guarantee of accuracy.</p>
        </footer>
      </div>
    </main>
  );
}
