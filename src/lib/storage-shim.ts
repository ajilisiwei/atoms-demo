// Published apps run in a sandboxed iframe WITHOUT allow-same-origin, so a
// malicious generated app can never touch a viewer's Atomlet session. The
// trade-off: the opaque origin makes localStorage throw. This shim, injected
// into published HTML, falls back to in-memory storage so generated apps keep
// working (data then lives for the tab session only).
const STORAGE_SHIM = `<script>
(function () {
  try {
    window.localStorage.getItem("__atomlet_probe__");
  } catch (e) {
    var mem = {};
    var shim = {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
      setItem: function (k, v) { mem[k] = String(v); },
      removeItem: function (k) { delete mem[k]; },
      clear: function () { mem = {}; },
      key: function (i) { var ks = Object.keys(mem); return i < ks.length ? ks[i] : null; }
    };
    Object.defineProperty(shim, "length", { get: function () { return Object.keys(mem).length; } });
    try {
      Object.defineProperty(window, "localStorage", { value: shim, configurable: true });
      Object.defineProperty(window, "sessionStorage", { value: shim, configurable: true });
    } catch (e2) {}
  }
})();
</script>`;

export function injectStorageShim(html: string): string {
  const headMatch = html.match(/<head[^>]*>/i);
  if (headMatch && headMatch.index !== undefined) {
    const insertAt = headMatch.index + headMatch[0].length;
    return html.slice(0, insertAt) + STORAGE_SHIM + html.slice(insertAt);
  }
  return STORAGE_SHIM + html;
}
