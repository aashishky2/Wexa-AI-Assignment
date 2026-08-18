require('dotenv').config();
const neo4j = require('neo4j-driver');
const logger = require('../utils/logger');

const URI = process.env.COGNODB_URI;
const USER = process.env.COGNODB_USER || 'cognodb';
const PASSWORD = process.env.COGNODB_PASSWORD;

if (!URI || !PASSWORD) {
  logger.warn('COGNODB_URI and COGNODB_PASSWORD are not configured. Live graph operations will use the transparent sample data until CognoDB credentials are provided.');
}

const driver = (URI && PASSWORD)
  ? neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD), {
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 10000,
      connectionTimeout: 10000,
    })
  : null;

async function verifyConnectivity() {
  if (!driver) {
    throw new Error('Database driver is not initialized (missing COGNODB_URI or COGNODB_PASSWORD).');
  }
  try {
    await driver.verifyConnectivity();
    logger.info('Connected to CognoDB successfully.');
    return true;
  } catch (error) {
    logger.error('Failed to connect to CognoDB', { error: error.message });
    
    // Add firewall block context for Vercel/Cloud IPs receiving ECONNRESET
    if (error.message && error.message.includes('ECONNRESET')) {
      error.message = 'FIREWALL_BLOCK: CognoDB Cloud is actively dropping TCP connections from this IP address (Vercel/Cloud). Please run locally (localhost:3000) or check CognoDB IP Allowlist settings. Original Error: ' + error.message;
    }
    
    throw error;
  }
}

/**
 * Execute a read transaction with automatic retries for transient errors.
 */
async function executeRead(cypher, params = {}) {
  if (!driver) {
    throw new Error('Database driver is not initialized.');
  }
  const session = driver.session({ database: 'neo4j' });
  try {
    return await session.executeRead(tx => tx.run(cypher, params));
  } catch (error) {
    if (error.message && error.message.includes('ECONNRESET')) {
      error.message = 'FIREWALL_BLOCK: CognoDB Cloud is actively dropping TCP connections from this IP address (Vercel/Cloud). Please run locally (localhost:3000) or check CognoDB IP Allowlist settings. Original Error: ' + error.message;
    }
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Execute a write transaction with automatic retries for transient errors.
 */
async function executeWrite(cypher, params = {}) {
  if (!driver) {
    throw new Error('Database driver is not initialized.');
  }
  const session = driver.session({ database: 'neo4j' });
  try {
    return await session.executeWrite(tx => tx.run(cypher, params));
  } catch (error) {
    if (error.message && error.message.includes('ECONNRESET')) {
      error.message = 'FIREWALL_BLOCK: CognoDB Cloud is actively dropping TCP connections from this IP address (Vercel/Cloud). Please run locally (localhost:3000) or check CognoDB IP Allowlist settings. Original Error: ' + error.message;
    }
    throw error;
  } finally {
    await session.close();
  }
}

async function closeDriver() {
  if (driver) {
    await driver.close();
  }
}

module.exports = {
  driver,
  verifyConnectivity,
  executeRead,
  executeWrite,
  closeDriver
};
