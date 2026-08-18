const crypto = require('crypto');
const { executeRead, executeWrite } = require('../config/db');
const logger = require('../utils/logger');
const sampleGraphService = require('./sampleGraphService');
const { isDatabaseUnavailable } = require('../utils/resilientFallback');

const PASSPORT_SECRET = process.env.AGENT_SECRET_KEY || 'sentinelgraph_agent_master_secret_2026';

class AgentPassportService {
  /**
   * Mint an ephemeral cryptographic passport for an autonomous AI agent.
   */
  async mintPassport({ agentId, delegatedBy, task, ttlMinutes = 60, allowedScopes = ['Internal', 'Confidential'], maxHops = 2 }) {
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + (ttlMinutes * 60);
    const passportId = `pass_${crypto.randomBytes(8).toString('hex')}`;

    const payload = {
      pid: passportId,
      sub: agentId,
      delegatedBy,
      task,
      iat: issuedAt,
      exp: expiresAt,
      scopes: allowedScopes,
      maxHops,
      fingerprint: crypto.createHash('sha256').update(`${agentId}:${delegatedBy}:${issuedAt}`).digest('hex').substring(0, 16)
    };

    const encodedHeader = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'AGENT_PASSPORT' })).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', PASSPORT_SECRET).update(`${encodedHeader}.${encodedPayload}`).digest('base64url');

    const token = `${encodedHeader}.${encodedPayload}.${signature}`;

    logger.info(`[AgentPassport] Minted passport ${passportId} for agent '${agentId}' delegated by '${delegatedBy}' (TTL: ${ttlMinutes}m)`);

    // Record passport issuance directly in live CognoDB graph
    try {
      await executeWrite(
        `MERGE (a:Agent {id: $agentId})
         MERGE (u:Contributor {id: $delegatedBy})
         CREATE (p:Passport {
           id: $passportId,
           task: $task,
           issuedAt: datetime(),
           expiresAt: datetime({epochSeconds: $expiresAt}),
           maxHops: $maxHops,
           scopes: $scopes
         })
         CREATE (u)-[:ISSUED_PASSPORT]->(p)-[:AUTHORIZED_AGENT]->(a)`,
        {
          agentId,
          delegatedBy,
          passportId,
          task,
          expiresAt,
          maxHops,
          scopes: allowedScopes
        }
      );
    } catch (err) {
      const log = isDatabaseUnavailable(err) ? logger.warn.bind(logger) : logger.error.bind(logger);
      log(`[AgentPassport] Passport graph persistence skipped: ${err.message}`);
    }

    return {
      passportId,
      token,
      payload,
      expiresAt: new Date(expiresAt * 1000).toISOString()
    };
  }

  /**
   * Cryptographically verify an agent passport and extract its active boundaries.
   */
  verifyPassport(token) {
    if (!token || typeof token !== 'string') {
      return { valid: false, reason: 'Passport token missing or malformed' };
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, reason: 'Invalid passport token structure' };
    }

    const [headerB64, payloadB64, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', PASSPORT_SECRET).update(`${headerB64}.${payloadB64}`).digest('base64url');

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSig);

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return { valid: false, reason: 'Cryptographic signature mismatch (tampered or forged passport)' };
    }

    try {
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
      const now = Math.floor(Date.now() / 1000);

      if (payload.exp && payload.exp < now) {
        return { valid: false, reason: `Passport expired at ${new Date(payload.exp * 1000).toISOString()}`, payload };
      }

      return {
        valid: true,
        payload,
        remainingSeconds: payload.exp - now
      };
    } catch (err) {
      return { valid: false, reason: 'Corrupted passport payload encoding' };
    }
  }

  /**
   * List all registered Enterprise AI Agents from live CognoDB
   */
  async listAgents() {
    try {
      const cypher = `
        MATCH (a:Agent)
        OPTIONAL MATCH (p:Passport)-[:AUTHORIZED_AGENT]->(a)
        WHERE p.expiresAt > datetime()
        RETURN a, count(DISTINCT p) AS activePassports
        ORDER BY a.name
      `;
      const result = await executeRead(cypher);

      return result.records.map(r => {
        const a = r.get('a').properties;
        return {
          id: a.id,
          name: a.name,
          type: a.type || 'Autonomous Worker',
          framework: a.framework || 'LangChain',
          department: a.department || 'General',
          permittedScopes: a.permittedScopes || ['Internal'],
          maxHops: typeof a.maxHops === 'object' ? Number(a.maxHops.low) : (a.maxHops || 2),
          activePassports: typeof r.get('activePassports') === 'object' ? Number(r.get('activePassports').low) : Number(r.get('activePassports')),
          status: a.status || 'ONLINE'
        };
      });
    } catch (err) {
      if (isDatabaseUnavailable(err)) {
        logger.warn(`[AgentPassport] Serving agent list from sample data: ${err.message}`);
        return sampleGraphService.listAgents();
      }
      throw err;
    }
  }
}

module.exports = new AgentPassportService();
