const { test } = require('node:test');
const assert = require('node:assert');
const { openDb } = require('../src/db');
const { createApp } = require('../src/app');

function client(base) {
  let cookie = '';
  return async (method, path, body) => {
    const res = await fetch(base + '/api' + path, {
      method,
      headers: { 'Content-Type': 'application/json', cookie },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: res.status, body: await res.json() };
  };
}

test('admin assigns roles, supervisor stocks items, teacher requests, supervisor delivers', async (t) => {
  const server = createApp(openDb(':memory:')).listen(0);
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;

  const admin = client(base);
  assert.equal((await admin('POST', '/login', { username: 'admin', password: 'admin123' })).status, 200);

  const sup = (await admin('POST', '/users', { username: 'sup', full_name: 'سرپرست برق', password: 'secret1', role: 'supervisor' })).body;
  await admin('POST', '/users', { username: 'sup2', full_name: 'سرپرست دیگر', password: 'secret1', role: 'supervisor' });
  await admin('POST', '/users', { username: 'teach', full_name: 'دبیر فیزیک', password: 'secret1', role: 'teacher' });
  const teacherAsSup = await admin('POST', '/workshops', { name: 'کارگاه برق', supervisor_id: 999 });
  assert.equal(teacherAsSup.status, 400);
  const ws = (await admin('POST', '/workshops', { name: 'کارگاه برق', supervisor_id: sup.id })).body;
  assert.equal(ws.supervisor_name, 'سرپرست برق');

  const teacher = client(base);
  await teacher('POST', '/login', { username: 'teach', password: 'secret1' });
  assert.equal((await teacher('POST', '/users', { username: 'x', full_name: 'x', password: 'secret1', role: 'teacher' })).status, 403);
  assert.equal((await teacher('POST', '/items', { workshop_id: ws.id, name: 'سیم' })).status, 403);

  const other = client(base);
  await other('POST', '/login', { username: 'sup2', password: 'secret1' });
  assert.equal((await other('POST', '/items', { workshop_id: ws.id, name: 'سیم' })).status, 403);

  const s = client(base);
  await s('POST', '/login', { username: 'sup', password: 'secret1' });
  const item = (await s('POST', '/items', { workshop_id: ws.id, name: 'سیم', unit: 'متر', quantity: 10 })).body;
  assert.equal(item.quantity, 10);

  const r = (await teacher('POST', '/requests', { item_id: item.id, quantity: 4, note: 'کلاس دهم' })).body;
  assert.equal(r.status, 'pending');
  assert.equal((await s('GET', '/requests')).body.length, 1);
  assert.equal((await other('GET', '/requests')).body.length, 0);
  assert.equal((await other('POST', `/requests/${r.id}/deliver`, {})).status, 403);

  const tooMuch = (await teacher('POST', '/requests', { item_id: item.id, quantity: 50 })).body;
  assert.equal((await s('POST', `/requests/${tooMuch.id}/deliver`, {})).status, 400);

  const done = (await s('POST', `/requests/${r.id}/deliver`, { quantity: 3 })).body;
  assert.equal(done.status, 'delivered');
  assert.equal(done.delivered_quantity, 3);
  assert.equal(done.item_stock, 7);
  assert.equal((await s('POST', `/requests/${r.id}/deliver`, {})).status, 400);

  const log = (await s('GET', `/items/${item.id}/transactions`)).body;
  assert.deepEqual(log.map((x) => [x.kind, x.change]), [['delivery', -3], ['create', 10]]);
  assert.equal(log[0].requester_name, 'دبیر فیزیک');

  assert.equal((await s('POST', `/requests/${tooMuch.id}/reject`, { note: 'موجودی کافی نیست' })).body.status, 'rejected');
  assert.equal((await s('POST', `/items/${item.id}/stock`, { change: -8 })).status, 400);
  assert.equal((await s('POST', `/items/${item.id}/stock`, { change: 5, note: 'خرید' })).body.quantity, 12);
});

test('deactivated users cannot log in', async (t) => {
  const server = createApp(openDb(':memory:')).listen(0);
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  const admin = client(base);
  await admin('POST', '/login', { username: 'admin', password: 'admin123' });
  const u = (await admin('POST', '/users', { username: 'st', full_name: 'خدمات', password: 'secret1', role: 'staff' })).body;
  const staff = client(base);
  assert.equal((await staff('POST', '/login', { username: 'st', password: 'secret1' })).status, 200);
  await admin('PATCH', `/users/${u.id}`, { active: false });
  assert.equal((await staff('GET', '/me')).status, 401);
  assert.equal((await staff('POST', '/login', { username: 'st', password: 'secret1' })).status, 401);
});
