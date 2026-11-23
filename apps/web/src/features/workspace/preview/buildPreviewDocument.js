// Builds the single self-contained page shown in the sandboxed iframe.
// The CSP is the real protection: even if the code does something unexpected, the browser
// blocks network, frames, forms and external files.
export const PREVIEW_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  'img-src data:',
  'font-src data:',
  "connect-src 'none'",
  "frame-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join('; ');

// Runs first inside the sandbox and only ever posts messages UP to the parent.
const bootstrap = (nonce) => `(function(){
var N=${JSON.stringify(nonce)};
function s(t,d){try{window.parent.postMessage({n:N,t:t,d:d},'*');}catch(e){}}
function str(v){try{return typeof v==='string'?v:JSON.stringify(v)}catch(e){return String(v)}}
['log','info','warn','error'].forEach(function(l){var o=console[l];console[l]=function(){
s('log',{level:l,text:Array.prototype.map.call(arguments,str).join(' ')});
try{o.apply(console,arguments)}catch(e){}};});
window.addEventListener('error',function(e){s('error',{message:e.message,line:e.lineno,column:e.colno,name:e.error&&e.error.name});});
window.addEventListener('unhandledrejection',function(e){s('error',{message:str(e.reason&&e.reason.message||e.reason),name:e.reason&&e.reason.name});});
document.addEventListener('securitypolicyviolation',function(){s('blocked');});
setInterval(function(){s('heartbeat');},1000);
s('ready');
})();`;

// Closing tags inside inlined code would end the element early.
const safeScript = (text) => text.replace(/<\/(script)/gi, '<\\/$1');
const safeStyle = (text) => text.replace(/<\/(style)/gi, '<\\/$1');

// files: [{path, content}]. Returns { srcDoc, script }, or null when there is no index.html.
// `script` says where the child's script sits in the page ({ path, startLine, lineCount }), so a
// line reported by the browser can be turned back into a line of that file (null if unknown).
export function buildPreview(files, nonce) {
  const byPath = new Map(files.map((f) => [f.path, f.content]));
  const html = byPath.get('index.html');
  if (html === undefined) return null;

  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('base, meta[http-equiv]').forEach((el) => el.remove());

  doc.querySelectorAll('link[rel~="stylesheet"][href]').forEach((link) => {
    const css = byPath.get(link.getAttribute('href'));
    if (css === undefined) return;
    const style = doc.createElement('style');
    style.textContent = safeStyle(css);
    link.replaceWith(style);
  });
  let mapped = null; // the first project script that was inlined
  doc.querySelectorAll('script[src]').forEach((script) => {
    const path = script.getAttribute('src');
    const js = byPath.get(path);
    if (js === undefined) return;
    const inline = doc.createElement('script');
    inline.textContent = safeScript(js);
    script.replaceWith(inline);
    mapped ??= { path, text: inline.textContent };
  });

  const csp = doc.createElement('meta');
  csp.setAttribute('http-equiv', 'Content-Security-Policy');
  csp.setAttribute('content', PREVIEW_CSP);
  const boot = doc.createElement('script');
  boot.textContent = bootstrap(nonce);
  doc.head.prepend(csp, boot); // CSP first, then our reporter, then the child's code

  const srcDoc = `<!doctype html>${doc.documentElement.outerHTML}`;
  let script = null;
  if (mapped) {
    // An inline script is written as <script>code</script>; look for it after our own reporter.
    const from = srcDoc.indexOf('</script>') + 1;
    const at = srcDoc.indexOf(`<script>${mapped.text}</script>`, from);
    if (at >= 0) {
      const contentStart = at + '<script>'.length;
      script = {
        path: mapped.path,
        startLine: srcDoc.slice(0, contentStart).split('\n').length,
        lineCount: mapped.text.split('\n').length,
      };
    }
  }
  return { srcDoc, script };
}

export function buildPreviewDocument(files, nonce) {
  return buildPreview(files, nonce)?.srcDoc ?? null;
}
