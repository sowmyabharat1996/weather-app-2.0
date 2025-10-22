import { useEffect, useRef, useState } from "react";

const label = (code)=>({0:"Clear ☀️",1:"Mainly clear 🌤️",2:"Partly cloudy ⛅",3:"Overcast ☁️",45:"Fog 🌫️",48:"Rime fog 🌫️",51:"Drizzle 🌦️",61:"Rain 🌧️",71:"Snow ❄️",80:"Rain showers 🌧️",95:"Thunderstorm ⛈️"})[code]||"—";

export default function Weather(){
  const [city,setCity] = useState(localStorage.getItem("city")||"");
  const [loading,setLoading] = useState(false);
  const [err,setErr] = useState("");
  const [data,setData] = useState(null);

  // suggestions state
  const [suggests,setSuggests] = useState([]);
  const [open,setOpen] = useState(false);
  const timer = useRef();

  // --- debounce city input for suggestions ---
  useEffect(()=>{
    if(!city.trim()){ setSuggests([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async ()=>{
      try{
        const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=5`);
        const j = await r.json();
        setSuggests(j.results || []);
        setOpen(true);
      }catch{ /* ignore */ }
    }, 300); // 300ms debounce
    return () => clearTimeout(timer.current);
  },[city]);

  async function fetchWeatherByCoords(g){
    setErr(""); setLoading(true); setData(null); setOpen(false);
    try{
      const wx = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${g.latitude}&longitude=${g.longitude}&current_weather=true`
      ).then(r=>r.json());
      const cw = wx.current_weather;
      setData({
        name: g.name, cc: g.country_code || g.country || "",
        temp: Math.round(cw.temperature), wind: Math.round(cw.windspeed),
        code: cw.weathercode, time: new Date(cw.time).toLocaleString(),
      });
      localStorage.setItem("city", g.name);
    }catch{ setErr("Network/API error. Try again."); }
    finally{ setLoading(false); }
  }

  async function onSubmit(e){
    e.preventDefault();
    if (!city.trim()) return;
    // try first suggestion if available
    if(suggests[0]) return fetchWeatherByCoords(suggests[0]);
    // else look up one result
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`).then(r=>r.json());
    if(!res.results?.length) return setErr("City not found.");
    fetchWeatherByCoords(res.results[0]);
  }

  return (
    <main className="w-[92vw] max-w-[620px] mx-auto my-6">
      <div className="bg-white/95 dark:bg-slate-900/80 rounded-2xl shadow-2xl p-6 text-slate-800 dark:text-slate-100">
        <h1 className="text-3xl font-extrabold mb-3">🌦️ Weather</h1>

        <form onSubmit={onSubmit} className="relative">
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Enter city (e.g., Hyderabad)"
              value={city}
              onChange={(e)=>setCity(e.target.value)}
              onFocus={()=>suggests.length && setOpen(true)}
            />
            <button className="rounded-xl bg-blue-600 text-white px-4 py-2 hover:bg-blue-700">Search</button>
          </div>

          {open && suggests.length>0 && (
            <ul className="absolute z-10 mt-2 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow overflow-hidden">
              {suggests.map(s=>(
                <li key={`${s.id}-${s.latitude}-${s.longitude}`}>
                  <button
                    type="button"
                    onClick={()=>fetchWeatherByCoords(s)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-slate-700"
                  >
                    {s.name}, {s.admin1 ? s.admin1 + ", " : ""}{s.country_code || s.country}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>

        <p className="h-6 text-gray-500 dark:text-slate-400 mt-3">{loading ? "Loading…" : err}</p>

        {data && (
          <section className="mt-1">
            <h2 className="text-2xl font-semibold">{data.name}, {data.cc}</h2>
            <div className="mt-2 flex items-center gap-4">
              <div className="text-6xl font-bold">{data.temp}°C</div>
              <div className="text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <WxIcon code={data.code} /><span>{label(data.code)}</span>
                </div>
                <div>Wind: {data.wind} km/h</div>
                <div>Updated: {data.time}</div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

// simple SVG icon per code group
function WxIcon({ code }){
  const cloudy = (
    <svg width="28" height="28" viewBox="0 0 24 24" className="fill-current">
      <path d="M6 19h10a4 4 0 100-8 5 5 0 10-10 1" opacity=".3"/>
      <path d="M6 19a3 3 0 110-6 5 5 0 019.9-.9A4 4 0 1116 19H6z"/>
    </svg>
  );
  const sun = (
    <svg width="28" height="28" viewBox="0 0 24 24" className="fill-current">
      <circle cx="12" cy="12" r="4"/>
      <g opacity=".6"><path d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></g>
    </svg>
  );
  const rain = (
    <svg width="28" height="28" viewBox="0 0 24 24" className="fill-current">
      <path d="M6 16h10a4 4 0 100-8 5 5 0 10-10 1" opacity=".3"/>
      <path d="M8 20l1-2M12 21l1-2M16 20l1-2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  );
  if ([0,1].includes(code)) return sun;
  if ([2,3,45,48].includes(code)) return cloudy;
  if ([51,61,80,95,96,99].includes(code)) return rain;
  return cloudy;
}
