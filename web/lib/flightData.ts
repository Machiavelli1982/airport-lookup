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