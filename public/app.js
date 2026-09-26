'use strict';

// ---------- helpers ----------
const ROLE_LABELS = { admin: 'مدیر', supervisor: 'سرپرست کارگاه', teacher: 'دبیر', staff: 'نیروی خدماتی' };
const STATUS_LABELS = { pending: 'در انتظار', delivered: 'تحویل شده', rejected: 'رد شده', cancelled: 'لغو شده' };
const KIND_LABELS = { create: 'ثبت اولیه', add: 'افزایش موجودی', remove: 'کاهش موجودی', delivery: 'تحویل به درخواست‌کننده' };
const REQUESTER_ROLES = ['teacher', 'staff'];

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fa = (n) => Number(n ?? 0).toLocaleString('fa-IR');
const faDate = (s) => {
  if (!s) return '';
  const d = new Date(s.replace(' ', 'T') + 'Z');
  return d.toLocaleDateString('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric' })
    + ' ' + d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
};
// Accept Persian/Arabic digits typed into number fields.
const toLatin = (s) => String(s).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));

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
  el.textContent = msg;
  el.className = 'show' + (isError ? ' err' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = ''), 2800);
}

function formData(form) {
  const out = {};
  for (const [k, v] of new FormData(form).entries()) out[k] = v;
  return out;
}

// Opens a modal with a form; onSubmit returning normally closes it, throwing shows the error.
function modal({ title, body, submitLabel = 'ثبت', wide = false, onSubmit }) {
  const root = $('#modal-root');
  root.innerHTML = `
    <div class="modal-backdrop">
      <form class="modal ${wide ? 'wide' : ''}">
        <h2>${esc(title)}</h2>
        ${body}
        <div class="error"></div>
        <div class="footer">
          ${onSubmit ? `<button class="btn primary" type="submit">${esc(submitLabel)}</button>` : ''}
          <button class="btn" type="button" data-close>${onSubmit ? 'انصراف' : 'بستن'}</button>
        </div>
      </form>
    </div>`;
  const form = $('form', root);
  const close = () => (root.innerHTML = '');
  $('[data-close]', root).onclick = close;
  $('.modal-backdrop', root).onclick = (e) => { if (e.target.classList.contains('modal-backdrop')) close(); };
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (!onSubmit) return close();
    const btn = $('button[type=submit]', form);
    btn.disabled = true;
    try {
      await onSubmit(formData(form), form);
      close();
    } catch (err) {
      $('.error', form).textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  };
  const first = $('input, select, textarea', form);
  if (first) first.focus();
  return form;
}

const confirmBox = (message) => window.confirm(message);

// ---------- state & routing ----------
const state = { user: null };

