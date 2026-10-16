import { ProjectGrid } from './grid.js';
import { initInteractiveElements } from './interactive-card.js';
import { KeyboardNavigation } from './keyboard-navigation.js';
import { initModalRouting } from './modal.js';
import { initLazyLoader } from './lazyloader.js';
import { getCurrentLang } from './i18n.js';

// Page copy. Project descriptions are localised in the feed files; this covers the chrome.
const COPY = {
  en: {
    'hero.eyebrow': 'Creative lab · Est. 2025',
    'hero.title': 'Digital objects for everyday life',
    'hero.lead': 'OVJECT is a creative lab making playful apps and games with the feel of real things. Tap, snap, pop, and keep them close.',
    'hero.about': 'About the studio',
    'work.title': 'Work',
    'search.placeholder': 'Search',
    'footer.tagline': 'Digital objects for everyday life.',
    'cookie.text': 'We use cookies to analyze traffic and improve your experience.',
    'cookie.ok': 'OK',
    'cookie.policy': 'Privacy Policy',
    'cookie.policyHref': 'Privacy Policy.html'
  },
  ko: {
    'hero.eyebrow': '크리에이티브 랩 · Est. 2025',
    'hero.title': '일상에 공명하는 디지털 오브제',
    'hero.lead': 'OVJECT는 실제 물건을 만지는 듯한 감각의 앱과 게임을 만드는 크리에이티브 랩입니다. 탭, 촵, 뿅. 늘 곁에 두세요.',
    'hero.about': '스튜디오 소개',
    'work.title': '프로젝트',
    'search.placeholder': '검색',
    'footer.tagline': '일상에 공명하는 디지털 오브제.',
    'cookie.text': '트래픽 분석과 경험 개선을 위해 쿠키를 사용합니다.',
    'cookie.ok': '확인',
    'cookie.policy': '개인정보처리방침',
    'cookie.policyHref': 'privacy_policy.html'
  }
};

function t(lang, key) {
  return (COPY[lang] && COPY[lang][key]) || COPY.en[key] || '';
}

function applyCopy(lang) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(lang, el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(lang, el.dataset.i18nPlaceholder);
  });
}

// The hero tiles drift slightly with the pointer, further for the tiles in front.
function initHeroParallax() {
  const cluster = document.querySelector('.hero-objects');
  if (!cluster) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;

  const objects = Array.from(cluster.querySelectorAll('.obj'));
  const travel = [8, 14, 22]; // px per unit of pointer offset, back to front
  let targetX = 0, targetY = 0, x = 0, y = 0, frame = null;

  const tick = () => {
    x += (targetX - x) * 0.08;
    y += (targetY - y) * 0.08;
    objects.forEach((obj, i) => {
      const d = travel[i] ?? 12;
      obj.style.setProperty('--px', `${(x * d).toFixed(2)}px`);
      obj.style.setProperty('--py', `${(y * d).toFixed(2)}px`);
    });
    const settled = Math.abs(targetX - x) < 0.002 && Math.abs(targetY - y) < 0.002;
    frame = settled ? null : requestAnimationFrame(tick);
  };

  window.addEventListener('pointermove', e => {
    const rect = cluster.getBoundingClientRect();
    targetX = ((e.clientX - (rect.left + rect.width / 2)) / window.innerWidth) * 2;
    targetY = ((e.clientY - (rect.top + rect.height / 2)) / window.innerHeight) * 2;
    if (!frame) frame = requestAnimationFrame(tick);
  }, { passive: true });
}

function initCookieToast(lang) {
  try {
    if (localStorage.getItem('cookie_consent')) return;
  } catch (e) {
    return;
  }

  const toast = document.createElement('div');
  toast.id = 'cookie-toast';
  toast.setAttribute('role', 'status');
  toast.innerHTML = `
    <div class="cookie-text"></div>
    <div class="cookie-actions">
      <button id="cookie-accept" class="cookie-btn" type="button"></button>
      <a class="cookie-link" target="_blank" rel="noopener"></a>
    </div>`;
  toast.querySelector('.cookie-text').textContent = t(lang, 'cookie.text');
  toast.querySelector('#cookie-accept').textContent = t(lang, 'cookie.ok');
  const link = toast.querySelector('.cookie-link');
  link.textContent = t(lang, 'cookie.policy');
  link.href = t(lang, 'cookie.policyHref');
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('visible'));

  toast.querySelector('#cookie-accept').addEventListener('click', () => {
    try { localStorage.setItem('cookie_consent', 'true'); } catch (e) { /* storage unavailable */ }
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 500);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const lang = getCurrentLang();
  document.documentElement.lang = lang;
  applyCopy(lang);
  initHeroParallax();

  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  setTimeout(() => initCookieToast(lang), 1500);

  const grid = new ProjectGrid('.grid-container');
  try {
    await grid.init();
  } catch (error) {
    console.error('Could not load the project feed:', error);
  }

  initInteractiveElements();
  initLazyLoader();
  new KeyboardNavigation();
  initModalRouting();
});
