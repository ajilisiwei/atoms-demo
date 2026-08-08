// Published apps are served with a `Content-Security-Policy: sandbox` header,
// giving them an opaque origin so a malicious generated app can never call
// Atomlet APIs with a viewer's session. The trade-off: opaque origins make
// localStorage throw. This shim, injected into published HTML, falls back to
// in-memory storage so generated apps keep working (data then lives for the
// tab session only).
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

// Mirrors console output and uncaught errors to the parent window so the
// builder's console panel can show them. On the public published page nobody
// listens and the messages are inert. Objects are JSON-stringified (capped)
// so logs beat "[object Object]" where possible.
const CONSOLE_BRIDGE = `<script>
(function () {
  function fmt(v) {
    if (typeof v === "string") return v;
    if (v instanceof Error) return v.message + (v.stack ? "\\n" + v.stack.split("\\n").slice(1, 3).join("\\n") : "");
    try {
      var s = JSON.stringify(v);
      if (s && s.length > 400) s = s.slice(0, 400) + "…";
      return s === undefined ? String(v) : s;
    } catch (e) { return String(v); }
  }
  function send(level, args) {
    try {
      parent.postMessage({
        type: "atomlet:console",
        level: level,
        text: Array.prototype.map.call(args, fmt).join(" ")
      }, "*");
    } catch (e) {}
  }
  ["log", "info", "debug", "warn", "error"].forEach(function (k) {
    var orig = console[k];
    var level = k === "warn" ? "warn" : k === "error" ? "error" : "info";
    console[k] = function () { send(level, arguments); if (orig) orig.apply(console, arguments); };
  });
  window.addEventListener("error", function (e) {
    send("error", [e.message + (e.filename ? " (" + e.filename + ":" + e.lineno + ")" : "")]);
  });
  window.addEventListener("unhandledrejection", function (e) {
    send("error", ["Unhandled rejection: " + fmt(e.reason)]);
  });
})();
</script>`;

export function injectStorageShim(html: string): string {
  const inject = STORAGE_SHIM + CONSOLE_BRIDGE;
  const headMatch = html.match(/<head[^>]*>/i);
  if (headMatch && headMatch.index !== undefined) {
    const insertAt = headMatch.index + headMatch[0].length;
    return html.slice(0, insertAt) + inject + html.slice(insertAt);
  }
  return inject + html;
}
