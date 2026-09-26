const path = require('node:path');
const express = require('express');
const { tx } = require('./db');
const { hashPassword, verifyPassword, newToken, parseCookies } = require('./auth');

const ROLES = ['admin', 'supervisor', 'teacher', 'staff'];
// Teachers request items; service staff may request supplies for their work too.
const REQUESTER_ROLES = ['teacher', 'staff'];
const COOKIE = 'schole_session';

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const fail = (status, message) => {
  throw new HttpError(status, message);
};

function text(value, field, { required = true, max = 200 } = {}) {
  const v = typeof value === 'string' ? value.trim() : '';
  if (required && !v) fail(400, `${field} الزامی است`);
  if (v.length > max) fail(400, `${field} بیش از حد طولانی است`);
  return v;
}

function int(value, field, { min = 0 } = {}) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min) fail(400, `${field} باید عدد صحیح ${min === 1 ? 'مثبت' : 'نامنفی'} باشد`);
  return n;
}

function publicUser(u) {
  return u && { id: u.id, username: u.username, full_name: u.full_name, role: u.role, active: !!u.active };
}

function createApp(db) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  const getUser = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const getWorkshop = (id) => db.prepare('SELECT * FROM workshops WHERE id = ?').get(id);
  const getItem = (id) => db.prepare('SELECT * FROM items WHERE id = ?').get(id);

  // --- auth ---------------------------------------------------------------
  app.use('/api', (req, _res, next) => {
    const token = parseCookies(req.headers.cookie)[COOKIE];
    if (token) {
      const row = db.prepare(
        `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND u.active = 1`
      ).get(token);
      if (row) {
        req.user = row;
        req.token = token;
      }
    }
    next();
  });

  const auth = (...roles) => (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, 'ابتدا وارد شوید'));
    if (roles.length && !roles.includes(req.user.role)) return next(new HttpError(403, 'دسترسی ندارید'));
    next();
  };

  // Supervisors may only manage workshops assigned to them; the admin may manage all.
  const assertManages = (user, workshopId) => {
    const w = getWorkshop(workshopId);
    if (!w) fail(404, 'کارگاه پیدا نشد');
    if (user.role !== 'admin' && w.supervisor_id !== user.id) fail(403, 'این کارگاه به شما سپرده نشده است');
    return w;
  };

  app.post('/api/login', (req, res) => {
    const username = text(req.body.username, 'نام کاربری');
    const password = text(req.body.password, 'رمز عبور');
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !user.active || !verifyPassword(password, user.password_hash)) {
      fail(401, 'نام کاربری یا رمز عبور اشتباه است');
    }
    const token = newToken();
    db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, user.id);
    res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 7}`);
    res.json({ user: publicUser(user) });
  });

  app.post('/api/logout', (req, res) => {
    if (req.token) db.prepare('DELETE FROM sessions WHERE token = ?').run(req.token);
    res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
    res.json({ ok: true });
  });

  app.get('/api/me', auth(), (req, res) => res.json({ user: publicUser(req.user) }));

  app.post('/api/me/password', auth(), (req, res) => {
    const current = text(req.body.current_password, 'رمز فعلی');
    const next = text(req.body.new_password, 'رمز جدید');
    if (next.length < 6) fail(400, 'رمز جدید باید حداقل ۶ کاراکتر باشد');
    if (!verifyPassword(current, req.user.password_hash)) fail(400, 'رمز فعلی اشتباه است');
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(next), req.user.id);
    res.json({ ok: true });
  });

  // --- users (admin) ------------------------------------------------------
  app.get('/api/users', auth('admin'), (_req, res) => {
    res.json(db.prepare('SELECT * FROM users ORDER BY role, full_name').all().map(publicUser));
  });

  app.post('/api/users', auth('admin'), (req, res) => {
    const username = text(req.body.username, 'نام کاربری', { max: 50 });
    const full_name = text(req.body.full_name, 'نام و نام خانوادگی');
    const password = text(req.body.password, 'رمز عبور');
    const role = req.body.role;
    if (!ROLES.includes(role) || role === 'admin') fail(400, 'نقش نامعتبر است');
    if (password.length < 6) fail(400, 'رمز عبور باید حداقل ۶ کاراکتر باشد');
    if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) fail(409, 'این نام کاربری قبلاً ثبت شده است');
    const { lastInsertRowid } = db
      .prepare('INSERT INTO users (username, full_name, password_hash, role) VALUES (?, ?, ?, ?)')
      .run(username, full_name, hashPassword(password), role);
    res.status(201).json(publicUser(getUser(lastInsertRowid)));
  });

  app.patch('/api/users/:id', auth('admin'), (req, res) => {
    const user = getUser(req.params.id);
    if (!user) fail(404, 'کاربر پیدا نشد');
    if (user.role === 'admin') fail(400, 'مشخصات مدیر از این بخش قابل تغییر نیست');
    const full_name = req.body.full_name !== undefined ? text(req.body.full_name, 'نام و نام خانوادگی') : user.full_name;
    const role = req.body.role !== undefined ? req.body.role : user.role;
    if (!ROLES.includes(role) || role === 'admin') fail(400, 'نقش نامعتبر است');
    const active = req.body.active !== undefined ? (req.body.active ? 1 : 0) : user.active;
    tx(db, () => {
      db.prepare('UPDATE users SET full_name = ?, role = ?, active = ? WHERE id = ?').run(full_name, role, active, user.id);
      if (req.body.password) {
        const password = text(req.body.password, 'رمز عبور');
        if (password.length < 6) fail(400, 'رمز عبور باید حداقل ۶ کاراکتر باشد');
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), user.id);
      }
      // A user who is no longer a supervisor can't keep their workshops.
      if (role !== 'supervisor') db.prepare('UPDATE workshops SET supervisor_id = NULL WHERE supervisor_id = ?').run(user.id);
      if (!active) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
    });
    res.json(publicUser(getUser(user.id)));
  });

  // --- workshops ----------------------------------------------------------
  const WORKSHOP_SELECT = `
    SELECT w.*, u.full_name AS supervisor_name,
      (SELECT COUNT(*) FROM items i WHERE i.workshop_id = w.id) AS item_count
    FROM workshops w LEFT JOIN users u ON u.id = w.supervisor_id`;

  app.get('/api/workshops', auth(), (_req, res) => {
    res.json(db.prepare(`${WORKSHOP_SELECT} ORDER BY w.name`).all());
  });

  const readSupervisor = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const u = getUser(value);
    if (!u || u.role !== 'supervisor' || !u.active) fail(400, 'سرپرست انتخاب‌شده معتبر نیست');
    return u.id;
  };

  app.post('/api/workshops', auth('admin'), (req, res) => {
    const name = text(req.body.name, 'نام کارگاه');
    const description = text(req.body.description, 'توضیحات', { required: false, max: 500 });
    const supervisor_id = readSupervisor(req.body.supervisor_id);
    if (db.prepare('SELECT 1 FROM workshops WHERE name = ?').get(name)) fail(409, 'کارگاهی با این نام وجود دارد');
    const { lastInsertRowid } = db
      .prepare('INSERT INTO workshops (name, description, supervisor_id) VALUES (?, ?, ?)')
      .run(name, description, supervisor_id);
    res.status(201).json(db.prepare(`${WORKSHOP_SELECT} WHERE w.id = ?`).get(lastInsertRowid));
  });

  app.patch('/api/workshops/:id', auth('admin'), (req, res) => {
    const w = getWorkshop(req.params.id);
    if (!w) fail(404, 'کارگاه پیدا نشد');
    const name = req.body.name !== undefined ? text(req.body.name, 'نام کارگاه') : w.name;
    const description = req.body.description !== undefined
      ? text(req.body.description, 'توضیحات', { required: false, max: 500 }) : w.description;
    const supervisor_id = req.body.supervisor_id !== undefined ? readSupervisor(req.body.supervisor_id) : w.supervisor_id;
    if (db.prepare('SELECT 1 FROM workshops WHERE name = ? AND id != ?').get(name, w.id)) fail(409, 'کارگاهی با این نام وجود دارد');
    db.prepare('UPDATE workshops SET name = ?, description = ?, supervisor_id = ? WHERE id = ?')
      .run(name, description, supervisor_id, w.id);
    res.json(db.prepare(`${WORKSHOP_SELECT} WHERE w.id = ?`).get(w.id));
  });

  app.delete('/api/workshops/:id', auth('admin'), (req, res) => {
    const w = getWorkshop(req.params.id);
    if (!w) fail(404, 'کارگاه پیدا نشد');
    db.prepare('DELETE FROM workshops WHERE id = ?').run(w.id);
    res.json({ ok: true });
  });

  // --- items --------------------------------------------------------------
  const ITEM_SELECT = `
    SELECT i.*, w.name AS workshop_name, w.supervisor_id,
      (SELECT COALESCE(SUM(r.quantity), 0) FROM requests r WHERE r.item_id = i.id AND r.status = 'pending') AS pending_quantity
    FROM items i JOIN workshops w ON w.id = i.workshop_id`;

  app.get('/api/items', auth(), (req, res) => {
    const where = [];
    const params = [];
    if (req.query.workshop_id) {
      where.push('i.workshop_id = ?');
      params.push(Number(req.query.workshop_id));
    }
    if (req.query.mine === '1' && req.user.role === 'supervisor') {
      where.push('w.supervisor_id = ?');
      params.push(req.user.id);
    }
    const sql = `${ITEM_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY w.name, i.name`;
    res.json(db.prepare(sql).all(...params));
  });

  app.post('/api/items', auth('supervisor', 'admin'), (req, res) => {
    const workshop = assertManages(req.user, req.body.workshop_id);
    const name = text(req.body.name, 'نام کالا');
    const unit = text(req.body.unit, 'واحد', { required: false, max: 30 }) || 'عدد';
    const description = text(req.body.description, 'توضیحات', { required: false, max: 500 });
    const quantity = int(req.body.quantity ?? 0, 'موجودی');
    if (db.prepare('SELECT 1 FROM items WHERE workshop_id = ? AND name = ?').get(workshop.id, name)) {
      fail(409, 'این کالا در این کارگاه وجود دارد');
    }
    const id = tx(db, () => {
      const { lastInsertRowid } = db
        .prepare('INSERT INTO items (workshop_id, name, unit, quantity, description) VALUES (?, ?, ?, ?, ?)')
        .run(workshop.id, name, unit, quantity, description);
      db.prepare("INSERT INTO transactions (item_id, change, kind, user_id, note) VALUES (?, ?, 'create', ?, 'موجودی اولیه')")
        .run(lastInsertRowid, quantity, req.user.id);
      return lastInsertRowid;
    });
    res.status(201).json(db.prepare(`${ITEM_SELECT} WHERE i.id = ?`).get(id));
  });

  app.patch('/api/items/:id', auth('supervisor', 'admin'), (req, res) => {
    const item = getItem(req.params.id);
    if (!item) fail(404, 'کالا پیدا نشد');
    assertManages(req.user, item.workshop_id);
    const name = req.body.name !== undefined ? text(req.body.name, 'نام کالا') : item.name;
    const unit = req.body.unit !== undefined ? text(req.body.unit, 'واحد', { max: 30 }) : item.unit;
    const description = req.body.description !== undefined
      ? text(req.body.description, 'توضیحات', { required: false, max: 500 }) : item.description;
    if (db.prepare('SELECT 1 FROM items WHERE workshop_id = ? AND name = ? AND id != ?').get(item.workshop_id, name, item.id)) {
      fail(409, 'این کالا در این کارگاه وجود دارد');
    }
    db.prepare('UPDATE items SET name = ?, unit = ?, description = ? WHERE id = ?').run(name, unit, description, item.id);
    res.json(db.prepare(`${ITEM_SELECT} WHERE i.id = ?`).get(item.id));
  });

  // Add to or remove from stock (purchase, breakage, correction...). Always logged.
  app.post('/api/items/:id/stock', auth('supervisor', 'admin'), (req, res) => {
    const item = getItem(req.params.id);
    if (!item) fail(404, 'کالا پیدا نشد');
    assertManages(req.user, item.workshop_id);
    const change = Number(req.body.change);
    if (!Number.isInteger(change) || change === 0) fail(400, 'مقدار تغییر باید عدد صحیح غیرصفر باشد');
    const note = text(req.body.note, 'توضیحات', { required: false, max: 300 });
    if (item.quantity + change < 0) fail(400, 'موجودی کافی نیست');
    tx(db, () => {
      db.prepare('UPDATE items SET quantity = quantity + ? WHERE id = ?').run(change, item.id);
      db.prepare('INSERT INTO transactions (item_id, change, kind, user_id, note) VALUES (?, ?, ?, ?, ?)')
        .run(item.id, change, change > 0 ? 'add' : 'remove', req.user.id, note);
    });
    res.json(db.prepare(`${ITEM_SELECT} WHERE i.id = ?`).get(item.id));
  });

  app.delete('/api/items/:id', auth('supervisor', 'admin'), (req, res) => {
    const item = getItem(req.params.id);
    if (!item) fail(404, 'کالا پیدا نشد');
    assertManages(req.user, item.workshop_id);
    db.prepare('DELETE FROM items WHERE id = ?').run(item.id);
    res.json({ ok: true });
  });

  app.get('/api/items/:id/transactions', auth('supervisor', 'admin'), (req, res) => {
    const item = getItem(req.params.id);
    if (!item) fail(404, 'کالا پیدا نشد');
    assertManages(req.user, item.workshop_id);
    res.json(db.prepare(`
      SELECT t.*, u.full_name AS user_name, ru.full_name AS requester_name
      FROM transactions t
      LEFT JOIN users u ON u.id = t.user_id
      LEFT JOIN requests r ON r.id = t.request_id
      LEFT JOIN users ru ON ru.id = r.requester_id
      WHERE t.item_id = ? ORDER BY t.id DESC`).all(item.id));
  });

  // --- requests -----------------------------------------------------------
  const REQUEST_SELECT = `
    SELECT r.*, i.name AS item_name, i.unit, i.quantity AS item_stock, w.id AS workshop_id, w.name AS workshop_name,
      ru.full_name AS requester_name, ru.role AS requester_role, hu.full_name AS handler_name
    FROM requests r
    JOIN items i ON i.id = r.item_id
    JOIN workshops w ON w.id = i.workshop_id
    JOIN users ru ON ru.id = r.requester_id
    LEFT JOIN users hu ON hu.id = r.handled_by`;

  app.get('/api/requests', auth(), (req, res) => {
    const where = [];
    const params = [];
    if (REQUESTER_ROLES.includes(req.user.role)) {
      where.push('r.requester_id = ?');
      params.push(req.user.id);
    } else if (req.user.role === 'supervisor') {
      where.push('w.supervisor_id = ?');
      params.push(req.user.id);
    }
    if (req.query.status) {
      where.push('r.status = ?');
      params.push(String(req.query.status));
    }
    const sql = `${REQUEST_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END, r.id DESC`;
    res.json(db.prepare(sql).all(...params));
  });

  app.post('/api/requests', auth(...REQUESTER_ROLES), (req, res) => {
    const item = getItem(req.body.item_id);
    if (!item) fail(404, 'کالا پیدا نشد');
    const quantity = int(req.body.quantity, 'تعداد', { min: 1 });
    const note = text(req.body.note, 'توضیحات', { required: false, max: 500 });
    const { lastInsertRowid } = db
      .prepare('INSERT INTO requests (item_id, requester_id, quantity, note) VALUES (?, ?, ?, ?)')
      .run(item.id, req.user.id, quantity, note);
    res.status(201).json(db.prepare(`${REQUEST_SELECT} WHERE r.id = ?`).get(lastInsertRowid));
  });

  const loadPending = (id) => {
    const r = db.prepare(`${REQUEST_SELECT} WHERE r.id = ?`).get(id);
    if (!r) fail(404, 'درخواست پیدا نشد');
    if (r.status !== 'pending') fail(400, 'این درخواست قبلاً رسیدگی شده است');
    return r;
  };

  app.post('/api/requests/:id/cancel', auth(...REQUESTER_ROLES), (req, res) => {
    const r = loadPending(req.params.id);
    if (r.requester_id !== req.user.id) fail(403, 'دسترسی ندارید');
    db.prepare("UPDATE requests SET status = 'cancelled', handled_at = datetime('now') WHERE id = ?").run(r.id);
    res.json(db.prepare(`${REQUEST_SELECT} WHERE r.id = ?`).get(r.id));
  });

  // Supervisor hands the items over and records it; stock drops by what was actually given.
  app.post('/api/requests/:id/deliver', auth('supervisor', 'admin'), (req, res) => {
    const r = loadPending(req.params.id);
    assertManages(req.user, r.workshop_id);
    const delivered = int(req.body.quantity ?? r.quantity, 'تعداد تحویلی', { min: 1 });
    if (delivered > r.quantity) fail(400, 'تعداد تحویلی بیشتر از مقدار درخواستی است');
    const note = text(req.body.note, 'توضیحات', { required: false, max: 500 });
    tx(db, () => {
      const { quantity: stock } = db.prepare('SELECT quantity FROM items WHERE id = ?').get(r.item_id);
      if (stock < delivered) fail(400, `موجودی کافی نیست (موجودی فعلی: ${stock})`);
      db.prepare('UPDATE items SET quantity = quantity - ? WHERE id = ?').run(delivered, r.item_id);
      db.prepare(`UPDATE requests SET status = 'delivered', delivered_quantity = ?, response_note = ?,
        handled_by = ?, handled_at = datetime('now') WHERE id = ?`).run(delivered, note, req.user.id, r.id);
      db.prepare("INSERT INTO transactions (item_id, change, kind, request_id, user_id, note) VALUES (?, ?, 'delivery', ?, ?, ?)")
        .run(r.item_id, -delivered, r.id, req.user.id, note);
    });
    res.json(db.prepare(`${REQUEST_SELECT} WHERE r.id = ?`).get(r.id));
  });

  app.post('/api/requests/:id/reject', auth('supervisor', 'admin'), (req, res) => {
    const r = loadPending(req.params.id);
    assertManages(req.user, r.workshop_id);
    const note = text(req.body.note, 'توضیحات', { required: false, max: 500 });
    db.prepare(`UPDATE requests SET status = 'rejected', response_note = ?, handled_by = ?, handled_at = datetime('now')
      WHERE id = ?`).run(note, req.user.id, r.id);
    res.json(db.prepare(`${REQUEST_SELECT} WHERE r.id = ?`).get(r.id));
  });

  // --- dashboard ----------------------------------------------------------
  app.get('/api/stats', auth(), (req, res) => {
    const u = req.user;
    const one = (sql, ...p) => db.prepare(sql).get(...p).n;
    if (u.role === 'admin') {
      return res.json({
        users: one('SELECT COUNT(*) AS n FROM users WHERE active = 1'),
        workshops: one('SELECT COUNT(*) AS n FROM workshops'),
        items: one('SELECT COUNT(*) AS n FROM items'),
        pending: one("SELECT COUNT(*) AS n FROM requests WHERE status = 'pending'"),
      });
    }
    if (u.role === 'supervisor') {
      return res.json({
        workshops: one('SELECT COUNT(*) AS n FROM workshops WHERE supervisor_id = ?', u.id),
        items: one('SELECT COUNT(*) AS n FROM items i JOIN workshops w ON w.id = i.workshop_id WHERE w.supervisor_id = ?', u.id),
        low_stock: one('SELECT COUNT(*) AS n FROM items i JOIN workshops w ON w.id = i.workshop_id WHERE w.supervisor_id = ? AND i.quantity = 0', u.id),
        pending: one(`SELECT COUNT(*) AS n FROM requests r JOIN items i ON i.id = r.item_id JOIN workshops w ON w.id = i.workshop_id
          WHERE w.supervisor_id = ? AND r.status = 'pending'`, u.id),
      });
    }
    res.json({
      pending: one("SELECT COUNT(*) AS n FROM requests WHERE requester_id = ? AND status = 'pending'", u.id),
      delivered: one("SELECT COUNT(*) AS n FROM requests WHERE requester_id = ? AND status = 'delivered'", u.id),
      rejected: one("SELECT COUNT(*) AS n FROM requests WHERE requester_id = ? AND status = 'rejected'", u.id),
    });
  });

  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'مسیر پیدا نشد')));

  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'درخواست نامعتبر است' });
    console.error(err);
    res.status(500).json({ error: 'خطای داخلی سرور' });
  });

  return app;
}

module.exports = { createApp };
