const { driver } = require('../config/db');
const crypto = require('crypto');
const logger = require('../utils/logger');

class AuditService {
  constructor() {
    this.inMemoryLogs = [];
  }

  async logAccess(userId, action, resourceType, resourceId, decision, reason) {
    const logEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      userId,
      action,
      resourceType,
      resourceId,
      decision,
      reason,
    };

    if (driver) {
      const session = driver.session();
      try {
        const result = await session.run(
          `CREATE (a:AuditLog {
             id: $id,
             timestamp: timestamp(),
             userId: $userId,
             action: $action,
             resourceType: $resourceType,
             resourceId: $resourceId,
             decision: $decision,
             reason: $reason
           })
           RETURN a`,
          logEntry
        );
        return result.records[0].get('a').properties;
      } catch (err) {
        logger.warn(`[AuditService] Failed to persist audit log in graph DB: ${err.message}. Falling back to memory.`);
      } finally {
        await session.close();
      }
    }

    // In-memory fallback
    this.inMemoryLogs.unshift(logEntry);
    if (this.inMemoryLogs.length > 200) this.inMemoryLogs.pop();
    return logEntry;
  }

  async getRecentLogs(limit = 50) {
    if (driver) {
      const session = driver.session();
      try {
        const result = await session.run(
          `MATCH (a:AuditLog)
           RETURN a
           ORDER BY a.timestamp DESC
           LIMIT toInteger($limit)`,
          { limit }
        );
        return result.records.map(record => {
          const props = record.get('a').properties;
          if (props.timestamp) {
            if (typeof props.timestamp.toNumber === 'function') {
              props.timestamp = props.timestamp.toNumber();
            } else if (typeof props.timestamp.toString === 'function') {
              props.timestamp = props.timestamp.toString();
            }
          }
          return props;
        });
      } catch (err) {
        logger.warn(`[AuditService] Error querying graph audit logs: ${err.message}`);
      } finally {
        await session.close();
      }
    }

    return this.inMemoryLogs.slice(0, limit);
  }
}

module.exports = new AuditService();
