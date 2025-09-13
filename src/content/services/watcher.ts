import { debounce, memoize } from "lodash";
import { Strategy } from "./strategy";

export class Watcher {
  private static readonly origPush = history.pushState;
  private static readonly origReplace = history.replaceState;
  private proxied = false;
  private readonly aborter = new AbortController();
  private constructor(private readonly strategy: Strategy) {}

  private fire = debounce(() => {
    try {
      this.strategy.destroy();
    } catch (e) {
      console.warn("[Watcher] destroy error:", e);
    }
    try {
      this.strategy.listen();
    } catch (e) {
      console.warn("[Watcher] listen error:", e);
    }
  }, 50);

  private wrap = (fn: Function) => {
    const watcher = this;
    return function (this: any, ...args: any[]) {
      const ret = fn.apply(this, args);
      console.log({ route: args });
      watcher.fire();
      return ret;
    };
  };

  private proxy() {
    if (this.proxied) {
      console.log("Already proxied");
      return;
    }
    console.log("Proxy routing");
    history.pushState = this.wrap(Watcher.origPush);
    history.replaceState = this.wrap(Watcher.origReplace);
    window.addEventListener("popstate", this.fire, {
      signal: this.aborter.signal,
    });
    window.addEventListener("hashchange", this.fire, {
      signal: this.aborter.signal,
    });
    this.proxied = true;
  }

  private unproxy() {
    if (!this.proxied) {
      console.log("Already unproxied");
      return;
    }
    console.log("Unproxy routing");
    history.pushState = Watcher.origPush;
    history.replaceState = Watcher.origReplace;
    this.aborter.abort();
    this.proxied = false;
  }

  watch() {
    const r = this.strategy.listen();
    console.log(`listen caption result: ${r}`);
    if (r) {
      this.proxy();
    }
  }

  unwatch() {
    this.strategy.destroy();
    console.log("unlisten caption result");
    this.unproxy();
  }

  public static readonly singleton = memoize(
    () => new Watcher(Strategy.singleton())
  );
}
