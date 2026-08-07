// Bootstrap document for in-browser-bundled previews. Served with the same
// CSP `sandbox` header as /p/[slug]/raw so the document gets an opaque
// origin — generated code cannot call Atomlet APIs with viewer cookies.
// The builder posts the compiled document here; document.write makes this
// frame's content identical to what /raw serves after publishing.
export const runtime = "nodejs";

const HOST_HTML = `<!doctype html>
<html>
<head><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:transparent}</style></head>
<body>
<script>
  function report(step, detail) {
    if (window.parent !== window) {
      window.parent.postMessage({ type: "atomlet:host-log", step: step, detail: detail || "" }, "*");
    }
  }
  window.addEventListener("message", function (e) {
    var d = e.data;
    if (!d || d.type !== "atomlet:render" || typeof d.html !== "string") return;
    report("render-received", "len=" + d.html.length);
    try {
      document.open();
      document.write(d.html);
      document.close();
      report("write-done");
    } catch (err) {
      report("write-error", String(err));
    }
  });
  report("boot");
  // Tell the parent we are ready to receive (parent retries until acked).
  if (window.parent !== window) {
    window.parent.postMessage({ type: "atomlet:host-ready" }, "*");
  }
</script>
</body>
</html>`;

export async function GET() {
  return new Response(HOST_HTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "sandbox allow-scripts allow-forms allow-modals",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
