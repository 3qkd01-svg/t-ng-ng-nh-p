// Extend only a native request already created by the page after clicking Open.
// No request is created, replayed or re-signed by this hook.
export function installOpenTimeout() {
  const selected = new WeakMap(), prototype = XMLHttpRequest.prototype;
  const open = prototype.open, send = prototype.send;
  prototype.open = function(...args) {
    const result = Reflect.apply(open, this, args);
    try {
      const url = new URL(args[1], location.href);
      selected.set(this, String(args[0]).toUpperCase() === 'POST' && url.origin === location.origin && /\/chat\/grabred\/?$/i.test(url.pathname));
    } catch { selected.set(this, false); }
    return result;
  };
  prototype.send = function(...args) {
    try { if (selected.get(this) && this.timeout < 30000) this.timeout = 30000; } catch {}
    return Reflect.apply(send, this, args);
  };
}
