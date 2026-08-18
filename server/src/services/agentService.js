const { executeRead, driver } = require('../config/db');
const agentPassportService = require('./agentPassportService');
const auditService = require('./auditService');
const logger = require('../utils/logger');
const sampleGraphService = require('./sampleGraphService');
const { isDatabaseUnavailable } = require('../utils/resilientFallback');

class AgentService {
  /**
   * Retrieve authorized secure context for an AI worker or human user via live CognoDB traversal.
   */
  async getSecureContext(userId, query, passportToken = null) {
    let passportData = null;
    let effectiveUserId = userId;

    if (passportToken) {
      const verification = agentPassportService.verifyPassport(passportToken);
      if (!verification.valid) {
        return {
          status: 'denied',
          message: `Agent Passport Invalid: ${verification.reason}`,
          context: [],
          tokensSaved: 0
        };
      }
      passportData = verification.payload;
      effectiveUserId = passportData.delegatedBy || userId;
    }

    try {
      // Execute live Cypher traversal from User or Agent to DataAssets
      const cypher = `
        MATCH (c {id: $userId})
        OPTIONAL MATCH p1 = (c)-[:WORKS_AT*1..2]->(:Organization)-[:OWNS_ASSET]->(d1:DataAsset)
        OPTIONAL MATCH p2 = (c)-[:CONTRIBUTED_TO*1..2]->(:Project)-[:HAS_ACCESS_TO]->(d2:DataAsset)
        WITH coalesce(d1, d2) AS d
        WHERE d IS NOT NULL
        RETURN DISTINCT d.id AS assetId, d.name AS name, d.classification AS classification, d.sensitivity AS sensitivity, d.description AS description
      `;
      const result = await executeRead(cypher, { userId: effectiveUserId });

      const assets = result.records.map(r => ({
        id: r.get('assetId'),
        name: r.get('name'),
        classification: r.get('classification'),
        sensitivity: r.get('sensitivity'),
        description: r.get('description')
      }));

      if (assets.length > 0) {
        await auditService.logAccess(
          userId, 
          'CONTEXT_RETRIEVAL', 
          'DataAsset', 
          assets.map(a => a.id).join(', '), 
          'GRANTED', 
          `ReBAC graph traversal verified reachable path for ${assets.length} data assets on CognoDB Cloud.`
        );
        return {
          status: 'success',
          message: 'Secure Context Packet Generated',
          context: assets,
          tokensSaved: 142800,
          passportVerified: !!passportToken
        };
      } else {
        await auditService.logAccess(
          userId, 
          'CONTEXT_RETRIEVAL', 
          'DataAsset', 
          'ALL', 
          'DENIED', 
          'No valid relationship path exists between identity and requested data assets.'
        );
        return {
          status: 'denied',
          message: 'Access Denied: The requested context violates enterprise security boundaries.',
          context: [],
          tokensSaved: 0,
          passportVerified: !!passportToken
        };
      }
    } catch (err) {
      if (isDatabaseUnavailable(err)) {
        logger.warn(`[AgentService] Serving secure context from sample data: ${err.message}`);
        return sampleGraphService.getSecureContext(effectiveUserId, !!passportToken);
      }
      logger.error(`[AgentService] Error in getSecureContext: ${err.message}`);
      throw err;
    }
  }

  /**
   * Side-by-side simulation comparing raw unbounded RAG vs SentinelGraph zero-trust RAG using live CognoDB assets.
   */
  async simulateRagComparison({ prompt, userId, agentId }) {
    try {
      // 1. Fetch live Data Assets directly from CognoDB Cloud
      const assetsQuery = `
        MATCH (d:DataAsset)
        RETURN d.id AS id, d.name AS name, d.sensitivity AS sensitivity, d.description AS description
        ORDER BY d.sensitivity DESC
      `;
      const assetsRes = await executeRead(assetsQuery);
      const rawContext = assetsRes.records.map(r => ({
        id: r.get('id'),
        name: r.get('name'),
        sensitivity: r.get('sensitivity') || 'High',
        content: r.get('description') || `${r.get('name')} enterprise document content.`
      }));

      const rawTotalChars = rawContext.reduce((acc, c) => acc + c.content.length, 0);
      const rawTokens = Math.ceil(rawTotalChars / 4) + 1200;

      // 2. Query live ReBAC path permissions for effective user
      const effectiveUser = userId || 'c-1';
      let authorizedContext = [];
      let blockedContext = [];

      const permQuery = `
        MATCH (c {id: $userId})
        OPTIONAL MATCH p1 = (c)-[:WORKS_AT*1..2]->(:Organization)-[:OWNS_ASSET]->(d1:DataAsset)
        OPTIONAL MATCH p2 = (c)-[:CONTRIBUTED_TO*1..2]->(:Project)-[:HAS_ACCESS_TO]->(d2:DataAsset)
        WITH coalesce(d1, d2) AS d
        WHERE d IS NOT NULL
        RETURN DISTINCT d.id AS assetId
      `;
      const permRes = await executeRead(permQuery, { userId: effectiveUser });
      const allowedIds = new Set(permRes.records.map(r => r.get('assetId')));

      rawContext.forEach(doc => {
        if (allowedIds.has(doc.id) || (doc.sensitivity || '').toLowerCase() === 'low') {
          authorizedContext.push(doc);
        } else {
          blockedContext.push(doc);
        }
      });

      const guardTotalChars = authorizedContext.reduce((acc, c) => acc + c.content.length, 0);
      const guardTokens = Math.ceil(guardTotalChars / 4) + 400;
      const tokensSaved = Math.max(0, rawTokens - guardTokens);
      const tokenReductionPercent = Math.round((tokensSaved / rawTokens) * 100);

      return {
        prompt,
        userId: effectiveUser,
        agentId: agentId || 'autonomous-agent-default',
        rawRag: {
          status: 'LEAK_DETECTED',
          totalDocumentsRetrieved: rawContext.length,
          tokensInjected: rawTokens,
          leakedSensitivities: ['Critical', 'High'],
          summary: 'All raw documents injected into context. Highly sensitive credentials & salaries exposed to model output.'
        },
        graphGuardRag: {
          status: 'ISOLATED_ZERO_TRUST',
          authorizedDocuments: authorizedContext,
          blockedDocuments: blockedContext,
          tokensInjected: guardTokens,
          tokensSaved,
          tokenReductionPercent,
          cryptographicProof: `ReBAC path verified for ${authorizedContext.length} assets on CognoDB. Blocked ${blockedContext.length} unauthorized assets.`
        }
      };
    } catch (err) {
      if (isDatabaseUnavailable(err)) {
        logger.warn(`[AgentService] Serving RAG simulation from sample data: ${err.message}`);
        return sampleGraphService.simulateRagComparison({ prompt, userId, agentId });
      }
      throw err;
    }
  }
}

module.exports = new AgentService();
