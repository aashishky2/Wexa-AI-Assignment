let app;
let initError = null;

try {
  const express = require('express');
  const cors = require('cors');
  const apiRoutes = require('../server/src/routes/api');
  const errorHandler = require('../server/src/middlewares/errorHandler');

  app = express();
  app.set('trust proxy', 1);

  app.use(cors());
  app.use(express.json());

  app.use('/api', apiRoutes);
  app.use('/', apiRoutes);

  app.use((req, res) => {
    res.status(404).json({
      error: true,
      message: `Route not found: ${req.method} ${req.originalUrl || req.url}`
    });
  });

  app.use(errorHandler);
} catch (err) {
  initError = err;
}

module.exports = (req, res) => {
  if (initError) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      error: true,
      message: 'Serverless initialization exception: ' + initError.message,
      stack: initError.stack
    }));
  }
  return app(req, res);
};
