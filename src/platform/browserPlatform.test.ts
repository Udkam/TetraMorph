// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { createBrowserPlatform } from './browserPlatform';

describe('BrowserPlatform', () => {
  it('fails closed when a host exposes no browser capabilities', () => {
    const platform = createBrowserPlatform({
      window: null,
      document: null,
      storage: null,
      audioContextFactory: null,
      now: () => 42,
    });
    let deferred = 0;

    expect(platform.readStorage('missing')).toBeNull();
    expect(platform.readStorageState('missing')).toEqual({ status: 'failed' });
    expect(platform.writeStorage('missing', 'value')).toBe(false);
    expect(platform.removeStorage('missing')).toBe(false);
    expect(platform.mediaQuery('(prefers-reduced-motion: reduce)').matches).toBe(false);
    expect(platform.scheduleTimeout(() => { deferred += 1; }, 10)).toBeNull();
    expect(platform.defer(() => { deferred += 1; })).toBeNull();
    expect(deferred).toBe(1);
    expect(platform.documentHidden()).toBe(false);
    expect(platform.activeElement()).toBeNull();
    expect(platform.createAudioContext()).toBeNull();
    expect(platform.now()).toBe(42);
    expect(() => platform.listenWindow('keydown', () => {})()).not.toThrow();
    expect(() => platform.listenVisibility(() => {})()).not.toThrow();
  });

  it('owns storage, media, timer, and listener cleanup through an injected host', () => {
    const listeners = new EventTarget();
    const documentTarget = Object.assign(new EventTarget(), { hidden: true, activeElement: null }) as unknown as Document;
    const callbacks: {
      timer: (() => void) | null;
      frame: (() => void) | null;
      media: ((event: MediaQueryListEvent) => void) | null;
    } = { timer: null, frame: null, media: null };
    let cancelledTimer: number | null = null;
    let cancelledFrame: number | null = null;
    const storageValues = new Map<string, string>();
    const storage = {
      getItem: (key: string) => storageValues.get(key) ?? null,
      setItem: (key: string, value: string) => { storageValues.set(key, value); },
      removeItem: (key: string) => { storageValues.delete(key); },
    } as unknown as Storage;
    const media = {
      matches: true,
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => { callbacks.media = listener; },
      removeEventListener: () => { callbacks.media = null; },
    } as unknown as MediaQueryList;
    const windowTarget = Object.assign(listeners, {
      document: documentTarget,
      localStorage: storage,
      setTimeout: (callback: () => void) => { callbacks.timer = callback; return 17; },
      clearTimeout: (handle: number) => { cancelledTimer = handle; },
      requestAnimationFrame: (callback: () => void) => { callbacks.frame = callback; return 19; },
      cancelAnimationFrame: (handle: number) => { cancelledFrame = handle; },
      matchMedia: () => media,
    }) as unknown as Window;
    const platform = createBrowserPlatform({ window: windowTarget, document: documentTarget, storage });
    let windowEvents = 0;
    let visibilityEvents = 0;
    let mediaMatches = false;
    let timeoutRuns = 0;
    let frameRuns = 0;

    expect(platform.writeStorage('checkpoint', 'ready')).toBe(true);
    expect(platform.readStorage('checkpoint')).toBe('ready');
    expect(platform.readStorageState('checkpoint')).toEqual({ status: 'value', value: 'ready' });
    expect(platform.readStorageState('missing')).toEqual({ status: 'missing' });
    expect(platform.documentHidden()).toBe(true);
    const removeWindow = platform.listenWindow('keydown', () => { windowEvents += 1; });
    const removeVisibility = platform.listenVisibility(() => { visibilityEvents += 1; });
    const removeMedia = platform.mediaQuery('(prefers-reduced-motion: reduce)').subscribe((matches) => { mediaMatches = matches; });
    const timeout = platform.scheduleTimeout(() => { timeoutRuns += 1; }, 10);
    const animationFrame = platform.defer(() => { frameRuns += 1; });

    listeners.dispatchEvent(new Event('keydown'));
    documentTarget.dispatchEvent(new Event('visibilitychange'));
    callbacks.media?.({ matches: false } as MediaQueryListEvent);
    callbacks.timer?.();
    callbacks.frame?.();
    removeWindow();
    removeVisibility();
    removeMedia();
    platform.cancelTimeout(timeout);
    platform.cancelFrame(animationFrame);
    listeners.dispatchEvent(new Event('keydown'));
    documentTarget.dispatchEvent(new Event('visibilitychange'));

    expect({ windowEvents, visibilityEvents, mediaMatches, timeoutRuns, frameRuns, cancelledTimer, cancelledFrame }).toEqual({
      windowEvents: 1,
      visibilityEvents: 1,
      mediaMatches: false,
      timeoutRuns: 1,
      frameRuns: 1,
      cancelledTimer: 17,
      cancelledFrame: 19,
    });
    expect(platform.removeStorage('checkpoint')).toBe(true);
    expect(platform.readStorageState('checkpoint')).toEqual({ status: 'missing' });
  });

  it('keeps empty values distinct from missing keys', () => {
    const storage = {
      getItem: (key: string) => key === 'empty' ? '' : null,
      setItem: () => {},
      removeItem: () => {},
    } as unknown as Storage;
    const platform = createBrowserPlatform({ storage });

    expect(platform.readStorageState('empty')).toEqual({ status: 'value', value: '' });
    expect(platform.readStorageState('missing')).toEqual({ status: 'missing' });
  });

  it('reports storage operation failures without throwing', () => {
    const storage = {
      getItem: () => { throw new Error('read blocked'); },
      setItem: () => { throw new Error('write blocked'); },
      removeItem: () => { throw new Error('remove blocked'); },
    } as unknown as Storage;
    const platform = createBrowserPlatform({ storage });

    expect(platform.readStorageState('checkpoint')).toEqual({ status: 'failed' });
    expect(platform.readStorage('checkpoint')).toBeNull();
    expect(platform.writeStorage('checkpoint', 'ready')).toBe(false);
    expect(platform.removeStorage('checkpoint')).toBe(false);
  });

  it('honors explicit host write and removal failures', () => {
    const storage = {
      getItem: () => null,
      setItem: () => false,
      removeItem: () => false,
    } as unknown as Storage;
    const platform = createBrowserPlatform({ storage });

    expect(platform.writeStorage('checkpoint', 'ready')).toBe(false);
    expect(platform.removeStorage('checkpoint')).toBe(false);
  });

  it('resolves the storage capability once per operation', () => {
    let storageReads = 0;
    const storage = {
      getItem: () => 'ready',
      setItem: () => {},
      removeItem: () => {},
    } as unknown as Storage;
    const windowTarget = {
      get localStorage() {
        storageReads += 1;
        return storage;
      },
    } as unknown as Window;
    const platform = createBrowserPlatform({ window: windowTarget });

    expect(platform.readStorageState('checkpoint')).toEqual({ status: 'value', value: 'ready' });
    expect(storageReads).toBe(1);
    expect(platform.writeStorage('checkpoint', 'ready')).toBe(true);
    expect(storageReads).toBe(2);
    expect(platform.removeStorage('checkpoint')).toBe(true);
    expect(storageReads).toBe(3);
  });

  it('reports a throwing localStorage getter as failed', () => {
    const windowTarget = {
      get localStorage(): Storage {
        throw new Error('storage getter blocked');
      },
    } as unknown as Window;
    const platform = createBrowserPlatform({ window: windowTarget });

    expect(platform.readStorageState('checkpoint')).toEqual({ status: 'failed' });
    expect(platform.writeStorage('checkpoint', 'ready')).toBe(false);
    expect(platform.removeStorage('checkpoint')).toBe(false);
  });
});
