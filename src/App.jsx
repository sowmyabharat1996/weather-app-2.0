import React, { useEffect, useRef, useState } from "react";

/* ---------- Status Pill ---------- */
function StatusPill({ isOnline, fromCache, text }) {
  if (!text) return null;
  const color = !isOnline
    ? "bg-amber-500/90"
    : fromCache
    ? "bg-sky-600/90"
    : "bg-emerald-600/90";
  return (
    <div
      className={`fixed bottom-4 right-4 z-50 px-3 py-1 rounded-full text-sm text-white shadow-lg ${color}`}
    >
      {text}
    </div>
  );
}

/* ---------- Temperature → Gradient ---------- */
function gradientFromTemp(tempC, isDark) {
  const light = [
    "bg-gradient-to-br from-sky-200 via-cyan-200 to-indigo-200",
    "bg-gradient-to-br from-sky-300 via-cyan-300 to-indigo-300",
    "bg-gradient-to-br from-indigo-300 via-purple-300 to-violet-300",
    "bg-gradient-to-br from-orange-300 via-amber-300 to-yellow-300",
    "bg-gradient-to-br from-red-300 via-orange-300 to-amber-300",
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
      if (cached) return { data: await cached.json(), fromCache: true };
    }
    throw new Error("Offline & no cached response");
  }
}

export default function App() {
  const [query, setQuery] = useState("");
  const [weather, setWeather] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [fromCache, setFromCache] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [isDark, setIsDark] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // PWA install prompt/button
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosTip, setShowIosTip] = useState(false);

  const lastRequestRef = useRef(null);

  /* ---------- Theme sync ---------- */
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    const meta = document.querySelector("meta#theme-color");
    if (meta) meta.setAttribute("content", isDark ? "#111827" : "#ffffff");
  }, [isDark]);

  /* ---------- Network events ---------- */
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

  /* ---------- Status auto-hide ---------- */
  useEffect(() => {
    if (!statusText) return;
    const t = setTimeout(() => setStatusText(""), 3000);
    return () => clearTimeout(t);
  }, [statusText]);

  /* ---------- Install prompt handling ---------- */
  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.navigator.standalone === true;
    setIsStandalone(!!standalone);

    const onBip = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    const onAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      setIsStandalone(true);
    };
    window.addEventListener("appinstalled", onAppInstalled);

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos && !standalone) setShowIosTip(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } finally {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  }

  /* ---------- Auto-refresh on reconnect ---------- */
  useEffect(() => {
    (async () => {
      if (isOnline && lastRequestRef.current) {
        try {
          setIsSyncing(true);
          const { data } = await fetchWithCacheFallback(
            lastRequestRef.current,
            "weather-api-cache"
          );
          setWeather(data);
          setFromCache(false);
          setStatusText("Back online — updated");
          setLastUpdated(Date.now());
        } catch {
          /* ignore */
        } finally {
          setIsSyncing(false);
        }
      } else if (!isOnline) {
        setStatusText("Offline mode — showing last saved data");
      }
    })();
  }, [isOnline]);

  /* ---------- Free Open-Meteo Geocoder ---------- */
 /* --- Smarter Geocode with Kerala fix --- */
