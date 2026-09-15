const { createApp } = require('./app');

// Binds to the loopback address by default so the server is not reachable
// from other hosts on the network unless an operator deliberately opts in
// via HOST. Documented in README.md's "Running the app" section.
function startServer({ port = process.env.PORT || 4317, host = process.env.HOST || '127.0.0.1' } = {}) {
  const app = createApp();
  const server = app.listen(port, host, () => {
    // eslint-disable-next-line no-console
    console.log(`ShopSphere listening on http://${host}:${port}`);
  });
  return server;
}

function shutdown(server, signal) {
  // eslint-disable-next-line no-console
  console.log(`${signal} received, shutting down ShopSphere gracefully`);
  server.close((err) => {
    if (err) {
      process.exitCode = 1;
    }
    process.exit();
  });
}

if (require.main === module) {
  const server = startServer();
  process.on('SIGINT', () => shutdown(server, 'SIGINT'));
  process.on('SIGTERM', () => shutdown(server, 'SIGTERM'));
}

module.exports = { startServer };
