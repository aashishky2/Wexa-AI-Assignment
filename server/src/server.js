const app = require('./app');
const { verifyConnectivity, closeDriver } = require('./config/db');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await verifyConnectivity();
    logger.info('Database connectivity verified.');
  } catch (error) {
    logger.warn(`Database not connected: ${error.message}. Running in development/standby mode.`);
  }

  app.listen(PORT, () => {
    logger.info(`SentinelGraph AI server running at http://localhost:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Graceful Shutdown
process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  await closeDriver();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await closeDriver();
  process.exit(0);
});

startServer();
