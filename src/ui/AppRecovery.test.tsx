// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { AppErrorBoundary } from './AppRecovery';

it('replaces a render crash with recovery without touching saved data', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const storage = vi.spyOn(Storage.prototype, 'clear');
  const host = document.createElement('div');
  const root = createRoot(host);
  function Broken(): never { throw new Error('render unavailable'); }
  try {
    act(() => root.render(<AppErrorBoundary><Broken /></AppErrorBoundary>));
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
    expect(host.querySelectorAll('button')).toHaveLength(2);
    expect(storage).not.toHaveBeenCalled();
  } finally {
    act(() => root.unmount());
    spy.mockRestore();
    storage.mockRestore();
  }
});
