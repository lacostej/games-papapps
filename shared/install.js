// "Install" button for the game menu and home page, plus the service worker that lets the
// installed app work offline. Chromium browsers install through their own prompt; Safari
// and Firefox on Android have no prompt a page can open, so the button shows the steps.
const root = new URL('../', import.meta.url);
const lang = (navigator.languages?.[0] ?? 'en').split('-')[0];
const TEXTS = {
  en: {
    install: 'Install as an app',
    title: 'Install Papapps',
    ios: 'Tap the Share button, then “Add to Home Screen”.',
    firefox: 'Open the ⋮ menu and add this site to your home screen.',
    ok: 'OK',
  },
  fr: {
    install: 'Installer comme une app',
    title: 'Installer Papapps',
    ios: 'Touchez le bouton Partager, puis « Sur l’écran d’accueil ».',
    firefox: 'Ouvrez le menu ⋮ et ajoutez ce site à l’écran d’accueil.',
    ok: 'OK',
  },
};
const text = TEXTS[lang] ?? TEXTS.en;

const ua = navigator.userAgent;
const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
// iPadOS reports itself as a Mac, but with touch.
const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
const firefoxAndroid = /Android/.test(ua) && /Firefox\//.test(ua);
const steps = installed ? null : ios ? text.ios : firefoxAndroid ? text.firefox : null;

const buttons = [];
let prompt = null;

navigator.serviceWorker?.register(new URL('sw.js', root), { scope: root.href }).catch(() => {
  // No offline copy; the site still works online.
});

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  prompt = event;
  update();
});
window.addEventListener('appinstalled', () => {
  prompt = null;
  update();
});

export function installButton() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'install-button';
  button.title = text.install;
  button.setAttribute('aria-label', text.install);
  button.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5M5 19h14"/></svg>';
  button.addEventListener('click', onClick);
  buttons.push(button);
  update();
  return button;
}

function update() {
  for (const button of buttons) button.hidden = installed || !(prompt || steps);
}

async function onClick() {
  if (prompt) {
    const event = prompt;
    prompt = null;
    await event.prompt();
    update();
    return;
  }
  showSteps();
}

function showSteps() {
  const dialog = document.createElement('dialog');
  dialog.className = 'install-dialog';
  const title = Object.assign(document.createElement('h2'), { textContent: text.title });
  const body = Object.assign(document.createElement('p'), { textContent: steps });
  const form = Object.assign(document.createElement('form'), { method: 'dialog' });
  form.append(Object.assign(document.createElement('button'), { textContent: text.ok }));
  dialog.append(title, body, form);
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
}
