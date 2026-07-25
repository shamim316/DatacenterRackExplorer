"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getTheme() {
  return document.documentElement.dataset.theme || "dark";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "dark");

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("rackdoc-theme", next);
    } catch {}
    listeners.forEach((cb) => cb());
  }

  return (
    <button
      onClick={toggle}
      className="btn btn-ghost !p-2"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
