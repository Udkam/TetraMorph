import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/fonts.css';
import './styles.css';
import './styles/tokens.css';
import './styles/mutation-vfx.css';
import './styles/hud.css';
import './styles/navigation.css';
import './styles/endgame-library.css';
import './styles/result.css';
import './styles/settings.css';
import './styles/themes.css';
import './styles/in-page-transitions.css';

const root = document.getElementById('root');
if (!root) throw new Error('TetraMorph root element is missing.');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const bootScreen = document.getElementById('boot-screen');
    if (!bootScreen) return;
    bootScreen.classList.add('boot-screen--leaving');
    const remove = () => bootScreen.remove();
    bootScreen.addEventListener('transitionend', remove, { once: true });
    window.setTimeout(remove, 320);
  });
});
