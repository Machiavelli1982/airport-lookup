"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Map, Plane, ShieldCheck } from "lucide-react";

export default function CountryBrowser({ initialData, continents }: any) {
  const [searchTerm, setSearchTerm] = useState("");

  const filterCountries = (list: any[]) => {
    return list.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  return (
    <>
      {/* Suchfeld */}
      <div className="relative mb-12">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
        <input
          type="text"
          placeholder="Search country by name or code (e.g. Germany, US, UK...)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
        />
      </div>

      <div className="space-y-16">
        {continents.map((cont: string) => {
          const filteredList = filterCountries(initialData[cont]);
          if (filteredList.length === 0) return null;

          return (
            <section key={cont} id={cont.replace(/\s+/g, '-').toLowerCase()} className="scroll-mt-10">
              <h2 className="text-xl font-black uppercase tracking-widest text-neutral-400 mb-6 border-b border-neutral-100 dark:border-neutral-800 pb-2 flex items-center gap-2">
                <Map className="w-5 h-5" /> {cont}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredList.map((c: any) => (
                  <Link
                    key={c.code}
                    href={`/countries/${c.code.toLowerCase()}`}
                    className="group p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-blue-400 hover:shadow-lg transition-all flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className="font-bold text-neutral-900 dark:text-white group-hover:text-blue-600 transition-colors leading-tight">
                        {c.name}
                      </span>
                      <span className="text-[10px] font-black bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded text-neutral-400 group-hover:text-blue-500 transition-colors">
                        {c.code}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-tighter">
                      <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                        <Plane className="w-3.5 h-3.5" />
                        {Number(c.airport_count).toLocaleString()}
                      </div>
                      {c.ils_count > 0 && (
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded-md border border-emerald-500/10">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {Number(c.ils_count).toLocaleString()} ILS
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}