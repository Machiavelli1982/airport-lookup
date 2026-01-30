// web/lib/flightData.ts

export interface Flight {
  callsign: string;
  ident: string;
  origin: string;
  destination: string;
  time: string;
}

export async function getAirportFlights(icao: string, type: 'arrivals' | 'departures'): Promise<Flight[]> {
  // Placeholder für später (Aviation Edge / FlightAware)
  return [];
}

/**
 * FIX: Diese Funktion hat gefehlt und den Crash verursacht.
 * Sie berechnet die Transition Altitude oder nutzt Standards.
 */
export function getTransitionAltitude(iso_country: string, elevation_ft: number | null): string {
  // 1. Ländercode normalisieren
  const code = (iso_country || "").toUpperCase();
  
  // 2. Wichtige Standards (Stand 2026)
  const countryDefaults: Record<string, number> = {
    US: 18000, CA: 18000, MX: 18500,
    DE: 5000,  AT: 10000, CH: 7000, FR: 5000, GB: 6000,
    NL: 3000,  BE: 4500,  IT: 6000, ES: 6000,
    JP: 14000, CN: 9850,  AU: 10000, NZ: 13000,
  };

  // 3. Treffer? Dann zurückgeben.
  if (countryDefaults[code]) {
    return `${countryDefaults[code].toLocaleString("en-US")} ft`;
  }

  // 4. Fallback-Logik für hohe Plätze (z.B. Bolivien)
  if (elevation_ft && elevation_ft > 2000) {
    // (Elevation + 3000) auf den nächsten Tausender runden
    const calculated = Math.ceil((elevation_ft + 3000) / 1000) * 1000;
    return `${Math.max(5000, calculated).toLocaleString("en-US")} ft`;
  }

  // 5. Globaler Standard
  return "5,000 ft";
}