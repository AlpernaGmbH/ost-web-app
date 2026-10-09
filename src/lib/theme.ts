// Theme preference: "system" follows the device, "light" and "dark" are forced via data-theme on <html>.
// The choice lives in localStorage of this device; THEME_INIT_SCRIPT applies it before first paint (no flash).

export type ThemePref = "system" | "light" | "dark";
export const THEME_KEY = "pn-theme";
export const THEME_EVENT = "pn-theme-change";

export function parsePref(value: string | null | undefined): ThemePref {
  return value === "light" || value === "dark" ? value : "system";
}

export function readPref(): ThemePref {
  try {
    return parsePref(window.localStorage.getItem(THEME_KEY));
  } catch {
    return "system"; // storage blocked (private mode): follow the system
  }
}

/** Sets or clears data-theme and keeps the browser bar color (theme-color meta) in step with the active theme. */
export function applyPref(pref: ThemePref, doc: Document = document): void {
  const root = doc.documentElement;
  if (pref === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", pref);

  // Next renders one theme-color meta per scheme; when a theme is forced both get that theme's page color.
  const color = doc.defaultView?.getComputedStyle(root).getPropertyValue("--surface-100").trim();
  doc.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    if (!meta.dataset.original) meta.dataset.original = meta.content;
    meta.content = pref === "system" || !color ? meta.dataset.original : color;
  });
}

export function savePref(pref: ThemePref): void {
  try {
    if (pref === "system") window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, pref);
  } catch {
    // not persisted, still applied for this visit
  }
  applyPref(pref);
  window.dispatchEvent(new Event(THEME_EVENT));
}

/** Runs in <head> before the first paint. Must stay plain ES5 and self-contained. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
