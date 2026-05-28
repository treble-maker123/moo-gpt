/* eslint-disable @typescript-eslint/no-unused-vars */
// Browser polyfill for node:async_hooks.
// AsyncLocalStorage in Node tracks context across async boundaries via
// the V8 async-hooks API. In the browser there is no equivalent, so we
// fall back to a simple stack-based store that works correctly for the
// synchronous graph execution paths LangGraph.js relies on.

export class AsyncLocalStorage<T> {
  private store: T | undefined = undefined;

  run<R>(store: T, callback: (...args: unknown[]) => R, ...args: unknown[]): R {
    const prev = this.store;
    this.store = store;
    try {
      return callback(...args);
    } finally {
      this.store = prev;
    }
  }

  getStore(): T | undefined {
    return this.store;
  }

  enterWith(store: T): void {
    this.store = store;
  }

  disable(): void {}
}

export class AsyncResource {
  constructor(_type: string) {}
  runInAsyncScope<R>(
    fn: (...args: unknown[]) => R,
    _thisArg?: unknown,
    ...args: unknown[]
  ): R {
    return fn(...args);
  }
  static bind<T extends (...args: unknown[]) => unknown>(fn: T): T {
    return fn;
  }
}

export function createHook() {
  return { enable() {}, disable() {} };
}

export function executionAsyncId(): number {
  return 0;
}
export function triggerAsyncId(): number {
  return 0;
}
