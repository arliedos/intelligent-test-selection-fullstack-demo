const path = require('node:path');
const express = require('express');
const router = require('./routes');

// Recognized validation/parse/size errors carry their own safe status and
// publicMessage (or a body-parser `type`) and keep their 4xx/413. Anything
// else is unexpected -- it must not leak its message or stack to the
// client, so it always becomes a generic 500.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err && err.type === 'entity.too.large') {
    res.status(413).json({ error: 'request body too large' });
    return;
  }
  if (err && err.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'malformed JSON body' });
    return;
  }
  if (err && typeof err.status === 'number' && typeof err.publicMessage === 'string') {
    res.status(err.status).json({ error: err.publicMessage });
    return;
  }
  res.status(500).json({ error: 'internal server error' });
}

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use(router);

  app.use((req, res) => {
    res.status(404).json({ error: 'not found' });
  });

  app.use(errorHandler);

  return app;
}

module.exports = { createApp, errorHandler };
