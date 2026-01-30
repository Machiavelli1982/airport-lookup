// web/lib/flightData.ts

export interface Flight {
  callsign: string;
  ident: string;
  origin: string;
  destination: string;
  time: string;
}

export async function getAirportFlights(icao: string, type: 'arrivals' | 'departures'): Promise<Flight[]> {
  // Hier können wir später einfach zwischen Aviation Edge, FlightAware etc. switchen
  // Aktuell nutzen wir einen "Mock" oder einen legalen Test-Endpunkt
  
  // BEISPIEL: Wenn wir Aviation Edge nutzen würden:
  // const API_KEY = process.env.AVIATION_EDGE_KEY;
  // const url = `https://aviation-edge.com/v2/public/timetable?key=${API_KEY}&iataCode=${iata}&type=${type}`;
  
  return []; // Placeholder
}

/**
 * Gibt die Transition Altitude basierend auf Land und Höhe zurück.
 * Werte basieren auf Standard-Prozeduren (Stand 2026 für Sim-Nutzung).
 */
export function getTransitionAltitude(iso_country: string, elevation_ft: number | null): string {
  const code = (iso_country || "").toUpperCase();
  
  // Spezifische Länder-Standards (in Fuß)
  const countryMap: Record<string, number> = {
    US: 18000, // USA
    CA: 18000, // Kanada
    JP: 14000, // Japan
    NZ: 13000, // Neuseeland
    AU: 10000, // Australien
    AT: 10000, // Österreich (seit 2016 allgemein 10k, LOWI/Innsbruck speziell)
    DE: 5000,  // Deutschland (Standard, kann variieren)
    CH: 14000, // Schweiz (oft hoch wegen Alpen, MIL OFF hat andere)
    FR: 5000,  // Frankreich (oft 5000, variiert lokal)
    GB: 6000,  // UK (Standard Transition Altitude oft 3000-6000)
    NL: 3000,  // Niederlande (sehr niedrig)
    BE: 4500,  // Belgien
    IT: 6000,  // Italien
    TH: 11000, // Thailand
    CN: 9850,  // China (3000m ~ 9840ft)
    RU: 10000, // Russland (nutzt oft QFE/Metrisch, aber 10k ist guter Sim-Wert)
  };

  if (countryMap[code]) {
    return `${countryMap[code].toLocaleString("en-US")} ft`;
  }

  // Fallback-Logik für alle anderen Länder:
  // Wenn der Flughafen sehr hoch liegt (z.B. La Paz), muss die TA darüber liegen.
  // Formel: Nächster voller Tausender über (Elevation + 2000ft)
  if (elevation_ft && elevation_ft > 2000) {
    const minSafe = elevation_ft + 3000;
    const rounded = Math.ceil(minSafe / 1000) * 1000;
    // Deckelung, falls Berechnung unsinnig hoch wird, aber min 5000
    return `${Math.max(5000, rounded).toLocaleString("en-US")} ft`;
  }

  // Globaler Standard-Fallback (z.B. Südamerika/Afrika oft niedrig ohne Radar)
  return "5,000 ft";
}