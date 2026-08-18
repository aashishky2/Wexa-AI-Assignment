const { executeRead } = require('../config/db');
const logger = require('../utils/logger');
const sampleGraphService = require('./sampleGraphService');
const { isDatabaseUnavailable } = require('../utils/resilientFallback');

/**
 * Get all Data Assets for the UI dropdown from live CognoDB
 */
const getAllAssets = async () => {
  try {
    const query = `
      MATCH (d:DataAsset)
      RETURN d
      ORDER BY d.name
    `;
    const result = await executeRead(query);
    
    return result.records.map(record => {
      const node = record.get('d').properties;
      return {
        id: node.id,
        name: node.name,
        classification: node.classification,
        sensitivity: node.sensitivity,
        description: node.description
      };
    });
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      logger.warn('Serving DataAsset list from sample data', { error: error.message });
      return sampleGraphService.getAllAssets();
    }
    logger.error('Error in getAllAssets', { error: error.message });
    throw error;
  }
};

/**
 * Check Relationship-Based Access Control (ReBAC)
 * Evaluates if a Contributor has access to a Data Asset based on live graph relationships.
 */
const checkAccess = async (contributorId, assetId, passportToken = null) => {
  try {
    const query = `
      MATCH (c:Contributor {id: $contributorId})
      MATCH (d:DataAsset {id: $assetId})
      
      // Look for authorized paths
      OPTIONAL MATCH p1 = (c)-[r1:WORKS_AT]->(o:Organization)-[r2:OWNS_ASSET]->(d)
      OPTIONAL MATCH p2 = (c)-[r3:CONTRIBUTED_TO]->(p:Project)-[r4:HAS_ACCESS_TO]->(d)
      
      WITH CASE 
        WHEN p1 IS NOT NULL THEN [c, r1, o, r2, d]
        WHEN p2 IS NOT NULL THEN [c, r3, p, r4, d]
        ELSE NULL
      END AS validPath
      
      WHERE validPath IS NOT NULL
      RETURN validPath LIMIT 1
    `;
    
    const result = await executeRead(query, { contributorId, assetId });
    
    if (result.records.length === 0) {
      return {
        granted: false,
        reason: "No authorized relationship path found between the identity and the asset in the Knowledge Graph.",
        path: null
      };
    }
    
    const validPath = result.records[0].get('validPath');
    const formattedPath = validPath.map(item => {
      if (item.labels) {
        return {
          type: 'node',
          label: item.labels[0],
          name: item.properties.name || item.properties.username
        };
      }
      if (item.type) {
        return {
          type: 'relationship',
          label: item.type
        };
      }
      return item;
    });
    
    return {
      granted: true,
      reason: "Access granted based on live organizational/project graph relationships.",
      path: formattedPath
    };
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      logger.warn('Serving ReBAC check from sample data', { error: error.message, contributorId, assetId });
      return sampleGraphService.checkAccess(contributorId, assetId);
    }
    logger.error('Error in checkAccess', { error: error.message, contributorId, assetId });
    throw error;
  }
};

module.exports = {
  getAllAssets,
  checkAccess
};
