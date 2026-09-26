"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useServerInsertedHTML } from "next/navigation";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "theme";
const COLOR_SCHEME_MEDIA = "(prefers-color-scheme: dark)";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;
  themes: string[];
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ResolvedTheme {
  try {
    return window.matchMedia(COLOR_SCHEME_MEDIA).matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function getStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : null;
  } catch {
    return null;
  }
}

function persistTheme(next: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    return false;
  }
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const resolved = theme === "system" ? getSystemTheme() : theme;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
}

const noFlashScript = `(function() {
  try {
    var stored = localStorage.getItem("theme");
    var root = document.documentElement;
    var dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var resolved = stored === "light" || stored === "dark" ? stored : dark ? "dark" : "light";
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
    root.style.colorScheme = resolved;
  } catch (e) {}
})()`;

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  enableSystem?: boolean;
}

const FALLBACK_VALUE: ThemeContextValue = {
  theme: "system",
  resolvedTheme: "light",
  systemTheme: "light",
  themes: ["light", "dark", "system"],
  setTheme: () => undefined,
};

export function ThemeProvider({
  children,
  defaultTheme = "system",
  enableSystem = true,
}: ThemeProviderProps) {
  useServerInsertedHTML(() => (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: Inject the no-flash theme bootstrap before React hydration
    <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
  ));

  const [storedTheme, setStoredTheme] = useState<Theme | null>(null);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    setStoredTheme(getStoredTheme());
  }, []);

  useEffect(() => {
    const mql = window.matchMedia(COLOR_SCHEME_MEDIA);
    const update = () => setSystemTheme(mql.matches ? "dark" : "light");
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }
      setStoredTheme(isTheme(event.newValue) ? event.newValue : defaultTheme);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [defaultTheme]);

  const theme: Theme = storedTheme ?? defaultTheme;

  const setTheme = useCallback((next: Theme) => {
    setStoredTheme(next);
    persistTheme(next);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const resolvedTheme: ResolvedTheme = theme === "system" ? systemTheme : theme;

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      systemTheme,
      themes: enableSystem ? ["light", "dark", "system"] : ["light", "dark"],
      setTheme,
    }),
    [theme, resolvedTheme, systemTheme, enableSystem, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext) ?? FALLBACK_VALUE;
}
