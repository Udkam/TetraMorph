import { Component, type ReactNode } from 'react';
import './recovery.css';

/** Never clear storage as an automatic repair for rendering/device failures. */
export function AppRecovery({ onHome }: { onHome?: () => void }) {
  return <main className="recovery-screen" role="alert">
    <div>
      <p className="recovery-brand">TetraMorph</p>
      <h1>画面暂时无法启动</h1>
      <p>游戏显示遇到了问题。请重新加载，或返回首页再试。已有本地存档不会被清除。</p>
      <p lang="en">The game display could not start. Reload or return home to try again. Saved records will not be cleared.</p>
      <div className="recovery-actions">
        <button type="button" onClick={() => window.location.reload()}>重新加载 / Reload</button>
        <button type="button" onClick={onHome ?? (() => window.location.assign('/'))}>返回首页 / Home</button>
      </div>
    </div>
  </main>;
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <AppRecovery /> : this.props.children; }
}