/* --- Smart geocode with Indian-state fallback --- */
async function geocodeCity(name) {
  const normalized = name.trim().toLowerCase();

  // Common state-level fallbacks → major coastal or capital cities
  const aliases = {
    kerala: { lat: 9.94, lon: 76.26, note: "→ Kochi (Kerala)" },
    goa: { lat: 15.49, lon: 73.83, note: "→ Panaji (Goa)" },
    tamilnadu: { lat: 13.08, lon: 80.27, note: "→ Chennai (Tamil Nadu)" },
    telangana: { lat: 17.38, lon: 78.48, note: "→ Hyderabad (Telangana)" },
    andhrapradesh: { lat: 17.68, lon: 83.21, note: "→ Visakhapatnam (Andhra Pradesh)" },
    maharashtra: { lat: 18.96, lon: 72.82, note: "→ Mumbai (Maharashtra)" },
    gujarat: { lat: 23.03, lon: 72.58, note: "→ Ahmedabad (Gujarat)" },
    karnataka: { lat: 12.97, lon: 77.59, note: "→ Bengaluru (Karnataka)" },
    odisha: { lat: 20.27, lon: 85.84, note: "→ Bhubaneswar (Odisha)" },
    rajasthan: { lat: 26.91, lon: 75.79, note: "→ Jaipur (Rajasthan)" },
    delhi: { lat: 28.61, lon: 77.21, note: "→ New Delhi" },
  };

  if (aliases[normalized]) {
    const { lat, lon, note } = aliases[normalized];
    console.log(`Smart geocode: ${name} ${note}`);
    return { lat, lon };
  }

  // Default Open-Meteo geocode
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    name
  )}&count=1&language=en&format=json`;

  const { data } = await fetchWithCacheFallback(url, "geocoding-cache");
  if (!data?.results?.length) throw new Error("City not found");
  const r = data.results[0];
  return { lat: r.latitude, lon: r.longitude };
}


  /* ---------- Free Open-Meteo Weather (Fixed timezone + nearest cell) ---------- */
  async function loadWeatherByCoords(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=Asia/Kolkata&cell_selection=nearest`;
    lastRequestRef.current = url;
    console.log("Fetching weather from:", url);

    setStatusText(isOnline ? "Fetching latest…" : "Offline: showing cached");
    setIsSyncing(true);

    try {
      const { data, fromCache: cached } = await fetchWithCacheFallback(
        url,
        "weather-api-cache"
      );
      setWeather(data);
      setFromCache(cached);
      localStorage.setItem(
        "lastWeather",
        JSON.stringify({ url, payload: data, ts: Date.now() })
      );
      setStatusText(
        !isOnline
          ? "Offline: showing saved data"
          : cached
          ? "Loaded from cache"
          : "Live update"
      );
      setLastUpdated(Date.now());
    } catch {
      const last = localStorage.getItem("lastWeather");
      if (last) {
        const { payload, ts } = JSON.parse(last);
        setWeather(payload);
        setFromCache(true);
        setStatusText("Loaded last result (local)");
        setLastUpdated(ts || Date.now());
      } else {
        setStatusText(
          !isOnline ? "Offline & no saved data yet" : "Couldn’t load weather"
        );
      }
    } finally {
      setIsSyncing(false);
    }
  }

  /* ---------- Manual refresh ---------- */
  async function refreshWeather() {
    if (!lastRequestRef.current) return;
    setIsSyncing(true);
    try {
      const { data } = await fetchWithCacheFallback(
        lastRequestRef.current,
        "weather-api-cache"
      );
      setWeather(data);
      setFromCache(false);
      setStatusText("Live update");
      setLastUpdated(Date.now());
    } catch {
      setStatusText(
        isOnline ? "Couldn’t refresh" : "Offline — using saved data"
      );
    } finally {
      setIsSyncing(false);
    }
  }

  /* ---------- Search Submit ---------- */
  async function onSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      const { lat, lon } = await geocodeCity(query.trim());
      console.log("Geocoded", query, "→", lat, lon);
      await loadWeatherByCoords(lat, lon);
    } catch (err) {
      setStatusText(err.message || "Search failed");
    }
  }

  const tempC = weather?.current_weather?.temperature ?? null;
  const bg = gradientFromTemp(tempC, isDark);

  return (
    <div className={`min-h-screen ${bg} text-gray-900 dark:text-white transition-colors safe-area`}>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <header className="grid gap-3 mb-6 md:grid-cols-2 md:items-center">
          <div className="flex items-center gap-2">
            <img src="/app-192.png" alt="logo" className="h-8 w-8 rounded-lg" />
            <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-1">
              Weather <span className="opacity-70 text-lg">2.0</span>
            </h1>
          </div>

          <div className="flex items-center gap-3 justify-end">
            {isInstallable && !isStandalone && (
              <button
                onClick={handleInstallClick}
                className="px-3 py-1.5 rounded-lg text-sm bg-emerald-600 text-white hover:bg-emerald-500 shadow shrink-0"
              >
                ⬇️ Install
              </button>
            )}
            <button
              onClick={() => setIsDark((v) => !v)}
              className="px-3 py-1.5 rounded-lg text-sm bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white shadow transition shrink-0"
            >
              {isDark ? "🌙 Dark" : "☀️ Light"}
            </button>
          </div>
        </header>

        {/* Search */}
        <form onSubmit={onSearch} className="flex gap-3">
          <input
            className="flex-1 h-12 rounded-xl px-4 text-gray-900 placeholder-gray-500 outline-none bg-white/90 dark:bg-white/80"
            placeholder="Search city (e.g., Kochi, Hyderabad)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="h-12 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-white shadow active:scale-[0.99]">
            Search
          </button>
        </form>

        {/* Weather Card */}
        <div className="mt-6 bg-white/80 dark:bg-white/10 backdrop-blur rounded-2xl p-5 shadow-xl ring-1 ring-black/5 dark:ring-white/10">
          {weather ? (
            <>
              <div className="text-5xl font-extrabold">
                {Math.round(tempC)}°C
              </div>
              <div className="mt-2 opacity-90 text-sm">
                Wind: {weather?.current_weather?.windspeed ?? "--"} km/h · Dir:{" "}
                {weather?.current_weather?.winddirection ?? "--"}°
              </div>

              <div className="mt-3 flex items-center gap-3 text-xs opacity-75">
                <span>
                  Updated:{" "}
                  {lastUpdated ? new Date(lastUpdated).toLocaleString() : "—"}
                </span>
                <button
                  onClick={refreshWeather}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white transition"
                >
                  🔄 {isSyncing ? "Syncing…" : "Refresh"}
                </button>
                {fromCache && (
                  <span className="italic">Showing cached data</span>
                )}
              </div>
            </>
          ) : (
            <div className="opacity-80">
              Try: Kochi, Hyderabad, Delhi, Mumbai…
            </div>
          )}
        </div>
      </div>

      {showIosTip && !isStandalone && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg text-xs bg-black/70 text-white shadow-md">
          iOS: Tap <span className="font-semibold">Share</span> →{" "}
          <span className="font-semibold">Add to Home Screen</span>
        </div>
      )}

      <StatusPill isOnline={isOnline} fromCache={fromCache} text={statusText} />
    </div>
  );
}
