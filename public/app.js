'use strict';

// ---------- constants ----------
const ROLE_LABELS = { admin: 'مدیر', supervisor: 'سرپرست کارگاه', teacher: 'دبیر', staff: 'نیروی خدماتی' };
const STATUS_LABELS = { pending: 'در انتظار', delivered: 'تحویل شده', rejected: 'رد شده', cancelled: 'لغو شده' };
const KIND_LABELS = { create: 'ثبت اولیه', add: 'افزایش موجودی', remove: 'کاهش موجودی', delivery: 'تحویل به درخواست‌کننده' };
const REQUESTER_ROLES = ['teacher', 'staff'];

// Lucide icons (ISC licence), inlined so the app needs no icon font or build step.
const ICONS = {
  dashboard: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  warehouse: '<path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><rect width="12" height="12" x="6" y="10"/>',
  package: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  clipboard: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
  bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
  arrows: '<path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>',
  pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  checkCircle: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>',
  xCircle: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  menu: '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

// ---------- helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fa = (n) => Number(n ?? 0).toLocaleString('fa-IR');
const parseDate = (s) => new Date(s.replace(' ', 'T') + 'Z');
const faDate = (s) => (s ? parseDate(s).toLocaleDateString('fa-IR-u-ca-persian', { month: 'long', day: 'numeric' }) + ' · '
  + parseDate(s).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : '');
const initials = (name) => (name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('‌');
// Accept Persian/Arabic digits typed into number fields.
const toLatin = (s) => String(s).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch('/api' + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/login') {
    state.user = null;
    render();
  }
  if (!res.ok) throw new Error(data.error || 'خطا در ارتباط با سرور');
  return data;
}

let toastTimer;
function toast(msg, isError = false) {
  const el = $('#toast');
  el.innerHTML = `${icon(isError ? 'alert' : 'checkCircle')}<span>${esc(msg)}</span>`;
  el.className = 'show' + (isError ? ' err' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = ''), 3000);
}

function formData(form) {
  const out = {};
  for (const [k, v] of new FormData(form).entries()) out[k] = v;
  return out;
}

// Animates stat numbers from 0 to their value.
function countUp(root) {
  $$('[data-count]', root).forEach((el) => {
    const target = Number(el.dataset.count);
    if (prefersReducedMotion() || target === 0) return (el.textContent = fa(target));
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / 700);
      el.textContent = fa(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

// Copies column headers onto cells so tables can collapse into cards on phones.
function labelTables(root) {
  $$('table', root).forEach((table) => {
    const heads = $$('thead th', table).map((th) => th.textContent.trim());
    $$('tbody tr', table).forEach((tr, i) => {
      tr.style.animationDelay = `${Math.min(i, 12) * 25}ms`;
      $$('td', tr).forEach((td, j) => { if (!td.hasAttribute('colspan')) td.dataset.label = heads[j] || ''; });
    });
  });
}

const emptyState = (title, text = '', ic = 'inbox') => `<div class="empty">${icon(ic)}<b>${esc(title)}</b>${esc(text)}</div>`;
const emptyRow = (cols, title, text) => `<tr><td colspan="${cols}">${emptyState(title, text)}</td></tr>`;
const skeleton = (rows = 5) => `<div class="skeleton">${'<i></i>'.repeat(rows)}</div>`;

function stockCell(qty, unit, pending = 0) {
  const level = qty === 0 ? 'out' : qty <= Math.max(2, pending) ? 'low' : 'ok';
  // Bar is relative to a soft cap so small stocks still show visibly.
  const pct = qty === 0 ? 4 : Math.min(100, Math.max(8, (qty / Math.max(qty, 20)) * 100));
  return `<div class="stock ${level}"><span class="val">${qty === 0 ? 'ناموجود' : `${fa(qty)} ${esc(unit)}`}</span>
    <div class="bar"><i style="width:${pct}%"></i></div></div>`;
}

// Opens a modal with a form; onSubmit returning normally closes it, throwing shows the error.
function modal({ title, body, submitLabel = 'ثبت', submitIcon = 'check', wide = false, onSubmit }) {
  const root = $('#modal-root');
  root.innerHTML = `
    <div class="modal-backdrop">
      <form class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="m-head"><h2>${esc(title)}</h2>
          <button type="button" class="icon-btn" data-close aria-label="بستن">${icon('x')}</button></div>
        <div class="m-body">${body}<div class="error" role="alert"></div></div>
        <div class="footer">
          ${onSubmit ? `<button class="btn primary" type="submit">${icon(submitIcon)}${esc(submitLabel)}</button>` : ''}
          <button class="btn ghost" type="button" data-close>${onSubmit ? 'انصراف' : 'بستن'}</button>
        </div>
      </form>
    </div>`;
  const form = $('form', root);
  const close = () => (root.innerHTML = '');
  $$('[data-close]', root).forEach((b) => (b.onclick = close));
  $('.modal-backdrop', root).onmousedown = (e) => { if (e.target.classList.contains('modal-backdrop')) close(); };
  form.onkeydown = (e) => { if (e.key === 'Escape') close(); };
  labelTables(form);
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (!onSubmit) return close();
    const btn = $('button[type=submit]', form);
    btn.disabled = true;
    btn.classList.add('loading');
    try {
      await onSubmit(formData(form), form);
      close();
    } catch (err) {
      $('.error', form).textContent = err.message;
    } finally {
      btn.disabled = false;
      btn.classList.remove('loading');
    }
  };
  const first = $('.m-body input, .m-body select, .m-body textarea', form) || $('[data-close]', form);
  first.focus();
  return form;
}

const confirmBox = (message) => window.confirm(message);

// ---------- theme ----------
function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('schole-theme', next); } catch {}
  $$('[data-theme-icon]').forEach((el) => (el.innerHTML = icon(next === 'dark' ? 'sun' : 'moon')));
}
const themeIcon = () => icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon');

