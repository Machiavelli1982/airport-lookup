"use client";

import { useState } from "react";
import Link from "next/link";
import { Plane, Navigation, Home, Wind, MapPin, Loader2 } from "lucide-react";

type NearbyItem = {
  icao: string;
  iata?: string;
  name: string;
  municipality?: string;
  type: string;
  distance_km?: number;
};

export default function NearbyAirports() {
  const [items, setItems] = useState<NearbyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Icon-Logik basierend auf dem Airport-Typ
  const getIcon = (type: string) => {
    switch (type) {
      case "large_airport": 
        return <Plane className="w-5 h-5 text-blue-600 dark:text-blue-400" title="Large Airport" />;
      case "medium_airport": 
        return <Plane className="w-4 h-4 text-emerald-600 dark:text-emerald-400" title="Medium Airport" />;
      case "small_airport": 
        return <Navigation className="w-4 h-4 text-amber-600 dark:text-amber-400" title="Small Airport" />;
      case "heliport": 
        return <Wind className="w-4 h-4 text-purple-600 dark:text-purple-400" title="Heliport" />;
      default: 
        return <Home className="w-4 h-4 text-neutral-500" />;
    }
  };

  const fetchNearby = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `/api/nearby?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&limit=8`
          );
          if (!res.ok) throw new Error("API Error");
          const data = await res.json();
          setItems(data.items || []);
        } catch (e) {
          setError("Could not fetch nearby airports.");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError(err.code === 1 ? "Please allow location access." : "Location error.");
        setLoading(false);
      }
    );
  };

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2 text-neutral-900 dark:text-white">
          <MapPin className="w-5 h-5 text-red-500" /> Nearby Airports
        </h2>
        <button 
          onClick={fetchNearby}
          disabled={loading}
          className="inline-flex items-center gap-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all disabled:opacity-50"
        >
          {loading && <Loader2 className="w-3 h-3 animate-spin" />}
          {loading ? "Locating..." : "Find Airports Near Me"}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border border-red-100 dark:border-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link 
            key={item.icao} 
            href={`/airports/${item.icao}`}
            className="group flex items-center justify-between p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg transition-all"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex-shrink-0 p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                {getIcon(item.type)}
              </div>
              <div className="overflow-hidden">
                <div className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                  {item.icao} {item.iata ? `/ ${item.iata}` : ""}
                </div>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                  {item.name}
                </div>
              </div>
            </div>
            {item.distance_km && (
              <div className="text-right flex-shrink-0 ml-2">
                <div className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md">
                  {item.distance_km.toFixed(1)} km
                </div>
              </div>
            )}
          </Link>
        ))}
      </div>

      {!loading && items.length === 0 && !error && (
        <p className="text-center py-10 text-sm text-neutral-500 italic border-2 border-dashed border-neutral-100 dark:border-neutral-800 rounded-2xl">
          Click the button above to discover airports around your current position.
        </p>
      )}
    </section>
  );
}