// File: index.js atau server.js
const app = require('./app');
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`
  🚀 Server is running on:
  ▶ PORT       : ${PORT}
  ▶ ENV        : ${process.env.NODE_ENV || 'development'}
  ▶ FRONTEND   : ${process.env.FRONTEND_URL || 'not set'}

  ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
  █               █
  █   BACKEND     █
  █   READY ✅     █
  █               █
  ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
  `);
});