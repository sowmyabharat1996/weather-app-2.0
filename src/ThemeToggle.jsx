import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const saved = () => localStorage.getItem("theme");
  const systemPrefersDark = () =>
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const [theme, setTheme] = useState(
    saved() || (systemPrefersDark() ? "dark" : "light")
  );

  // Apply theme + remember
  useEffect(() => {
    const html = document.documentElement;
    theme === "dark" ? html.classList.add("dark") : html.classList.remove("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // If there is NO saved theme, follow system changes live
  useEffect(() => {
    if (saved()) return; // user override exists
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => setTheme(e.matches ? "dark" : "light");
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return (
    <button
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      className="rounded-lg border px-3 py-2 text-sm
                 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-200
                 transition-colors duration-200"
      title="Toggle theme"
    >
      {theme === "dark" ? "🌞 Light" : "🌙 Dark"}
    </button>
  );
}