// ---------- state & routing ----------
const state = { user: null };

const NAV = {
  admin: [
    ['dashboard', 'پیشخوان', 'dashboard'],
    ['users', 'کاربران', 'users'],
    ['workshops', 'کارگاه‌ها', 'warehouse'],
    ['items', 'کالاها', 'package'],
    ['requests', 'درخواست‌ها', 'clipboard'],
  ],
  supervisor: [
    ['dashboard', 'پیشخوان', 'dashboard'],
    ['items', 'کالاهای کارگاه من', 'package'],
    ['requests', 'درخواست‌ها', 'clipboard'],
  ],
  teacher: [
    ['dashboard', 'پیشخوان', 'dashboard'],
    ['catalog', 'درخواست کالا', 'bag'],
    ['requests', 'درخواست‌های من', 'clipboard'],
  ],
};
NAV.staff = NAV.teacher;

const route = () => location.hash.replace(/^#\/?/, '') || 'dashboard';
window.addEventListener('hashchange', render);

async function boot() {
  try {
    state.user = (await api('/me')).user;
  } catch {
    state.user = null;
  }
  render();
}

// Pending-request badge next to «درخواست‌ها» in the menu.
async function refreshNavCount() {
  try {
    const { pending } = await api('/stats');
    const slot = $('[data-nav-count="requests"]');
    if (slot) slot.innerHTML = pending ? `<span class="nav-count">${fa(pending)}</span>` : '';
  } catch {}
}

function render() {
  $('#modal-root').innerHTML = '';
  if (!state.user) return renderLogin();
  const u = state.user;
  const nav = NAV[u.role];
  let current = route();
  if (!nav.some(([key]) => key === current)) current = 'dashboard';
  const brand = `<div class="brand"><div class="brand-mark">${icon('warehouse', 'lg')}</div>
    <div><div class="brand-name">انبار مدرسه</div><div class="brand-sub">سامانه مدیریت کارگاه‌ها</div></div></div>`;
  $('#app').innerHTML = `
    <div class="layout">
      <header class="topbar">
        <button class="icon-btn" id="menu-btn" aria-label="منو">${icon('menu')}</button>
        ${brand}
        <div class="spacer"></div>
        <button class="icon-btn" data-theme-toggle aria-label="تغییر پوسته"><span data-theme-icon>${themeIcon()}</span></button>
      </header>
      <nav class="sidebar" aria-label="منوی اصلی">
        ${brand}
        <div class="nav-label">منو</div>
        ${nav.map(([key, label, ic]) => `<a href="#/${key}" class="nav-link ${key === current ? 'active' : ''}" ${key === current ? 'aria-current="page"' : ''}>
          ${icon(ic)}<span>${label}</span><span data-nav-count="${key}"></span></a>`).join('')}
        <div class="spacer"></div>
        <div class="user-card">
          <div class="avatar">${esc(initials(u.full_name))}</div>
          <div class="meta"><div class="name">${esc(u.full_name)}</div><div class="role">${ROLE_LABELS[u.role]}</div></div>
          <button class="icon-btn" data-theme-toggle title="تغییر پوسته" aria-label="تغییر پوسته"><span data-theme-icon>${themeIcon()}</span></button>
        </div>
        <div class="user-actions">
          <button class="btn sm ghost" id="change-pass">${icon('key')}تغییر رمز</button>
          <button class="btn sm ghost" id="logout">${icon('logout')}خروج</button>
        </div>
      </nav>
      <div class="scrim"></div>
      <main id="view"></main>
    </div>`;
  const layout = $('.layout');
  $('#menu-btn').onclick = () => layout.classList.add('open');
  $('.scrim').onclick = () => layout.classList.remove('open');
  $$('[data-theme-toggle]').forEach((b) => (b.onclick = toggleTheme));
  $('#logout').onclick = async () => {
    await api('/logout', { method: 'POST' });
    state.user = null;
    location.hash = '';
    render();
  };
  $('#change-pass').onclick = changePassword;
  refreshNavCount();
  VIEWS[current]().catch((err) => toast(err.message, true));
}

function renderLogin() {
  $('#app').innerHTML = `
    <div class="login-wrap">
      <section class="login-art" aria-hidden="true">
        <div class="brand" style="padding:0"><div class="brand-mark">${icon('warehouse', 'lg')}</div>
          <div class="brand-name" style="color:#fff">انبار مدرسه</div></div>
        <div>
          <h2>همه‌ی کالاهای کارگاه‌ها،<br>در یک نگاه.</h2>
          <p>موجودی هر کارگاه را ثبت کنید، درخواست دبیرها را بگیرید و هر تحویل را با تاریخ و نام تحویل‌گیرنده نگه دارید.</p>
          <div class="features">
            <div class="feature"><div class="chip">${icon('users')}</div><div><b>نقش‌های جداگانه</b><span>مدیر، سرپرست کارگاه، دبیر و نیروی خدماتی</span></div></div>
            <div class="feature"><div class="chip">${icon('send')}</div><div><b>درخواست آنلاین</b><span>دبیر درخواست می‌دهد، سرپرست تحویل را ثبت می‌کند</span></div></div>
            <div class="feature"><div class="chip">${icon('history')}</div><div><b>گردش کامل کالا</b><span>هر ورود و خروج با جزئیات ثبت می‌شود</span></div></div>
          </div>
        </div>
        <div class="sub" style="color:#6ee7b7">سامانه انبار مدرسه</div>
      </section>
      <section class="login-side">
        <form class="login">
          <div class="brand-mark">${icon('warehouse', 'lg')}</div>
          <h1>ورود به سامانه</h1>
          <p class="lead">نام کاربری و رمز عبوری را که مدیر مدرسه به شما داده وارد کنید.</p>
          <div class="field"><label for="l-user">نام کاربری</label><input id="l-user" name="username" autocomplete="username" dir="ltr" required></div>
          <div class="field"><label for="l-pass">رمز عبور</label>
            <div class="pw"><input id="l-pass" name="password" type="password" autocomplete="current-password" dir="ltr" required>
            <button type="button" class="icon-btn" id="pw-toggle" aria-label="نمایش رمز">${icon('eye')}</button></div></div>
          <div class="error" role="alert"></div>
          <button class="btn primary block" type="submit">ورود</button>
        </form>
      </section>
    </div>`;
  const form = $('form');
  $('#pw-toggle').onclick = () => { const p = $('#l-pass'); p.type = p.type === 'password' ? 'text' : 'password'; };
  $('#l-user').focus();
  form.onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('button[type=submit]', form);
    btn.classList.add('loading');
    try {
      state.user = (await api('/login', { method: 'POST', body: formData(form) })).user;
      location.hash = '#/dashboard';
      render();
    } catch (err) {
      $('.error', form).textContent = err.message;
    } finally {
      btn.classList.remove('loading');
    }
  };
}

