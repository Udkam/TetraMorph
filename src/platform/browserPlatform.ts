export type PlatformTimeout = number | null;
export type PlatformFrame = number | null;
export type PlatformUnsubscribe = () => void;
export type PlatformStorageRead =
  | { readonly status: 'value'; readonly value: string }
  | { readonly status: 'missing' }
  | { readonly status: 'failed' };

export interface PlatformMediaQuery {
  readonly matches: boolean;
  subscribe(listener: (matches: boolean) => void): PlatformUnsubscribe;
}

export interface BrowserPlatformOverrides {
  /** Supplying `null` models a desktop host that has not exposed a browser capability. */
  window?: Window | null;
  document?: Document | null;
  storage?: Storage | null;
  audioContextFactory?: (() => AudioContext | null) | null;
  now?: () => number;
}

const NOOP: PlatformUnsubscribe = () => {};

function hasOverride(object: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

/**
 * Browser-only capability boundary. Core rules never receive this object; hosts may
 * replace it with a WebView/native bridge that preserves these safe fallback semantics.
 */
export class BrowserPlatform {
  constructor(private readonly overrides: BrowserPlatformOverrides = {}) {}

  windowTarget(): Window | null {
    if (hasOverride(this.overrides, 'window')) return this.overrides.window ?? null;
    return typeof window === 'undefined' ? null : window;
  }

  documentTarget(): Document | null {
    if (hasOverride(this.overrides, 'document')) return this.overrides.document ?? null;
    const target = this.windowTarget();
    if (target?.document) return target.document;
    return typeof document === 'undefined' ? null : document;
  }

  storage(): Storage | null {
    if (hasOverride(this.overrides, 'storage')) return this.overrides.storage ?? null;
    try {
      return this.windowTarget()?.localStorage ?? null;
    } catch {
      return null;
    }
  }

  readStorage(key: string): string | null {
    const result = this.readStorageState(key);
    return result.status === 'value' ? result.value : null;
  }

  readStorageState(key: string): PlatformStorageRead {
    try {
      const storage = this.storage();
      if (!storage) return { status: 'failed' };
      const value = storage.getItem(key);
      return value === null ? { status: 'missing' } : { status: 'value', value };
    } catch {
      return { status: 'failed' };
    }
  }

  writeStorage(key: string, value: string): boolean {
    try {
      const storage = this.storage();
      if (!storage) return false;
      const result: unknown = storage.setItem(key, value);
      return result !== false;
    } catch {
      return false;
    }
  }

  removeStorage(key: string): boolean {
    try {
      const storage = this.storage();
      if (!storage) return false;
      const result: unknown = storage.removeItem(key);
      return result !== false;
    } catch {
      return false;
    }
  }

  mediaQuery(query: string): PlatformMediaQuery {
    let list: MediaQueryList | null = null;
    try {
      list = this.windowTarget()?.matchMedia?.(query) ?? null;
    } catch {
      list = null;
    }
    return {
      matches: list?.matches ?? false,
      subscribe: (listener) => {
        if (!list) return NOOP;
        const onChange = (event: MediaQueryListEvent) => listener(event.matches);
        if (typeof list.addEventListener === 'function') {
          list.addEventListener('change', onChange);
          return () => list?.removeEventListener('change', onChange);
        }
        list.addListener(onChange);
        return () => list?.removeListener(onChange);
      },
    };
  }

  scheduleTimeout(callback: () => void, delayMs: number): PlatformTimeout {
    try {
      const target = this.windowTarget();
      return target ? target.setTimeout(callback, Math.max(0, delayMs)) : null;
    } catch {
      return null;
    }
  }

  cancelTimeout(handle: PlatformTimeout): void {
    if (handle === null) return;
    try {
      this.windowTarget()?.clearTimeout(handle);
    } catch {
      // A host may have discarded its timer queue during shutdown.
    }
  }

  defer(callback: () => void): PlatformFrame {
    try {
      const target = this.windowTarget();
      if (target?.requestAnimationFrame) return target.requestAnimationFrame(callback);
    } catch {
      // Fall through to immediate focus/state cleanup below.
    }
    callback();
    return null;
  }

  cancelFrame(handle: PlatformFrame): void {
    if (handle === null) return;
    try {
      this.windowTarget()?.cancelAnimationFrame(handle);
    } catch {
      // A host may have discarded its animation queue during shutdown.
    }
  }

  deferFocus(element: HTMLElement | null): PlatformFrame {
    return this.defer(() => {
      try {
        element?.focus({ preventScroll: true });
      } catch {
        element?.focus();
      }
    });
  }

  activeElement(): HTMLElement | null {
    const element = this.documentTarget()?.activeElement;
    const HTMLElementConstructor = globalThis.HTMLElement;
    return typeof HTMLElementConstructor === 'function' && element instanceof HTMLElementConstructor ? element : null;
  }

  listenWindow(type: string, listener: EventListener, options?: AddEventListenerOptions | boolean): PlatformUnsubscribe {
    const target = this.windowTarget();
    if (!target) return NOOP;
    target.addEventListener(type, listener, options);
    return () => target.removeEventListener(type, listener, options);
  }

  listenDocument(type: string, listener: EventListener, options?: AddEventListenerOptions | boolean): PlatformUnsubscribe {
    const target = this.documentTarget();
    if (!target) return NOOP;
    target.addEventListener(type, listener, options);
    return () => target.removeEventListener(type, listener, options);
  }

  listenVisibility(listener: EventListener): PlatformUnsubscribe {
    return this.listenDocument('visibilitychange', listener);
  }

  documentHidden(): boolean {
    return this.documentTarget()?.hidden ?? false;
  }

  now(): number {
    try {
      if (this.overrides.now) return this.overrides.now();
      const value = globalThis.performance?.now?.();
      return Number.isFinite(value) ? value : Date.now();
    } catch {
      return Date.now();
    }
  }

  createAudioContext(): AudioContext | null {
    try {
      if (hasOverride(this.overrides, 'audioContextFactory')) {
        return this.overrides.audioContextFactory?.() ?? null;
      }
      const target = this.windowTarget() as (Window & { AudioContext?: typeof AudioContext }) | null;
      const AudioContextConstructor = target?.AudioContext ?? globalThis.AudioContext;
      return typeof AudioContextConstructor === 'function' ? new AudioContextConstructor() : null;
    } catch {
      return null;
    }
  }
}

export function createBrowserPlatform(overrides: BrowserPlatformOverrides = {}): BrowserPlatform {
  return new BrowserPlatform(overrides);
}

/** Default browser implementation; package hosts can inject an alternate instance. */
export const browserPlatform = createBrowserPlatform();
