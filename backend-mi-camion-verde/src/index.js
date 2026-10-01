const app = require('./app');

if (!process.env.VERCEL) {
  const port = Number(process.env.PORT || 4000);
  app.listen(port, () => {
    console.log(`API de Mi Camión Verde en http://localhost:${port}`);
  });
}

module.exports = app;
