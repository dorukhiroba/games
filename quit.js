/*
 * KQuit: a "Quit to games" button for every game's Esc menu.
 *
 * Games with their own pause/Esc menu put a button in it:
 *   menuEl.append(KQuit.button('their-button-classes'))
 *
 * Games without one get a small ready-made Esc menu:
 *   KQuit.menu({ pause, resume })   // both optional, called when it opens/closes
 *
 * Load it in <head> with a script tag pointing at ../quit.js (add data-lang="tr" for Turkish).
 * On claude.ai (no launcher page to go back to) the button hides itself.
 */
(function () {
  'use strict';

  const LAUNCHER = '../';
  const onSite = !/claude\.ai$|claudeusercontent\.com$/.test(location.hostname);
  // <script src="../quit.js" data-lang="tr"> for Turkish labels.
  const turkish = ((document.currentScript && document.currentScript.dataset.lang) || '').startsWith('tr');
  const LABEL = turkish ? 'Oyunlardan çık' : 'Quit to games';

  function go() { location.href = LAUNCHER; }

  // Tell the launcher's "Continue playing" row that this game was opened.
  if (onSite) {
    try {
      const slug = location.pathname.split('/').filter(Boolean).filter(s => !/\.html?$/.test(s)).pop();
      if (slug) {
        const list = (JSON.parse(localStorage.getItem('kral-recent') || '[]') || []).filter(s => s !== slug);
        list.unshift(slug);
        localStorage.setItem('kral-recent', JSON.stringify(list.slice(0, 8)));
      }
    } catch (e) {}
  }

  // A button that goes back to the launcher. Pass the game's own classes so it
  // matches the menu it sits in; inline styles are only a fallback.
  function button(cls, label) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = (cls || '') + ' kquit-btn';
    b.textContent = label || LABEL;
    if (!cls) b.style.cssText = 'font:inherit;cursor:pointer;padding:10px 18px;border-radius:12px;border:0;background:#e2483d;color:#fff;font-weight:700';
    b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); go(); });
    if (!onSite) b.hidden = true;
    return b;
  }

  let menuState = null;

  // Ready-made Esc menu for games that have none: Resume + Quit to games.
  function menu(opts) {
    if (menuState || !onSite) return menuState;
    opts = opts || {};
    const css = document.createElement('style');
    css.textContent = `
      .kquit-ov{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:#0b0916b3;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
      .kquit-ov[hidden]{display:none}
      .kquit-card{min-width:240px;padding:22px;border-radius:18px;background:#1d1833;color:#f6f3ff;box-shadow:0 20px 50px #0009;display:grid;gap:10px;text-align:center}
      .kquit-card h2{margin:0 0 6px;font-size:22px}
      .kquit-card button{font:inherit;font-size:16px;font-weight:700;cursor:pointer;padding:12px 18px;border-radius:12px;border:0}
      .kquit-resume{background:#3fd0b6;color:#0f0c1d}
      .kquit-card .kquit-btn{background:#2f2850;color:#f6f3ff}
      .kquit-card button:focus-visible{outline:3px solid #ffd25c;outline-offset:2px}
      .kquit-corner{position:fixed;top:max(10px,env(safe-area-inset-top));right:10px;z-index:2147482999;width:40px;height:40px;border-radius:12px;border:0;background:#0b0916a6;color:#fff;font-size:20px;line-height:1;cursor:pointer}
    `;
    document.head.appendChild(css);

    const ov = document.createElement('div');
    ov.className = 'kquit-ov';
    ov.hidden = true;
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    const card = document.createElement('div');
    card.className = 'kquit-card';
    card.innerHTML = `<h2>${turkish ? 'Duraklatıldı' : 'Paused'}</h2>`;
    const resume = document.createElement('button');
    resume.type = 'button';
    resume.className = 'kquit-resume';
    resume.textContent = turkish ? 'Devam et' : 'Resume';
    card.append(resume, button());
    ov.appendChild(card);

    // While open, the rest of the page is inert so Tab can't reach the game's buttons.
    let madeInert = [];
    const setInert = (on) => {
      if (on) madeInert = [...document.body.children].filter(el => el !== ov && !el.inert);
      for (const el of madeInert) el.inert = on;
    };
    const open = () => {
      if (!ov.hidden) return;
      ov.hidden = false;
      setInert(true);
      try { opts.pause && opts.pause(); } catch (e) { console.warn(e); }
      resume.focus();
    };
    const close = () => {
      if (ov.hidden) return;
      ov.hidden = true;
      setInert(false);
      try { opts.resume && opts.resume(); } catch (e) { console.warn(e); }
    };
    resume.addEventListener('click', close);
    ov.addEventListener('pointerdown', (e) => { if (e.target === ov) close(); });
    // Capture phase so the game never sees Esc, and keys don't reach it while open.
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); ov.hidden ? open() : close(); }
      else if (!ov.hidden) e.stopImmediatePropagation(); // default actions (Tab, Enter on buttons) still work
    }, true);

    // Phones have no Esc key: give them a small corner button.
    if (matchMedia('(pointer: coarse)').matches || opts.corner) {
      const c = document.createElement('button');
      c.type = 'button';
      c.className = 'kquit-corner';
      c.setAttribute('aria-label', turkish ? 'Menü' : 'Menu');
      c.textContent = '☰';
      c.addEventListener('click', (e) => { e.stopPropagation(); open(); });
      document.body.appendChild(c);
    }
    document.body.appendChild(ov);
    menuState = { open, close, el: ov };
    return menuState;
  }

  window.KQuit = { go, button, menu, onSite, LABEL };
})();
