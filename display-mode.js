(function () {
  const storageKey = 'rbm-display-mode';
  const desktopWidth = 1024;
  const viewport = document.querySelector('meta[name="viewport"]') || document.head.appendChild(Object.assign(document.createElement('meta'), { name: 'viewport' }));
  const originalViewport = viewport.content || 'width=device-width, initial-scale=1';

  function getMode() {
    try {
      const savedMode = localStorage.getItem(storageKey);
      if (savedMode === 'desktop' || savedMode === 'mobile') return savedMode;
    } catch (error) {}
    return window.screen.width <= 768 ? 'mobile' : 'desktop';
  }

  function applyMode(mode) {
    const selectedMode = mode === 'desktop' ? 'desktop' : 'mobile';
    document.documentElement.dataset.rbmDisplayMode = selectedMode;
    viewport.content = selectedMode === 'desktop' && window.screen.width <= 768
      ? `width=${desktopWidth}, initial-scale=1`
      : originalViewport;

    document.querySelectorAll('#rbm-display-mode-control button').forEach((button) => {
      const isSelected = button.dataset.mode === selectedMode;
      button.setAttribute('aria-pressed', String(isSelected));
    });
  }

  function addControl() {
    if (document.getElementById('rbm-display-mode-control')) return;

    const style = document.createElement('style');
    style.textContent = `
      html[data-rbm-display-mode="mobile"] { overflow-x: hidden; }
      html[data-rbm-display-mode="mobile"] body { max-width: 100%; overflow-x: hidden; }
      html[data-rbm-display-mode="mobile"] :where(img, video, canvas, iframe) { max-width: 100%; }
      html[data-rbm-display-mode="mobile"] :where(input, select, textarea, button) { max-width: 100%; }
      html[data-rbm-display-mode="mobile"] table { display: block; max-width: 100%; overflow-x: auto; }
      html[data-rbm-display-mode="mobile"] pre { max-width: 100%; overflow-x: auto; }
      #rbm-display-mode-control {
        position: fixed; left: 12px; bottom: max(12px, env(safe-area-inset-bottom));
        z-index: 2147483646; display: flex; align-items: center; gap: 4px;
        padding: 4px; border: 1px solid #d7dee7; border-radius: 8px;
        background: #fff; box-shadow: 0 3px 14px rgba(15, 23, 42, .16);
        font: 12px/1.2 'Segoe UI', sans-serif; color: #334155;
      }
      #rbm-display-mode-control span { padding: 0 5px; font-weight: 600; }
      #rbm-display-mode-control button {
        min-height: 32px; padding: 0 9px; border: 0; border-radius: 5px;
        background: transparent; color: #475569; font: inherit; cursor: pointer;
      }
      #rbm-display-mode-control button[aria-pressed="true"] {
        background: #e8f1ed; color: #176b56; font-weight: 700;
      }
      #rbm-display-mode-control button:focus-visible {
        outline: 2px solid #176b56; outline-offset: 1px;
      }
    `;
    document.head.appendChild(style);

    const control = document.createElement('div');
    control.id = 'rbm-display-mode-control';
    control.setAttribute('role', 'group');
    control.setAttribute('aria-label', 'Pilih tampilan');
    control.innerHTML = '<span>Tampilan</span><button type="button" data-mode="desktop">Laptop</button><button type="button" data-mode="mobile">HP</button>';
    control.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-mode]');
      if (!button) return;
      applyMode(button.dataset.mode);
      try {
        localStorage.setItem(storageKey, button.dataset.mode);
      } catch (error) {}
    });
    document.body.appendChild(control);
    applyMode(getMode());
  }

  applyMode(getMode());
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addControl, { once: true });
  } else {
    addControl();
  }
  window.addEventListener('storage', (event) => {
    if (event.key === storageKey && (event.newValue === 'desktop' || event.newValue === 'mobile')) {
      applyMode(event.newValue);
    }
  });
})();