function changePassword() {
  modal({
    title: 'تغییر رمز عبور',
    body: `
      <div class="field"><label>رمز فعلی</label><input name="current_password" type="password" dir="ltr" required></div>
      <div class="field"><label>رمز جدید</label><input name="new_password" type="password" dir="ltr" minlength="6" required>
        <div class="hint">حداقل ۶ کاراکتر</div></div>`,
    onSubmit: async (data) => {
      await api('/me/password', { method: 'POST', body: data });
      toast('رمز عبور تغییر کرد');
    },
  });
}

const view = () => $('#view');
const pageHead = (title, subtitle = '', action = '') => `
  <div class="page-head"><div><h1>${title}</h1>${subtitle ? `<p>${subtitle}</p>` : ''}</div>${action}</div>`;

// Renders a page shell with a loading skeleton, then fills it.
function loadingPage(head) {
  view().innerHTML = `<div class="page">${head}<div class="card">${skeleton()}</div></div>`;
}

// ---------- dashboard ----------
async function dashboardView() {
  loadingPage('');
  const [s, requests] = await Promise.all([api('/stats'), api('/requests')]);
  const role = state.user.role;
  const tiles = {
    admin: [['users', 'کاربر فعال', 'users', 'blue'], ['workshops', 'کارگاه', 'warehouse', 'slate'], ['items', 'کالا', 'package', 'green'], ['pending', 'درخواست در انتظار', 'clock', 'amber']],
    supervisor: [['workshops', 'کارگاه من', 'warehouse', 'slate'], ['items', 'کالا', 'package', 'green'], ['low_stock', 'کالای تمام‌شده', 'alert', 'red'], ['pending', 'درخواست در انتظار', 'clock', 'amber']],
    requester: [['pending', 'در انتظار', 'clock', 'amber'], ['delivered', 'تحویل گرفته', 'checkCircle', 'green'], ['rejected', 'رد شده', 'xCircle', 'red']],
  }[REQUESTER_ROLES.includes(role) ? 'requester' : role];

  const steps = {
    admin: [['کاربران را بسازید', 'سرپرست‌ها، دبیرها و نیروهای خدماتی را در بخش «کاربران» تعریف کنید.'],
      ['کارگاه تعریف کنید', 'در بخش «کارگاه‌ها» برای هر کارگاه یک سرپرست تعیین کنید.'],
      ['نظارت کنید', 'همه‌ی کالاها و درخواست‌ها برای شما قابل مشاهده است.']],
    supervisor: [['کالا ثبت کنید', 'کالاهای کارگاه خود را با موجودی اولیه وارد کنید.'],
      ['درخواست‌ها را ببینید', 'درخواست‌های تازه با نشان شمارنده در منو دیده می‌شوند.'],
      ['تحویل را ثبت کنید', 'با ثبت تحویل، مقدار از موجودی کم می‌شود.']],
    requester: [['کالا را پیدا کنید', 'در «درخواست کالا» کالای موردنیاز را جستجو کنید.'],
      ['درخواست بدهید', 'تعداد و کاربرد را بنویسید و ثبت کنید.'],
      ['پیگیری کنید', 'وضعیت را در «درخواست‌های من» دنبال کنید.']],
  }[REQUESTER_ROLES.includes(role) ? 'requester' : role];

  const today = new Date().toLocaleDateString('fa-IR-u-ca-persian', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const cta = REQUESTER_ROLES.includes(role) ? '<a class="btn primary" href="#/catalog">' + icon('plus') + 'درخواست جدید</a>'
    : role === 'supervisor' ? '<a class="btn primary" href="#/requests">' + icon('clipboard') + 'رسیدگی به درخواست‌ها</a>' : '';

  view().innerHTML = `
    <div class="page stagger">
      <section class="hero">
        <div class="date">${today}</div>
        <h1>سلام، ${esc(state.user.full_name)}</h1>
        <p>${ROLE_LABELS[role]} · خلاصه‌ی وضعیت انبار در ادامه آمده است.</p>
      </section>
      <div class="stats">
        ${tiles.map(([k, label, ic, color]) => `
          <div class="stat"><div class="chip ${color}">${icon(ic, 'lg')}</div>
            <div><div class="num" data-count="${s[k] || 0}">۰</div><div class="label">${label}</div></div></div>`).join('')}
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-head"><h2>آخرین درخواست‌ها</h2><a href="#/requests">مشاهده همه</a></div>
          <div id="recent">${requestsTable(requests.slice(0, 6), { compact: true })}</div>
        </div>
        <div class="card">
          <div class="card-head"><h2>راهنمای شروع</h2>${cta}</div>
          <div class="card-body"><ol class="steps">
            ${steps.map(([t, d], i) => `<li><span class="n">${fa(i + 1)}</span><div><b>${t}</b><br>${d}</div></li>`).join('')}
          </ol></div>
        </div>
      </div>
    </div>`;
  countUp(view());
  labelTables(view());
}

// ---------- users (admin) ----------
async function usersView() {
  const head = pageHead('کاربران', 'تعریف نقش‌ها و حساب‌های کاربری مدرسه',
    `<button class="btn primary" id="add-user">${icon('plus')}کاربر جدید</button>`);
  loadingPage(head);
  const users = await api('/users');
  let filter = '';
  view().innerHTML = `
    <div class="page">${head}
      <div class="card">
        <div class="toolbar">
          <div class="segmented" id="role-filter">
            <button type="button" data-v="" class="on">همه <span class="sub">${fa(users.length)}</span></button>
            ${Object.entries(ROLE_LABELS).map(([k, v]) => `<button type="button" data-v="${k}">${v} <span class="sub">${fa(users.filter((u) => u.role === k).length)}</span></button>`).join('')}
          </div>
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th>نام</th><th>نام کاربری</th><th>نقش</th><th>وضعیت</th><th></th></tr></thead>
          <tbody id="users-body"></tbody>
        </table></div>
      </div>
    </div>`;

  const draw = () => {
    const rows = users.filter((u) => !filter || u.role === filter);
    $('#users-body').innerHTML = rows.length ? rows.map((u) => `
      <tr>
        <td><div class="cell-item"><div class="avatar" style="width:34px;height:34px;font-size:13px">${esc(initials(u.full_name))}</div><span class="strong">${esc(u.full_name)}</span></div></td>
        <td><span dir="ltr">${esc(u.username)}</span></td>
        <td><span class="badge role ${u.role} plain">${ROLE_LABELS[u.role]}</span></td>
        <td>${u.active ? '<span class="badge delivered">فعال</span>' : '<span class="badge rejected">غیرفعال</span>'}</td>
        <td class="actions">${u.role === 'admin' ? '' : `<button class="btn sm ghost" data-edit="${u.id}">${icon('pencil')}ویرایش</button>`}</td>
      </tr>`).join('') : emptyRow(5, 'کاربری با این نقش نیست');
    $$('[data-edit]', view()).forEach((b) => (b.onclick = () => userForm(users.find((u) => u.id == b.dataset.edit))));
    labelTables(view());
  };
  $$('#role-filter button').forEach((b) => (b.onclick = () => {
    filter = b.dataset.v;
    $$('#role-filter button').forEach((x) => x.classList.toggle('on', x === b));
    draw();
  }));
  $('#add-user').onclick = () => userForm();
  draw();
}

function userForm(user) {
  const roles = ['supervisor', 'teacher', 'staff'];
  const current = user?.role || 'teacher';
  modal({
    title: user ? 'ویرایش کاربر' : 'کاربر جدید',
    body: `
      <div class="field"><label>نام و نام خانوادگی</label><input name="full_name" required value="${esc(user?.full_name)}"></div>
      ${user ? '' : '<div class="field"><label>نام کاربری (برای ورود)</label><input name="username" dir="ltr" required></div>'}
      <div class="field"><label>نقش</label><div class="radio-cards">
        ${roles.map((r) => `<label><input type="radio" name="role" value="${r}" ${r === current ? 'checked' : ''}>${ROLE_LABELS[r]}</label>`).join('')}
      </div></div>
      <div class="field"><label>${user ? 'رمز عبور جدید' : 'رمز عبور'}</label>
        <input name="password" type="password" dir="ltr" ${user ? '' : 'required'} minlength="6" autocomplete="new-password">
        <div class="hint">${user ? 'خالی بگذارید تا تغییر نکند.' : 'حداقل ۶ کاراکتر'}</div></div>
      ${user ? `<div class="field"><label>وضعیت</label><div class="radio-cards">
        <label><input type="radio" name="active" value="1" ${user.active ? 'checked' : ''}>فعال</label>
        <label><input type="radio" name="active" value="0" ${user.active ? '' : 'checked'}>غیرفعال</label></div></div>` : ''}`,
    onSubmit: async (d) => {
      if (user) {
        await api(`/users/${user.id}`, { method: 'PATCH', body: { full_name: d.full_name, role: d.role, active: d.active === '1', password: d.password || undefined } });
        toast('کاربر ویرایش شد');
      } else {
        await api('/users', { method: 'POST', body: d });
        toast('کاربر ایجاد شد');
      }
      usersView();
    },
  });
}

// ---------- workshops (admin) ----------
async function workshopsView() {
  const head = pageHead('کارگاه‌ها', 'هر کارگاه یک سرپرست دارد که کالاهای آن را مدیریت می‌کند',
    `<button class="btn primary" id="add-ws">${icon('plus')}کارگاه جدید</button>`);
  loadingPage(head);
  const [workshops, users] = await Promise.all([api('/workshops'), api('/users')]);
  const supervisors = users.filter((u) => u.role === 'supervisor' && u.active);
  view().innerHTML = `
    <div class="page">${head}
      <div class="card"><div class="table-wrap"><table>
        <thead><tr><th>کارگاه</th><th>سرپرست</th><th>تعداد کالا</th><th></th></tr></thead>
        <tbody>${workshops.length ? workshops.map((w) => `
          <tr>
            <td><div class="cell-item"><div class="thumb">${icon('warehouse')}</div>
              <div><div class="strong">${esc(w.name)}</div>${w.description ? `<div class="sub">${esc(w.description)}</div>` : ''}</div></div></td>
            <td>${w.supervisor_name ? esc(w.supervisor_name) : '<span class="badge pending">تعیین نشده</span>'}</td>
            <td>${fa(w.item_count)}</td>
            <td class="actions">
              <button class="btn sm ghost" data-edit="${w.id}">${icon('pencil')}ویرایش</button>
              <button class="btn sm danger" data-del="${w.id}" aria-label="حذف">${icon('trash')}</button>
            </td>
          </tr>`).join('') : emptyRow(4, 'هنوز کارگاهی ثبت نشده است', 'با دکمه‌ی «کارگاه جدید» شروع کنید.')}</tbody>
      </table></div></div>
    </div>`;
  labelTables(view());

  const form = (w) => modal({
    title: w ? 'ویرایش کارگاه' : 'کارگاه جدید',
    body: `
      <div class="field"><label>نام کارگاه</label><input name="name" required value="${esc(w?.name)}" placeholder="مثلاً کارگاه الکترونیک"></div>
      <div class="field"><label>سرپرست کارگاه</label><select name="supervisor_id">
        <option value="">— بدون سرپرست —</option>
        ${supervisors.map((s) => `<option value="${s.id}" ${w?.supervisor_id === s.id ? 'selected' : ''}>${esc(s.full_name)}</option>`).join('')}
      </select>
      ${supervisors.length ? '' : '<div class="hint">ابتدا در بخش کاربران، کاربری با نقش «سرپرست کارگاه» بسازید.</div>'}</div>
      <div class="field"><label>توضیحات</label><textarea name="description" rows="2">${esc(w?.description)}</textarea></div>`,
    onSubmit: async (d) => {
      const body = { ...d, supervisor_id: d.supervisor_id ? Number(d.supervisor_id) : null };
      if (w) await api(`/workshops/${w.id}`, { method: 'PATCH', body });
      else await api('/workshops', { method: 'POST', body });
      toast('کارگاه ذخیره شد');
      workshopsView();
    },
  });

  $('#add-ws').onclick = () => form();
  $$('[data-edit]', view()).forEach((b) => (b.onclick = () => form(workshops.find((w) => w.id == b.dataset.edit))));
  $$('[data-del]', view()).forEach((b) => (b.onclick = async () => {
    const w = workshops.find((x) => x.id == b.dataset.del);
    if (!confirmBox(`کارگاه «${w.name}» و همه کالاها و درخواست‌های آن حذف شود؟`)) return;
    try {
      await api(`/workshops/${w.id}`, { method: 'DELETE' });
      toast('کارگاه حذف شد');
      workshopsView();
    } catch (err) { toast(err.message, true); }
  }));
}

// ---------- items (supervisor / admin) ----------
async function itemsView() {
  const isAdmin = state.user.role === 'admin';
  const title = isAdmin ? 'کالاها' : 'کالاهای کارگاه من';
  const head = pageHead(title, 'ثبت کالا، ورود و خروج موجودی و مشاهده‌ی گردش هر کالا',
    `<button class="btn primary" id="add-item">${icon('plus')}کالای جدید</button>`);
  loadingPage(head);
  const [allWorkshops, items] = await Promise.all([api('/workshops'), api(isAdmin ? '/items' : '/items?mine=1')]);
  const workshops = isAdmin ? allWorkshops : allWorkshops.filter((w) => w.supervisor_id === state.user.id);

  if (!workshops.length) {
    view().innerHTML = `<div class="page">${pageHead(title)}<div class="card">${emptyState(
      isAdmin ? 'هنوز کارگاهی نیست' : 'کارگاهی به شما سپرده نشده است',
      isAdmin ? 'ابتدا یک کارگاه بسازید.' : 'از مدیر مدرسه بخواهید شما را سرپرست یک کارگاه کند.', 'warehouse')}</div></div>`;
    return;
  }

  view().innerHTML = `
    <div class="page">${head}
      <div class="card">
        <div class="toolbar">
          <div class="search">${icon('search')}<input id="search" placeholder="جستجوی کالا..." aria-label="جستجوی کالا"></div>
          ${workshops.length > 1 ? `<select id="ws-filter" aria-label="کارگاه"><option value="">همه کارگاه‌ها</option>
            ${workshops.map((w) => `<option value="${w.id}">${esc(w.name)}</option>`).join('')}</select>` : ''}
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th>کالا</th><th>کارگاه</th><th>موجودی</th><th>درخواست باز</th><th></th></tr></thead>
          <tbody id="items-body"></tbody>
        </table></div>
      </div>
    </div>`;

  const find = (id) => items.find((i) => i.id == id);
  const draw = () => {
    const ws = $('#ws-filter')?.value;
    const q = $('#search').value.trim();
    const rows = items.filter((i) => (!ws || i.workshop_id == ws) && (!q || i.name.includes(q)));
    $('#items-body').innerHTML = rows.length ? rows.map((i) => `
      <tr>
        <td><div class="cell-item"><div class="thumb">${icon('package')}</div>
          <div><div class="strong">${esc(i.name)}</div>${i.description ? `<div class="sub">${esc(i.description)}</div>` : ''}</div></div></td>
        <td>${esc(i.workshop_name)}</td>
        <td>${stockCell(i.quantity, i.unit, i.pending_quantity)}</td>
        <td>${i.pending_quantity ? `<span class="badge pending">${fa(i.pending_quantity)} ${esc(i.unit)}</span>` : '<span class="sub">—</span>'}</td>
        <td class="actions">
          <button class="btn sm" data-stock="${i.id}">${icon('arrows')}ورود / خروج</button>
          <button class="btn sm ghost" data-log="${i.id}" title="گردش کالا" aria-label="گردش کالا">${icon('history')}</button>
          <button class="btn sm ghost" data-edit="${i.id}" title="ویرایش" aria-label="ویرایش">${icon('pencil')}</button>
          <button class="btn sm danger" data-del="${i.id}" title="حذف" aria-label="حذف">${icon('trash')}</button>
        </td>
      </tr>`).join('') : emptyRow(5, q ? 'کالایی با این نام پیدا نشد' : 'هنوز کالایی ثبت نشده است', q ? '' : 'با دکمه‌ی «کالای جدید» اولین کالا را اضافه کنید.');
    $$('[data-edit]', view()).forEach((b) => (b.onclick = () => itemForm(workshops, find(b.dataset.edit))));
    $$('[data-stock]', view()).forEach((b) => (b.onclick = () => stockForm(find(b.dataset.stock))));
    $$('[data-log]', view()).forEach((b) => (b.onclick = () => itemLog(find(b.dataset.log))));
    $$('[data-del]', view()).forEach((b) => (b.onclick = async () => {
      const i = find(b.dataset.del);
      if (!confirmBox(`کالای «${i.name}» و سابقه درخواست‌های آن حذف شود؟`)) return;
      try {
        await api(`/items/${i.id}`, { method: 'DELETE' });
        toast('کالا حذف شد');
        itemsView();
      } catch (err) { toast(err.message, true); }
    }));
    labelTables(view());
  };

  if ($('#ws-filter')) $('#ws-filter').onchange = draw;
  $('#search').oninput = draw;
  $('#add-item').onclick = () => itemForm(workshops);
  draw();
}

function itemForm(workshops, item) {
  modal({
    title: item ? 'ویرایش کالا' : 'کالای جدید',
    body: `
      ${item ? '' : `<div class="field"><label>کارگاه</label><select name="workshop_id">
        ${workshops.map((w) => `<option value="${w.id}">${esc(w.name)}</option>`).join('')}</select></div>`}
      <div class="field"><label>نام کالا</label><input name="name" required value="${esc(item?.name)}" placeholder="مثلاً هویه"></div>
      <div class="row">
        ${item ? '' : '<div class="field"><label>موجودی اولیه</label><input name="quantity" inputmode="numeric" value="0" required></div>'}
        <div class="field"><label>واحد شمارش</label><input name="unit" value="${esc(item?.unit || 'عدد')}" list="units">
          <datalist id="units"><option value="عدد"><option value="بسته"><option value="متر"><option value="کیلوگرم"><option value="لیتر"><option value="برگ"></datalist></div>
      </div>
      <div class="field"><label>توضیحات</label><textarea name="description" rows="2">${esc(item?.description)}</textarea></div>`,
    onSubmit: async (d) => {
      if (item) {
        await api(`/items/${item.id}`, { method: 'PATCH', body: d });
      } else {
        await api('/items', { method: 'POST', body: { ...d, workshop_id: Number(d.workshop_id), quantity: Number(toLatin(d.quantity)) } });
      }
      toast('کالا ذخیره شد');
      itemsView();
    },
  });
}

function stockForm(item) {
  modal({
    title: `ورود / خروج · ${item.name}`,
    body: `
      <div class="info-row">${icon('package')}<span>موجودی فعلی: <b>${fa(item.quantity)} ${esc(item.unit)}</b></span></div>
      <div class="field"><label>نوع</label><div class="radio-cards">
        <label><input type="radio" name="dir" value="1" checked>افزایش (خرید، اهدا)</label>
        <label><input type="radio" name="dir" value="-1">کاهش (خرابی، مصرف)</label></div></div>
      <div class="field"><label>مقدار (${esc(item.unit)})</label><input name="amount" inputmode="numeric" required></div>
      <div class="field"><label>توضیحات</label><input name="note" placeholder="اختیاری"></div>`,
    onSubmit: async (d) => {
      const amount = Number(toLatin(d.amount));
      if (!Number.isInteger(amount) || amount <= 0) throw new Error('مقدار باید عدد صحیح مثبت باشد');
      await api(`/items/${item.id}/stock`, { method: 'POST', body: { change: amount * Number(d.dir), note: d.note } });
      toast('موجودی به‌روز شد');
      itemsView();
    },
  });
}

async function itemLog(item) {
  const log = await api(`/items/${item.id}/transactions`);
  modal({
    title: `گردش کالا · ${item.name}`,
    wide: true,
    body: `<div class="table-wrap"><table>
      <thead><tr><th>تاریخ</th><th>نوع</th><th>تغییر</th><th>ثبت‌کننده</th><th>توضیحات</th></tr></thead>
      <tbody>${log.length ? log.map((t) => `
        <tr>
          <td class="sub">${faDate(t.created_at)}</td>
          <td>${KIND_LABELS[t.kind]}${t.requester_name ? `<div class="sub">به ${esc(t.requester_name)}</div>` : ''}</td>
          <td><span class="badge plain ${t.change >= 0 ? 'delivered' : 'rejected'}" dir="ltr">${t.change > 0 ? '+' : ''}${fa(t.change)}</span></td>
          <td>${esc(t.user_name)}</td>
          <td class="sub">${esc(t.note) || '—'}</td>
        </tr>`).join('') : emptyRow(5, 'گردشی ثبت نشده است')}</tbody>
    </table></div>`,
  });
}

// ---------- catalog (teacher / staff) ----------
async function catalogView() {
  const head = pageHead('درخواست کالا', 'کالای موردنیاز را پیدا کنید و برای سرپرست کارگاه درخواست بفرستید');
  loadingPage(head);
  const [workshops, items] = await Promise.all([api('/workshops'), api('/items')]);
  let ws = '';
  view().innerHTML = `
    <div class="page">${head}
      <div class="card">
        <div class="toolbar">
          <div class="search">${icon('search')}<input id="search" placeholder="جستجوی کالا..." aria-label="جستجوی کالا"></div>
          <div class="segmented" id="ws-filter">
            <button type="button" data-v="" class="on">همه کارگاه‌ها</button>
            ${workshops.map((w) => `<button type="button" data-v="${w.id}">${esc(w.name)}</button>`).join('')}
          </div>
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th>کالا</th><th>کارگاه</th><th>موجودی</th><th></th></tr></thead>
          <tbody id="catalog-body"></tbody>
        </table></div>
      </div>
    </div>`;
  const draw = () => {
    const q = $('#search').value.trim();
    const rows = items.filter((i) => (!ws || i.workshop_id == ws) && (!q || i.name.includes(q)));
    $('#catalog-body').innerHTML = rows.length ? rows.map((i) => `
      <tr>
        <td><div class="cell-item"><div class="thumb">${icon('package')}</div>
          <div><div class="strong">${esc(i.name)}</div>${i.description ? `<div class="sub">${esc(i.description)}</div>` : ''}</div></div></td>
        <td>${esc(i.workshop_name)}</td>
        <td>${stockCell(i.quantity, i.unit)}</td>
        <td class="actions"><button class="btn sm primary" data-req="${i.id}">${icon('send')}درخواست</button></td>
      </tr>`).join('') : emptyRow(4, 'کالایی پیدا نشد', 'عبارت دیگری را جستجو کنید.');
    $$('[data-req]', view()).forEach((b) => (b.onclick = () => requestForm(items.find((i) => i.id == b.dataset.req))));
    labelTables(view());
  };
  $$('#ws-filter button').forEach((b) => (b.onclick = () => {
    ws = b.dataset.v;
    $$('#ws-filter button').forEach((x) => x.classList.toggle('on', x === b));
    draw();
  }));
  $('#search').oninput = draw;
  draw();
}

function requestForm(item) {
  modal({
    title: `درخواست · ${item.name}`,
    body: `
      <div class="info-row">${icon('warehouse')}<span>${esc(item.workshop_name)} · موجودی فعلی <b>${fa(item.quantity)} ${esc(item.unit)}</b></span></div>
      <div class="field"><label>تعداد (${esc(item.unit)})</label><input name="quantity" inputmode="numeric" value="1" required></div>
      <div class="field"><label>توضیحات</label><textarea name="note" rows="2" placeholder="مثلاً کلاس یا کاربرد"></textarea></div>`,
    submitLabel: 'ثبت درخواست',
    submitIcon: 'send',
    onSubmit: async (d) => {
      await api('/requests', { method: 'POST', body: { item_id: item.id, quantity: Number(toLatin(d.quantity)), note: d.note } });
      toast('درخواست برای سرپرست کارگاه ارسال شد');
      location.hash = '#/requests';
    },
  });
}

// ---------- requests ----------
function requestsTable(rows, { compact = false } = {}) {
  const role = state.user.role;
  const handler = role === 'supervisor' || role === 'admin';
  const requester = REQUESTER_ROLES.includes(role);
  if (!rows.length) return emptyState('درخواستی وجود ندارد', compact ? '' : 'درخواست‌های تازه اینجا نمایش داده می‌شوند.', 'inbox');
  return `<div class="table-wrap"><table>
    <thead><tr>
      <th>کالا</th>${handler ? '<th>درخواست‌کننده</th>' : ''}<th>تعداد</th><th>وضعیت</th><th>تاریخ</th>
      ${compact ? '' : '<th>توضیحات</th><th></th>'}
    </tr></thead>
    <tbody>${rows.map((r) => `
      <tr>
        <td><div class="strong">${esc(r.item_name)}</div><div class="sub">${esc(r.workshop_name)}</div></td>
        ${handler ? `<td>${esc(r.requester_name)}<div class="sub">${ROLE_LABELS[r.requester_role]}</div></td>` : ''}
        <td>${fa(r.quantity)} ${esc(r.unit)}${r.status === 'delivered' && r.delivered_quantity !== r.quantity
          ? `<div class="sub">تحویل: ${fa(r.delivered_quantity)}</div>` : ''}</td>
        <td><span class="badge ${r.status}">${STATUS_LABELS[r.status]}</span>
          ${r.handler_name && !compact ? `<div class="sub">${esc(r.handler_name)}</div>` : ''}</td>
        <td class="sub">${faDate(r.created_at)}</td>
        ${compact ? '' : `
        <td>${r.note ? esc(r.note) : '<span class="sub">—</span>'}${r.response_note ? `<div class="sub">پاسخ: ${esc(r.response_note)}</div>` : ''}</td>
        <td class="actions">${r.status !== 'pending' ? '' : handler
          ? `<button class="btn sm success" data-deliver="${r.id}">${icon('check')}تحویل</button><button class="btn sm danger" data-reject="${r.id}">${icon('x')}رد</button>`
          : requester ? `<button class="btn sm ghost" data-cancel="${r.id}">${icon('x')}لغو</button>` : ''}</td>`}
      </tr>`).join('')}</tbody>
  </table></div>`;
}

async function requestsView() {
  const role = state.user.role;
  const isRequester = REQUESTER_ROLES.includes(role);
  const head = pageHead(isRequester ? 'درخواست‌های من' : 'درخواست‌ها',
    isRequester ? 'وضعیت درخواست‌هایی که ثبت کرده‌اید' : 'درخواست‌های دبیرها و نیروهای خدماتی برای کالاهای کارگاه',
    isRequester ? `<a class="btn primary" href="#/catalog">${icon('plus')}درخواست جدید</a>` : '');
  let status = isRequester ? '' : 'pending';
  view().innerHTML = `
    <div class="page">${head}
      <div class="card">
        <div class="toolbar"><div class="segmented" id="status-filter">
          ${[['', 'همه'], ...Object.entries(STATUS_LABELS)].map(([k, v]) => `<button type="button" data-v="${k}" class="${k === status ? 'on' : ''}">${v}</button>`).join('')}
        </div></div>
        <div id="req-list">${skeleton()}</div>
      </div>
    </div>`;

  const load = async () => {
    const rows = await api('/requests' + (status ? `?status=${status}` : ''));
    $('#req-list').innerHTML = requestsTable(rows);
    labelTables(view());
    const find = (id) => rows.find((r) => r.id == id);
    $$('[data-deliver]', view()).forEach((b) => (b.onclick = () => deliverForm(find(b.dataset.deliver), load)));
    $$('[data-reject]', view()).forEach((b) => (b.onclick = () => rejectForm(find(b.dataset.reject), load)));
    $$('[data-cancel]', view()).forEach((b) => (b.onclick = async () => {
      if (!confirmBox('این درخواست لغو شود؟')) return;
      try {
        await api(`/requests/${b.dataset.cancel}/cancel`, { method: 'POST' });
        toast('درخواست لغو شد');
        load();
      } catch (err) { toast(err.message, true); }
    }));
    refreshNavCount();
  };
  $$('#status-filter button').forEach((b) => (b.onclick = () => {
    status = b.dataset.v;
    $$('#status-filter button').forEach((x) => x.classList.toggle('on', x === b));
    load().catch((err) => toast(err.message, true));
  }));
  await load();
}

function deliverForm(r, reload) {
  const enough = r.item_stock >= r.quantity;
  modal({
    title: `تحویل ${r.item_name}`,
    body: `
      <div class="info-row">${icon('users')}<span>به <b>${esc(r.requester_name)}</b> · درخواست ${fa(r.quantity)} ${esc(r.unit)} · موجودی انبار <b>${fa(r.item_stock)}</b></span></div>
      ${enough ? '' : `<div class="info-row" style="color:var(--warning)">${icon('alert')}<span>موجودی کمتر از مقدار درخواستی است؛ می‌توانید بخشی از آن را تحویل دهید.</span></div>`}
      <div class="field"><label>تعداد تحویلی</label><input name="quantity" inputmode="numeric" value="${Math.min(r.quantity, r.item_stock) || r.quantity}" required></div>
      <div class="field"><label>توضیحات</label><input name="note" placeholder="اختیاری"></div>`,
    submitLabel: 'ثبت تحویل',
    onSubmit: async (d) => {
      await api(`/requests/${r.id}/deliver`, { method: 'POST', body: { quantity: Number(toLatin(d.quantity)), note: d.note } });
      toast('تحویل ثبت شد و از موجودی کسر شد');
      reload();
    },
  });
}

function rejectForm(r, reload) {
  modal({
    title: `رد درخواست ${r.requester_name}`,
    body: `<div class="info-row">${icon('package')}<span>${esc(r.item_name)} · ${fa(r.quantity)} ${esc(r.unit)}</span></div>
      <div class="field"><label>دلیل</label><input name="note" placeholder="اختیاری؛ برای درخواست‌کننده نمایش داده می‌شود"></div>`,
    submitLabel: 'رد درخواست',
    submitIcon: 'x',
    onSubmit: async (d) => {
      await api(`/requests/${r.id}/reject`, { method: 'POST', body: d });
      toast('درخواست رد شد');
      reload();
    },
  });
}

const VIEWS = {
  dashboard: dashboardView,
  users: usersView,
  workshops: workshopsView,
  items: itemsView,
  catalog: catalogView,
  requests: requestsView,
};

boot();
