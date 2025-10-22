import { useState } from "react";
import ThemeToggle from "./ThemeToggle";

export default function App() {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState(null);
  const [wx, setWx] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function fetchWeather(e) {
    e?.preventDefault();
    setErr("");
    setWx(null);
    setCity(null);
    if (!query.trim()) return;

    try {
      setLoading(true);

      // Step 1: Geocode city name → latitude/longitude
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          query
        )}&count=1&language=en&format=json`
      );
      const geo = await geoRes.json();
      if (!geo?.results?.length) {
        setErr("City not found");
        setLoading(false);
        return;
      }

      const place = geo.results[0];
      setCity({
        name: place.name,
        country: place.country,
        admin: place.admin1,
      });

      // Step 2: Fetch weather
      const wxRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current_weather=true&windspeed_unit=kmh`
      );
      const data = await wxRes.json();
      setWx(data.current_weather);
    } catch (e) {
      setErr("Unable to fetch weather");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-200 to-blue-300 text-slate-800 dark:from-slate-900 dark:to-slate-800 dark:text-slate-100 transition-colors duration-300">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white/90 dark:bg-slate-800/90 rounded-2xl shadow-xl p-6 transition-colors duration-300">
          
          {/* Header Row */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <span>🌤️ Weather</span>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-300">2.0</span>
            </h1>
            <ThemeToggle />
          </div>

          {/* Search Form */}
          <form onSubmit={fetchWeather} className="mt-2 flex gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city (e.g., Hyderabad)"
              className="flex-1 rounded-lg border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-300"
            />
            <button
              disabled={loading}
              className="rounded-lg bg-sky-600 text-white px-5 py-3 hover:bg-sky-700 disabled:opacity-60"
            >
              {loading ? "Loading..." : "Search"}
            </button>
          </form>

          {/* Errors */}
          {err && <p className="mt-4 text-rose-600">{err}</p>}

          {/* Weather Results */}
          {city && wx && (
            <div className="mt-8">
              <h2 className="text-2xl font-semibold">
                {city.name}
                {city.admin ? `, ${city.admin}` : ""}, {city.country}
              </h2>

              <div className="mt-4 flex items-end gap-8">
                <div className="text-6xl font-extrabold">
                  {Math.round(wx.temperature)}°C
                </div>
                <div className="space-y-1 text-slate-600 dark:text-slate-300">
                  <div>Wind: {wx.windspeed} km/h</div>
                  <div>Direction: {wx.winddirection}°</div>
                  <div>Updated: {new Date(wx.time).toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}

          {/* Default Hint */}
          {!city && !loading && !err && (
            <p className="mt-6 text-slate-500 dark:text-slate-400">
              Try: Visakhapatnam, Hyderabad, Delhi…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