const NAV = {
  admin: [
    ['dashboard', 'پیشخوان'],
    ['users', 'کاربران'],
    ['workshops', 'کارگاه‌ها'],
    ['items', 'کالاها'],
    ['requests', 'درخواست‌ها'],
  ],
  supervisor: [
    ['dashboard', 'پیشخوان'],
    ['items', 'کالاهای کارگاه من'],
    ['requests', 'درخواست‌ها'],
  ],
  teacher: [
    ['dashboard', 'پیشخوان'],
    ['catalog', 'درخواست کالا'],
    ['requests', 'درخواست‌های من'],
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

function render() {
  $('#modal-root').innerHTML = '';
  if (!state.user) return renderLogin();
  const nav = NAV[state.user.role];
  let current = route();
  if (!nav.some(([key]) => key === current)) current = 'dashboard';
  $('#app').innerHTML = `
    <div class="layout">
      <nav class="sidebar">
        <div class="brand">انبار مدرسه</div>
        <div class="who">${esc(state.user.full_name)} · ${ROLE_LABELS[state.user.role]}</div>
        ${nav.map(([key, label]) => `<a href="#/${key}" class="${key === current ? 'active' : ''}">${label}</a>`).join('')}
        <div class="spacer"></div>
        <button class="link-btn" id="change-pass">تغییر رمز عبور</button>
        <button class="link-btn" id="logout">خروج</button>
      </nav>
      <main id="view"></main>
    </div>`;
  $('#logout').onclick = async () => {
    await api('/logout', { method: 'POST' });
    state.user = null;
    location.hash = '';
    render();
  };
  $('#change-pass').onclick = changePassword;
  VIEWS[current]().catch((err) => toast(err.message, true));
}

function renderLogin() {
  $('#app').innerHTML = `
    <div class="login-wrap">
      <form class="card login">
        <h1>سامانه انبار مدرسه</h1>
        <div class="field"><label>نام کاربری</label><input name="username" autocomplete="username" required></div>
        <div class="field"><label>رمز عبور</label><input name="password" type="password" autocomplete="current-password" required></div>
        <div class="error"></div>
        <button class="btn primary" style="width:100%" type="submit">ورود</button>
      </form>
    </div>`;
  const form = $('form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      state.user = (await api('/login', { method: 'POST', body: formData(form) })).user;
      location.hash = '#/dashboard';
      render();
    } catch (err) {
      $('.error', form).textContent = err.message;
    }
  };
}

function changePassword() {
  modal({
    title: 'تغییر رمز عبور',
    body: `
      <div class="field"><label>رمز فعلی</label><input name="current_password" type="password" required></div>
      <div class="field"><label>رمز جدید (حداقل ۶ کاراکتر)</label><input name="new_password" type="password" minlength="6" required></div>`,
    onSubmit: async (data) => {
      await api('/me/password', { method: 'POST', body: data });
      toast('رمز عبور تغییر کرد');
    },
  });
}

const view = () => $('#view');

// ---------- dashboard ----------
async function dashboardView() {
  const s = await api('/stats');
  const role = state.user.role;
  const tiles = {
    admin: [['users', 'کاربر فعال'], ['workshops', 'کارگاه'], ['items', 'کالا'], ['pending', 'درخواست در انتظار']],
    supervisor: [['workshops', 'کارگاه من'], ['items', 'کالا'], ['low_stock', 'کالای تمام‌شده'], ['pending', 'درخواست در انتظار']],
    teacher: [['pending', 'در انتظار'], ['delivered', 'تحویل گرفته'], ['rejected', 'رد شده']],
  }[role] || [['pending', 'در انتظار'], ['delivered', 'تحویل گرفته'], ['rejected', 'رد شده']];

  const hints = {
    admin: 'ابتدا از بخش «کاربران» سرپرست‌ها، دبیرها و نیروهای خدماتی را تعریف کنید؛ سپس در بخش «کارگاه‌ها» برای هر کارگاه یک سرپرست تعیین کنید.',
    supervisor: 'کالاهای کارگاه خود را در بخش «کالاهای کارگاه من» ثبت کنید و درخواست‌های دبیرها را در بخش «درخواست‌ها» تحویل دهید.',
    teacher: 'از بخش «درخواست کالا» کالای موردنیاز را انتخاب و درخواست دهید. وضعیت درخواست‌ها در «درخواست‌های من» قابل پیگیری است.',
  };

  view().innerHTML = `
    <h1>خوش آمدید، ${esc(state.user.full_name)}</h1>
    <div class="stats">
      ${tiles.map(([k, label]) => `<div class="stat"><div class="num">${fa(s[k])}</div><div class="label">${label}</div></div>`).join('')}
    </div>
    <div class="card">${hints[role] || hints.teacher}</div>
    <div class="card"><h2>آخرین درخواست‌ها</h2><div id="recent"></div></div>`;
  const requests = (await api('/requests')).slice(0, 8);
  $('#recent').innerHTML = requestsTable(requests, { compact: true });
}

// ---------- users (admin) ----------
async function usersView() {
  const users = await api('/users');
  view().innerHTML = `
    <h1>کاربران</h1>
    <div class="toolbar">
      <select id="role-filter">
        <option value="">همه نقش‌ها</option>
        ${Object.entries(ROLE_LABELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
      </select>
      <div class="grow"></div>
      <button class="btn primary" id="add-user">+ کاربر جدید</button>
    </div>
    <div class="card table-wrap"><table>
      <thead><tr><th>نام</th><th>نام کاربری</th><th>نقش</th><th>وضعیت</th><th></th></tr></thead>
      <tbody id="users-body"></tbody>
    </table></div>`;

  const draw = () => {
    const f = $('#role-filter').value;
    const rows = users.filter((u) => !f || u.role === f);
    $('#users-body').innerHTML = rows.length ? rows.map((u) => `
      <tr>
        <td>${esc(u.full_name)}</td>
        <td dir="ltr" style="text-align:right">${esc(u.username)}</td>
        <td><span class="badge role">${ROLE_LABELS[u.role]}</span></td>
        <td>${u.active ? 'فعال' : '<span class="badge rejected">غیرفعال</span>'}</td>
        <td class="actions">${u.role === 'admin' ? '' : `<button class="btn sm" data-edit="${u.id}">ویرایش</button>`}</td>
      </tr>`).join('') : '<tr><td colspan="5" class="empty">کاربری یافت نشد</td></tr>';
    view().querySelectorAll('[data-edit]').forEach((b) => (b.onclick = () => userForm(users.find((u) => u.id == b.dataset.edit))));
  };
  $('#role-filter').onchange = draw;
  $('#add-user').onclick = () => userForm();
  draw();
}

function userForm(user) {
  const roleOptions = ['supervisor', 'teacher', 'staff']
    .map((r) => `<option value="${r}" ${user?.role === r ? 'selected' : ''}>${ROLE_LABELS[r]}</option>`).join('');
  modal({
    title: user ? 'ویرایش کاربر' : 'کاربر جدید',
    body: `
      <div class="field"><label>نام و نام خانوادگی</label><input name="full_name" required value="${esc(user?.full_name)}"></div>
      ${user ? '' : '<div class="field"><label>نام کاربری (برای ورود)</label><input name="username" dir="ltr" required></div>'}
      <div class="field"><label>نقش</label><select name="role">${roleOptions}</select></div>
      <div class="field"><label>${user ? 'رمز عبور جدید (خالی = بدون تغییر)' : 'رمز عبور (حداقل ۶ کاراکتر)'}</label>
        <input name="password" type="password" ${user ? '' : 'required'} minlength="6" autocomplete="new-password"></div>
      ${user ? `<div class="field"><label>وضعیت</label><select name="active">
        <option value="1" ${user.active ? 'selected' : ''}>فعال</option>
        <option value="0" ${user.active ? '' : 'selected'}>غیرفعال</option></select></div>` : ''}`,
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
  const [workshops, users] = await Promise.all([api('/workshops'), api('/users')]);
  const supervisors = users.filter((u) => u.role === 'supervisor' && u.active);
  view().innerHTML = `
    <h1>کارگاه‌ها</h1>
    <div class="toolbar"><div class="grow"></div><button class="btn primary" id="add-ws">+ کارگاه جدید</button></div>
    <div class="card table-wrap"><table>
      <thead><tr><th>نام کارگاه</th><th>سرپرست</th><th>تعداد کالا</th><th></th></tr></thead>
      <tbody>${workshops.length ? workshops.map((w) => `
        <tr>
          <td>${esc(w.name)}${w.description ? `<div class="sub">${esc(w.description)}</div>` : ''}</td>
          <td>${w.supervisor_name ? esc(w.supervisor_name) : '<span class="badge pending">تعیین نشده</span>'}</td>
          <td>${fa(w.item_count)}</td>
          <td class="actions">
            <button class="btn sm" data-edit="${w.id}">ویرایش</button>
            <button class="btn sm danger" data-del="${w.id}">حذف</button>
          </td>
        </tr>`).join('') : '<tr><td colspan="4" class="empty">هنوز کارگاهی ثبت نشده است</td></tr>'}</tbody>
    </table></div>`;

  const form = (w) => modal({
    title: w ? 'ویرایش کارگاه' : 'کارگاه جدید',
    body: `
      <div class="field"><label>نام کارگاه</label><input name="name" required value="${esc(w?.name)}"></div>
      <div class="field"><label>سرپرست کارگاه</label><select name="supervisor_id">
        <option value="">— بدون سرپرست —</option>
        ${supervisors.map((s) => `<option value="${s.id}" ${w?.supervisor_id === s.id ? 'selected' : ''}>${esc(s.full_name)}</option>`).join('')}
      </select>
      ${supervisors.length ? '' : '<div class="sub">ابتدا در بخش کاربران، کاربری با نقش «سرپرست کارگاه» بسازید.</div>'}</div>
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
  view().querySelectorAll('[data-edit]').forEach((b) => (b.onclick = () => form(workshops.find((w) => w.id == b.dataset.edit))));
  view().querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => {
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
  const [allWorkshops, items] = await Promise.all([api('/workshops'), api(isAdmin ? '/items' : '/items?mine=1')]);
  const workshops = isAdmin ? allWorkshops : allWorkshops.filter((w) => w.supervisor_id === state.user.id);

  if (!workshops.length) {
    view().innerHTML = `<h1>${isAdmin ? 'کالاها' : 'کالاهای کارگاه من'}</h1>
      <div class="card empty">${isAdmin ? 'ابتدا یک کارگاه بسازید.' : 'هنوز کارگاهی به شما سپرده نشده است. از مدیر مدرسه بخواهید شما را سرپرست یک کارگاه کند.'}</div>`;
    return;
  }

  view().innerHTML = `
    <h1>${isAdmin ? 'کالاها' : 'کالاهای کارگاه من'}</h1>
    <div class="toolbar">
      ${workshops.length > 1 ? `<select id="ws-filter"><option value="">همه کارگاه‌ها</option>
        ${workshops.map((w) => `<option value="${w.id}">${esc(w.name)}</option>`).join('')}</select>` : ''}
      <input id="search" placeholder="جستجوی کالا...">
      <div class="grow"></div>
      <button class="btn primary" id="add-item">+ کالای جدید</button>
    </div>
    <div class="card table-wrap"><table>
      <thead><tr><th>کالا</th><th>کارگاه</th><th>موجودی</th><th>درخواست‌های باز</th><th></th></tr></thead>
      <tbody id="items-body"></tbody>
    </table></div>`;

  const draw = () => {
    const ws = $('#ws-filter')?.value;
    const q = $('#search').value.trim();
    const rows = items.filter((i) => (!ws || i.workshop_id == ws) && (!q || i.name.includes(q)));
    $('#items-body').innerHTML = rows.length ? rows.map((i) => `
      <tr>
        <td>${esc(i.name)}${i.description ? `<div class="sub">${esc(i.description)}</div>` : ''}</td>
        <td>${esc(i.workshop_name)}</td>
        <td class="${i.quantity === 0 ? 'low' : ''}">${fa(i.quantity)} ${esc(i.unit)}</td>
        <td>${i.pending_quantity ? `${fa(i.pending_quantity)} ${esc(i.unit)}` : '—'}</td>
        <td class="actions">
          <button class="btn sm" data-stock="${i.id}">ورود / خروج</button>
          <button class="btn sm" data-edit="${i.id}">ویرایش</button>
          <button class="btn sm" data-log="${i.id}">گردش</button>
          <button class="btn sm danger" data-del="${i.id}">حذف</button>
        </td>
      </tr>`).join('') : '<tr><td colspan="5" class="empty">کالایی یافت نشد</td></tr>';
    bind();
  };

  const find = (id) => items.find((i) => i.id == id);
  const bind = () => {
    view().querySelectorAll('[data-edit]').forEach((b) => (b.onclick = () => itemForm(workshops, find(b.dataset.edit))));
    view().querySelectorAll('[data-stock]').forEach((b) => (b.onclick = () => stockForm(find(b.dataset.stock))));
    view().querySelectorAll('[data-log]').forEach((b) => (b.onclick = () => itemLog(find(b.dataset.log))));
    view().querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => {
      const i = find(b.dataset.del);
      if (!confirmBox(`کالای «${i.name}» و سابقه درخواست‌های آن حذف شود؟`)) return;
      try {
        await api(`/items/${i.id}`, { method: 'DELETE' });
        toast('کالا حذف شد');
        itemsView();
      } catch (err) { toast(err.message, true); }
    }));
  };

  $('#ws-filter') && ($('#ws-filter').onchange = draw);
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
      <div class="field"><label>نام کالا</label><input name="name" required value="${esc(item?.name)}"></div>
      <div class="row">
        ${item ? '' : '<div class="field"><label>موجودی اولیه</label><input name="quantity" inputmode="numeric" value="0" required></div>'}
        <div class="field"><label>واحد شمارش</label><input name="unit" value="${esc(item?.unit || 'عدد')}" placeholder="عدد، بسته، متر، کیلوگرم..."></div>
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
    title: `ورود / خروج: ${item.name}`,
    body: `
      <p>موجودی فعلی: <b>${fa(item.quantity)} ${esc(item.unit)}</b></p>
      <div class="row">
        <div class="field"><label>نوع</label><select name="dir">
          <option value="1">افزایش (خرید، اهدا...)</option>
          <option value="-1">کاهش (خرابی، مصرف، اصلاح...)</option></select></div>
        <div class="field"><label>مقدار</label><input name="amount" inputmode="numeric" required></div>
      </div>
      <div class="field"><label>توضیحات</label><input name="note"></div>`,
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
    title: `گردش کالا: ${item.name}`,
    wide: true,
    body: `<div class="table-wrap"><table>
      <thead><tr><th>تاریخ</th><th>نوع</th><th>تغییر</th><th>ثبت‌کننده</th><th>توضیحات</th></tr></thead>
      <tbody>${log.length ? log.map((t) => `
        <tr>
          <td>${faDate(t.created_at)}</td>
          <td>${KIND_LABELS[t.kind]}${t.requester_name ? `<div class="sub">به ${esc(t.requester_name)}</div>` : ''}</td>
          <td dir="ltr" style="text-align:right">${t.change > 0 ? '+' : ''}${fa(t.change)}</td>
          <td>${esc(t.user_name)}</td>
          <td>${esc(t.note)}</td>
        </tr>`).join('') : '<tr><td colspan="5" class="empty">گردشی ثبت نشده است</td></tr>'}</tbody>
    </table></div>`,
  });
}

// ---------- catalog (teacher / staff) ----------
async function catalogView() {
  const [workshops, items] = await Promise.all([api('/workshops'), api('/items')]);
  view().innerHTML = `
    <h1>درخواست کالا</h1>
    <div class="toolbar">
      <select id="ws-filter"><option value="">همه کارگاه‌ها</option>
        ${workshops.map((w) => `<option value="${w.id}">${esc(w.name)}</option>`).join('')}</select>
      <input id="search" placeholder="جستجوی کالا...">
    </div>
    <div class="card table-wrap"><table>
      <thead><tr><th>کالا</th><th>کارگاه</th><th>موجودی</th><th></th></tr></thead>
      <tbody id="catalog-body"></tbody>
    </table></div>`;
  const draw = () => {
    const ws = $('#ws-filter').value;
    const q = $('#search').value.trim();
    const rows = items.filter((i) => (!ws || i.workshop_id == ws) && (!q || i.name.includes(q)));
    $('#catalog-body').innerHTML = rows.length ? rows.map((i) => `
      <tr>
        <td>${esc(i.name)}${i.description ? `<div class="sub">${esc(i.description)}</div>` : ''}</td>
        <td>${esc(i.workshop_name)}</td>
        <td class="${i.quantity === 0 ? 'low' : ''}">${i.quantity === 0 ? 'ناموجود' : `${fa(i.quantity)} ${esc(i.unit)}`}</td>
        <td class="actions"><button class="btn sm primary" data-req="${i.id}">درخواست</button></td>
      </tr>`).join('') : '<tr><td colspan="4" class="empty">کالایی یافت نشد</td></tr>';
    view().querySelectorAll('[data-req]').forEach((b) => (b.onclick = () => requestForm(items.find((i) => i.id == b.dataset.req))));
  };
  $('#ws-filter').onchange = draw;
  $('#search').oninput = draw;
  draw();
}

function requestForm(item) {
  modal({
    title: `درخواست: ${item.name}`,
    body: `
      <p class="sub">کارگاه ${esc(item.workshop_name)} · موجودی فعلی ${fa(item.quantity)} ${esc(item.unit)}</p>
      <div class="field"><label>تعداد (${esc(item.unit)})</label><input name="quantity" inputmode="numeric" value="1" required></div>
      <div class="field"><label>توضیحات (مثلاً کلاس یا کاربرد)</label><textarea name="note" rows="2"></textarea></div>`,
    submitLabel: 'ثبت درخواست',
    onSubmit: async (d) => {
      await api('/requests', { method: 'POST', body: { item_id: item.id, quantity: Number(toLatin(d.quantity)), note: d.note } });
      toast('درخواست ثبت شد و برای سرپرست کارگاه ارسال شد');
      location.hash = '#/requests';
    },
  });
}

// ---------- requests ----------
function requestsTable(rows, { compact = false } = {}) {
  const role = state.user.role;
  const handler = role === 'supervisor' || role === 'admin';
  const requester = REQUESTER_ROLES.includes(role);
  if (!rows.length) return '<div class="empty">درخواستی وجود ندارد</div>';
  return `<div class="table-wrap"><table>
    <thead><tr>
      <th>تاریخ</th><th>کالا</th>${handler ? '<th>درخواست‌کننده</th>' : ''}<th>تعداد</th><th>وضعیت</th>
      ${compact ? '' : '<th>توضیحات</th><th></th>'}
    </tr></thead>
    <tbody>${rows.map((r) => `
      <tr>
        <td>${faDate(r.created_at)}</td>
        <td>${esc(r.item_name)}<div class="sub">${esc(r.workshop_name)}</div></td>
        ${handler ? `<td>${esc(r.requester_name)}<div class="sub">${ROLE_LABELS[r.requester_role]}</div></td>` : ''}
        <td>${fa(r.quantity)} ${esc(r.unit)}${r.status === 'delivered' && r.delivered_quantity !== r.quantity
          ? `<div class="sub">تحویل: ${fa(r.delivered_quantity)}</div>` : ''}</td>
        <td><span class="badge ${r.status}">${STATUS_LABELS[r.status]}</span>
          ${r.handled_at && r.status !== 'cancelled' ? `<div class="sub">${esc(r.handler_name || '')} · ${faDate(r.handled_at)}</div>` : ''}</td>
        ${compact ? '' : `
        <td>${esc(r.note)}${r.response_note ? `<div class="sub">پاسخ: ${esc(r.response_note)}</div>` : ''}</td>
        <td class="actions">${r.status !== 'pending' ? '' : handler
          ? `<button class="btn sm success" data-deliver="${r.id}">تحویل</button> <button class="btn sm danger" data-reject="${r.id}">رد</button>`
          : requester ? `<button class="btn sm" data-cancel="${r.id}">لغو</button>` : ''}</td>`}
      </tr>`).join('')}</tbody>
  </table></div>`;
}

async function requestsView() {
  const role = state.user.role;
  view().innerHTML = `
    <h1>${REQUESTER_ROLES.includes(role) ? 'درخواست‌های من' : 'درخواست‌ها'}</h1>
    <div class="toolbar">
      <select id="status-filter">
        <option value="">همه وضعیت‌ها</option>
        ${Object.entries(STATUS_LABELS).map(([k, v]) => `<option value="${k}" ${k === 'pending' && role !== 'teacher' && role !== 'staff' ? 'selected' : ''}>${v}</option>`).join('')}
      </select>
      <div class="grow"></div>
      ${REQUESTER_ROLES.includes(role) ? '<a class="btn primary" href="#/catalog" style="text-decoration:none">+ درخواست جدید</a>' : ''}
    </div>
    <div class="card" id="req-list"></div>`;

  const load = async () => {
    const status = $('#status-filter').value;
    const rows = await api('/requests' + (status ? `?status=${status}` : ''));
    $('#req-list').innerHTML = requestsTable(rows);
    const find = (id) => rows.find((r) => r.id == id);
    view().querySelectorAll('[data-deliver]').forEach((b) => (b.onclick = () => deliverForm(find(b.dataset.deliver), load)));
    view().querySelectorAll('[data-reject]').forEach((b) => (b.onclick = () => rejectForm(find(b.dataset.reject), load)));
    view().querySelectorAll('[data-cancel]').forEach((b) => (b.onclick = async () => {
      if (!confirmBox('این درخواست لغو شود؟')) return;
      try {
        await api(`/requests/${b.dataset.cancel}/cancel`, { method: 'POST' });
        toast('درخواست لغو شد');
        load();
      } catch (err) { toast(err.message, true); }
    }));
  };
  $('#status-filter').onchange = () => load().catch((err) => toast(err.message, true));
  await load();
}

function deliverForm(r, reload) {
  modal({
    title: `تحویل ${r.item_name} به ${r.requester_name}`,
    body: `
      <p class="sub">درخواست: ${fa(r.quantity)} ${esc(r.unit)} · موجودی انبار: ${fa(r.item_stock)} ${esc(r.unit)}</p>
      <div class="field"><label>تعداد تحویلی</label><input name="quantity" inputmode="numeric" value="${Math.min(r.quantity, r.item_stock) || r.quantity}" required></div>
      <div class="field"><label>توضیحات</label><input name="note"></div>`,
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
    body: '<div class="field"><label>دلیل (اختیاری)</label><input name="note"></div>',
    submitLabel: 'رد درخواست',
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
