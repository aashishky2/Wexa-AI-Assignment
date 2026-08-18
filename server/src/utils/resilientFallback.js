const logger = require('./logger');

function isDatabaseUnavailable(error) {
  const message = error?.message || '';
  return [
    'Database driver is not initialized',
    'missing COGNODB_URI',
    'FIREWALL_BLOCK',
    'ECONNRESET',
    'ServiceUnavailable',
    'Failed to connect to CognoDB',
  ].some(marker => message.includes(marker));
}

async function withSampleDataFallback(operation, fallback, label) {
  try {
    return await operation();
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      throw error;
    }

    logger.warn(`[SampleDataFallback] ${label} served from sample data: ${error.message}`);
    return fallback();
  }
}

module.exports = {
  isDatabaseUnavailable,
  withSampleDataFallback,
};
