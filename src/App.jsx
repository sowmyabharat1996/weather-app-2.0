import React, { useEffect, useRef, useState } from "react";

/* ---------- Status pill ---------- */
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

/* ---------- Temp → gradient (light & dark, fixed class lists) ---------- */
function gradientFromTemp(tempC, isDark) {
  const light = [
    "bg-gradient-to-br from-sky-200 via-cyan-200 to-indigo-200", // default
    "bg-gradient-to-br from-sky-300 via-cyan-300 to-indigo-300", // cold
    "bg-gradient-to-br from-indigo-300 via-purple-300 to-violet-300", // mild
    "bg-gradient-to-br from-orange-300 via-amber-300 to-yellow-300", // warm
    "bg-gradient-to-br from-red-300 via-orange-300 to-amber-300", // hot
  ];
  const dark = [
    "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
    "bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900",
    "bg-gradient-to-br from-indigo-950 via-violet-900 to-purple-900",
    "bg-gradient-to-br from-amber-900 via-orange-900 to-yellow-900",
    "bg-gradient-to-br from-red-950 via-orange-950 to-amber-900",
  ];

  let idx = 0;
  if (tempC == null) idx = 0;
  else if (tempC <= 10) idx = 1;
  else if (tempC <= 20) idx = 2;
  else if (tempC <= 28) idx = 3;
  else idx = 4;

  return isDark ? dark[idx] : light[idx];
}

/* ---------- Fetch with cache fallback ---------- */
async function fetchWithCacheFallback(url, cacheName) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Network error");
    return { data: await res.json(), fromCache: false };
  } catch {
    if ("caches" in window) {
      const cache = await caches.open(cacheName);
      const cached = await cache.match(url);
      if (cached) {
        return { data: await cached.json(), fromCache: true };
      }
    }
    throw new Error("Offline & no cached response");
  }
}

export default function App() {
  const [query, setQuery] = useState("");
  const [weather, setWeather] = useState(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [fromCache, setFromCache] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [isDark, setIsDark] = useState(false);
  const lastRequestRef = useRef(null);

  /* Apply/remove <html class="dark"> when toggled */
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  /* Network listeners */
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  /* Auto-refresh last request when back online */
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

  /* Geocode city → coords (with cache fallback) */
  async function geocodeCity(name) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`;
    const { data } = await fetchWithCacheFallback(url, "geocoding-cache");
    if (!data?.results?.length) throw new Error("City not found");
    const r = data.results[0];
    return { lat: r.latitude, lon: r.longitude };
  }

  /* Load weather for coords (caches + local backup) */
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

  /* Search submit */
  async function onSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      const { lat, lon } = await geocodeCity(query.trim());
      await loadWeatherByCoords(lat, lon);
    } catch (err) {
      setStatusText(err.message || "Search failed");
    }
  }

  const tempC = weather?.current_weather?.temperature ?? null;
  const bg = gradientFromTemp(tempC, isDark);

  return (
    <div className={`min-h-screen ${bg} text-gray-900 dark:text-white transition-colors`}>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header + Toggle */}
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-3">
            <img src="/pwa-192.png" alt="logo" className="h-8 w-8 rounded-lg" />
            Weather <span className="opacity-70 text-lg">2.0</span>
          </h1>
          <button
            onClick={() => setIsDark(v => !v)}
            className="px-3 py-1.5 rounded-lg text-sm bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white shadow transition"
            title="Toggle dark mode"
          >
            {isDark ? "🌙 Dark" : "☀️ Light"}
          </button>
        </header>

        {/* Search */}
        <form onSubmit={onSearch} className="flex gap-3">
          <input
            className="flex-1 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 outline-none bg-white/90 dark:bg-white/80"
            placeholder="Search city (e.g., Hyderabad)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-white shadow">
            Search
          </button>
        </form>

        {/* Card */}
        <div className="mt-6 bg-white/70 dark:bg-white/10 backdrop-blur rounded-2xl p-6 shadow-xl">
          {weather ? (
            <>
              <div className="text-5xl font-extrabold">{Math.round(tempC)}°C</div>
              <div className="mt-2 opacity-90 text-sm">
                Wind: {weather.current_weather?.windspeed ?? "--"} km/h · Direction: {weather.current_weather?.winddirection ?? "--"}°
              </div>
              <div className="mt-2 opacity-75 text-xs">Updated: {new Date().toLocaleString()}</div>
            </>
          ) : (
            <div className="opacity-80">Try: Visakhapatnam, Hyderabad, Delhi…</div>
          )}
        </div>
      </div>

      <StatusPill isOnline={isOnline} fromCache={fromCache} text={statusText} />
    </div>
  );
}
