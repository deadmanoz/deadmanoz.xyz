/** Parser-blocking script for the root layout `<head>`. Query wins over storage. */
export const THEME_STORAGE_KEY = "deadmanoz-theme";
export const THEME_EVENT = "deadmanoz-theme";

export function currentTheme(): "paper" | "synthwave" {
  return document.documentElement.dataset.theme === "paper" ? "paper" : "synthwave";
}

export const THEME_BOOT_SCRIPT = `(function () {
  try {
    var key = ${JSON.stringify(THEME_STORAGE_KEY)};
    var q = new URLSearchParams(location.search).get("theme");
    if (q === "paper") {
      localStorage.setItem(key, "paper");
    } else if (q === "synthwave") {
      localStorage.removeItem(key);
    }
    if (localStorage.getItem(key) === "paper") {
      document.documentElement.dataset.theme = "paper";
    } else {
      delete document.documentElement.dataset.theme;
    }
  } catch (e) {}
})();`;
