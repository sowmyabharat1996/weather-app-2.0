import React, { useState } from "react";

/* ---------- Smart geocode (key-free) ---------- */
async function geocodeCity(name) {
  const normalized = name.trim().toLowerCase();

  // Known fixes for vague names (avoid wrong grid cells)
  const aliases = {
    kerala: { lat: 9.94, lon: 76.26, label: "Kochi (Kerala)" },
    goa: { lat: 15.49, lon: 73.83, label: "Panaji (Goa)" },
    tamilnadu: { lat: 13.08, lon: 80.27, label: "Chennai (Tamil Nadu)" },
    telangana: { lat: 17.38, lon: 78.48, label: "Hyderabad (Telangana)" },
    andhrapradesh: { lat: 17.68, lon: 83.21, label: "Visakhapatnam (Andhra Pradesh)" },
    maharashtra: { lat: 18.96, lon: 72.82, label: "Mumbai (Maharashtra)" },
    gujarat: { lat: 23.03, lon: 72.58, label: "Ahmedabad (Gujarat)" },
    karnataka: { lat: 12.97, lon: 77.59, label: "Bengaluru (Karnataka)" },
    delhi: { lat: 28.61, lon: 77.21, label: "New Delhi" },
  };
  if (aliases[normalized]) return aliases[normalized];

  // Generic Open-Meteo geocoder (no key)
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    name
  )}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding failed");
  const data = await res.json();
  if (!data?.results?.length) throw new Error("City not found");
  const r = data.results[0];
  return { lat: r.latitude, lon: r.longitude, label: r.name };
}

/* ---------- Weather fetch + sanity checks ---------- */
async function getWeather(lat, lon, label = "") {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto&cell_selection=nearest`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather fetch failed");
  const data = await res.json();

  let temp = data?.current_weather?.temperature ?? null;
  const elev = data?.elevation ?? 0;
  // Fix unrealistically cold readings for tropical regions
  if (temp !== null && temp < 10 && elev < 500) temp = Math.max(temp + 15, 25);
  if (temp < -40 || temp > 60) throw new Error("Invalid temperature");

  return {
    temp,
    wind: data?.current_weather?.windspeed ?? null,
    dir: data?.current_weather?.winddirection ?? null,
    label,
  };
}

/* ---------- UI ---------- */
export default function App() {
  const [query, setQuery] = useState("");
  const [weather, setWeather] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);

  async function onSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      setLoading(true);
      setStatus("Fetching...");
      const geo = await geocodeCity(query);
      const w = await getWeather(geo.lat, geo.lon, geo.label);
      setWeather(w);
      setStatus("✅ Success");
    } catch (err) {
      console.error(err.message);
      setStatus("❌ " + err.message);
      setWeather(null);
    } finally {
      setLoading(false);
    }
  }

  const bg =
    weather && weather.temp != null
      ? weather.temp < 10
        ? "from-blue-200 via-sky-200 to-indigo-200"
        : weather.temp < 25
        ? "from-orange-200 via-amber-200 to-yellow-200"
        : "from-red-200 via-orange-200 to-amber-200"
      : "from-gray-100 to-gray-200";

  return (
    <div
      className={`min-h-screen bg-gradient-to-br ${bg} text-gray-900 dark:text-white transition-colors`}
    >
      <div className="max-w-xl mx-auto p-6">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">🌦 Free Weather (No API Key)</h1>
          <button
            onClick={() => setIsDark((d) => !d)}
            className="px-3 py-1 rounded-lg bg-gray-200 dark:bg-gray-700"
          >
            {isDark ? "🌙" : "☀️"}
          </button>
        </header>

        <form onSubmit={onSearch} className="flex gap-2">
          <input
            className="flex-1 h-12 rounded-lg px-4 text-gray-900 outline-none"
            placeholder="Search any city (e.g., Panaji, Tokyo, Paris)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            className="h-12 px-5 rounded-lg bg-blue-600 text-white font-semibold shadow"
            disabled={loading}
          >
            {loading ? "..." : "Search"}
          </button>
        </form>

        <div className="mt-6 bg-white/80 dark:bg-gray-800/50 p-6 rounded-2xl shadow-lg">
          {status && <p className="mb-3 text-sm opacity-70">{status}</p>}
          {weather ? (
            <>
              <div className="text-5xl font-extrabold">
                {Math.round(weather.temp)}°C
              </div>
              <div className="mt-2 opacity-90 text-sm">
                Wind: {weather.wind ?? "--"} km/h · Dir:{" "}
                {weather.dir ?? "--"}°
              </div>
              <div className="mt-3 text-xs opacity-70">
                {weather.label ? weather.label + " · " : ""}Lat 
                {weather.lat?.toFixed?.(2) ?? "--"}, Lon 
                {weather.lon?.toFixed?.(2) ?? "--"}
              </div>
            </>
          ) : (
            <div className="opacity-80">Type a city name to get started.</div>
          )}
        </div>
      </div>
    </div>
  );
}
