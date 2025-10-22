import { useTheme } from "./context/ThemeContext";
import Weather from "./components/Weather";

export default function App() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-300 to-blue-300 dark:from-slate-900 dark:to-indigo-950">
      <div className="max-w-[620px] mx-auto px-3 py-4 flex justify-end">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-xl bg-white/70 dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-3 py-1 shadow"
        >
          {theme === "dark" ? "🌞 Light" : "🌙 Dark"}
        </button>
      </div>
      <Weather />
    </div>
  );
}
