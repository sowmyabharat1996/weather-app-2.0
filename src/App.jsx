import React, { useEffect, useRef, useState } from "react";

// --- Little status pill shown in bottom-right ---
function StatusPill({ isOnline, fromCache, text }) {
  if (!text) return null;
  const color = !isOnline
    ? "bg-amber-500/90"
    : fromCache
    ? "bg-sky-600/90"
    : "bg-emerald-600/90";
  return (
    <div className={`fixed bottom-4 right-4 z-50 px-3 py-1 rounded-full text-sm text-white shadow-lg ${color}`}>
      {text}
    </div>
  );
}

// Helper: map temp to a nice gradient
function bgFromTemp(tC) {
  if (tC == null) return "from-slate-900 via-slate-800 to-slate-900";
  if (tC <= 10)   return "from-sky-900 via-sky-800 to-cyan-800";
  if (tC <= 20)   return "from-teal-800 via-sky-700 to-cyan-700";
  if (tC <= 28)   return "from-indigo-800 via-purple-700 to-violet-700";
  if (tC <= 34)   return "from-orange-600 via-amber-500 to-yellow-500";
  return            "from-red-700 via-orange-600 to-amber-600";
}

// Cache-aware fetch: returns last cached JSON when offline
async function fetchWithCacheFallback(url, cacheName) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Network error");
    return { data: await res.json(), fromCache: false };
  } catch (err) {
    if ("caches" in window) {
      const cache = await caches.open(cacheName);
      const cached = await cache.match(url);
      if (cached) {
        return { data: await cached.json(), fromCache: true };
      }
    }
    throw err;
  }
}

export default function App() {
  const [query, setQuery] = useState("");
  const [weather, setWeather] = useState(null);
  const [statusText, setStatusText] = useState("");
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [fromCache, setFromCache] = useState(false);
  const lastRequestRef = useRef(null);

  // Network listeners
  useEffect(() => {
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Auto-refresh when online again (re-fetch last URL silently)
  useEffect(() => {
    (async () => {
      if (isOnline && lastRequestRef.current) {
        try {
          const { data } = await fetchWithCacheFallback(lastRequestRef.current, "weather-api-cache");
          setWeather(data);
          setFromCache(false);
          setStatusText("Back online — updated");
        } catch {/* ignore */}
      } else if (!isOnline) {
        setStatusText("Offline mode — showing last saved data");
      }
    })();
  }, [isOnline]);

  // Geocode city → coords
  async function geocodeCity(name) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`;
    const { data } = await fetchWithCacheFallback(url, "geocoding-cache");
    if (!data?.results?.length) throw new Error("City not found");
    const r = data.results[0];
    return { lat: r.latitude, lon: r.longitude, label: `${r.name}, ${r.admin1 || r.country || ""}`.replace(/, $/, "") };
  }

  // Fetch weather for coords
  async function loadWeatherByCoords(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m`;
    lastRequestRef.current = url;
    setStatusText(isOnline ? "Fetching latest…" : "Offline: showing last saved data if available");

    try {
      const { data, fromCache: cached } = await fetchWithCacheFallback(url, "weather-api-cache");
      setWeather(data);
      setFromCache(cached);
      localStorage.setItem("lastWeather", JSON.stringify({ url, payload: data, ts: Date.now() }));
      setStatusText(!isOnline ? "Offline: showing last saved data" : cached ? "Loaded from cache" : "Live update");
    } catch {
      const last = localStorage.getItem("lastWeather");
      if (last) {
        const { payload } = JSON.parse(last);
        setWeather(payload);
        setFromCache(true);
        setStatusText("Loaded last result (local)");
      } else {
        setStatusText(!isOnline ? "Offline & no saved data yet" : "Couldn’t load weather");
      }
    }
  }

  // On submit: geocode then fetch weather
  async function onSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      const { lat, lon } = await geocodeCity(query.trim());
      await loadWeatherByCoords(lat, lon);
    } catch (e2) {
      setStatusText(e2.message || "Search failed");
    }
  }

  const tempC = weather?.current_weather?.temperature ?? null;
  const bg = bgFromTemp(tempC);

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bg} text-white`}>
      <div className="max-w-4xl mx-auto p-6">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-3">
            <img src="/pwa-192.png" alt="logo" className="h-8 w-8 rounded-lg" />
            Weather <span className="opacity-70 text-lg">2.0</span>
          </h1>
        </header>

        <form onSubmit={onSearch} className="flex gap-3">
          <input
            className="flex-1 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 outline-none"
            placeholder="Search city (e.g., Hyderabad)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold">
            Search
          </button>
        </form>

        {/* Card */}
        <div className="mt-6 bg-white/10 backdrop-blur rounded-2xl p-6 shadow-xl">
          {weather ? (
            <>
              <div className="text-5xl font-extrabold">{Math.round(tempC)}°C</div>
              <div className="mt-2 opacity-90 text-sm">
                Wind: {weather.current_weather?.windspeed ?? "--"} km/h ·
                Direction: {weather.current_weather?.winddirection ?? "--"}°
              </div>
              <div className="mt-2 opacity-75 text-xs">
                Updated: {new Date().toLocaleString()}
              </div>
            </>
          ) : (
            <div className="opacity-80">Search a city to see the weather.</div>
          )}
        </div>
      </div>

      <StatusPill isOnline={isOnline} fromCache={fromCache} text={statusText} />
    </div>
  );
}
