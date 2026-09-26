const path = require('node:path');
const { openDb } = require('./db');
const { createApp } = require('./app');

const dbFile = process.env.DB_FILE || path.join(__dirname, '..', 'data', 'schole.db');
const port = Number(process.env.PORT) || 3000;

const app = createApp(openDb(dbFile));
app.listen(port, () => {
  console.log(`سامانه انبار مدرسه روی http://localhost:${port} اجرا شد`);
});
