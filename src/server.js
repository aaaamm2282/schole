const os = require('node:os');
const path = require('node:path');
const { openDb } = require('./db');
const { createApp } = require('./app');

const dbFile = process.env.DB_FILE || path.join(__dirname, '..', 'data', 'schole.db');
const port = Number(process.env.PORT) || 3000;

const app = createApp(openDb(dbFile));
// Listen on all interfaces so phones on the same Wi-Fi can open it.
app.listen(port, '0.0.0.0', () => {
  console.log(`سامانه انبار مدرسه روی http://localhost:${port} اجرا شد`);
  for (const nets of Object.values(os.networkInterfaces())) {
    for (const n of nets || []) {
      if (n.family === 'IPv4' && !n.internal) console.log(`  از گوشی در همان شبکه: http://${n.address}:${port}`);
    }
  }
});
