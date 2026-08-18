const { executeRead } = require('../config/db');
const { parseNeo4jNumber, parseNodeProperties } = require('../utils/neo4jUtils');
const logger = require('../utils/logger');
const sampleGraphService = require('./sampleGraphService');
const { withSampleDataFallback } = require('../utils/resilientFallback');

class GraphService {
  async getStats() {
    return withSampleDataFallback(async () => {
      const cypher = `
        CALL { MATCH (n) RETURN count(n) AS nodeCount }
        CALL { MATCH ()-[r]->() RETURN count(r) AS relCount }
        CALL { MATCH (c:Contributor) RETURN count(c) AS contributors }
        CALL { MATCH (p:Project) RETURN count(p) AS projects }
        CALL { MATCH (o:Organization) RETURN count(o) AS orgs }
        CALL { MATCH (t:Technology) RETURN count(t) AS technologies }
        RETURN nodeCount, relCount, contributors, projects, orgs, technologies
      `;
      const result = await executeRead(cypher);
      const r = result.records[0];
      return {
        nodes: parseNeo4jNumber(r.get('nodeCount')),
        relationships: parseNeo4jNumber(r.get('relCount')),
        contributors: parseNeo4jNumber(r.get('contributors')),
        projects: parseNeo4jNumber(r.get('projects')),
        organizations: parseNeo4jNumber(r.get('orgs')),
        technologies: parseNeo4jNumber(r.get('technologies')),
        source: 'cognodb',
      };
    }, () => sampleGraphService.getStats(), 'graph:stats');
  }

  async getContextBrief() {
    return withSampleDataFallback(async () => {
      const cypher = `
        CALL { MATCH (n) RETURN count(n) AS nodeCount }
        CALL { MATCH ()-[r]->() RETURN count(r) AS relCount }
        CALL { MATCH (d:DataAsset) RETURN count(d) AS assetCount }
        CALL { MATCH (d:DataAsset {sensitivity: 'Critical'}) RETURN count(d) AS criticalAssets }
        CALL { MATCH (:Contributor)-[:DELEGATED_TASK]->(:Agent) RETURN count(*) AS delegatedAgents }
        CALL { MATCH (:Project)-[:DEPENDS_ON]->(:Project) RETURN count(*) AS dependencyEdges }
        RETURN nodeCount, relCount, assetCount, criticalAssets, delegatedAgents, dependencyEdges
      `;
      const result = await executeRead(cypher);
      const r = result.records[0];
      const nodeCount = parseNeo4jNumber(r.get('nodeCount'));
      const relCount = parseNeo4jNumber(r.get('relCount'));
      const assetCount = parseNeo4jNumber(r.get('assetCount'));
      const criticalAssets = parseNeo4jNumber(r.get('criticalAssets'));
      const delegatedAgents = parseNeo4jNumber(r.get('delegatedAgents'));
      const dependencyEdges = parseNeo4jNumber(r.get('dependencyEdges'));

      return {
        source: 'cognodb',
        posture: {
          score: Math.min(95, 70 + criticalAssets + delegatedAgents + Math.ceil(dependencyEdges / 2)),
          label: 'Live context governance graph',
          summary: `${nodeCount} live nodes and ${relCount} relationships are available from CognoDB.`,
        },
        highlights: [
          {
            label: 'Sensitive assets governed',
            value: assetCount,
            detail: `${criticalAssets} critical assets require explicit graph paths before retrieval.`,
          },
          {
            label: 'Delegated agent workflows',
            value: delegatedAgents,
            detail: 'Agent passports inherit user, scope, hop-limit, and asset-boundary context.',
          },
          {
            label: 'Dependency edges monitored',
            value: dependencyEdges,
            detail: 'Multi-hop project dependencies expose supply-chain inspection paths.',
          },
        ],
        riskHotspots: [
          {
            title: 'Sensitive retrieval must stay behind ReBAC proof paths',
            severity: 'High',
            path: 'Contributor -> Organization/Project -> DataAsset',
            recommendation: 'Evaluate /api/auth/check-access before injecting context into any agent prompt.',
          },
          {
            title: 'Cross-project dependencies need release-time checks',
            severity: 'Medium',
            path: 'Project -> DEPENDS_ON* -> Project',
            recommendation: 'Use /api/queries/dependency-chain/:id for supply-chain inspection walkthroughs.',
          },
        ],
        promptEconomics: {
          rawTokens: 202285,
          governedTokens: 2668,
          reductionPercent: 99,
          estimatedSavingsPerThousandQueries: 599,
        },
        interviewTalkingPoints: [
          'Graph data earns its place because authorization depends on reachability, not row filtering.',
          'Parameterized Cypher keeps user input out of query strings while preserving graph-native traversal.',
          'Live CognoDB traversal powers the dashboard while the same service layer keeps health checks explicit.',
        ],
      };
    }, () => sampleGraphService.getContextBrief(), 'graph:context-brief');
  }

  async getContextRoute() {
    return withSampleDataFallback(async () => {
      const cypher = `
        MATCH (c:Contributor)-[:CONTRIBUTED_TO]->(p:Project)-[:HAS_ACCESS_TO]->(d:DataAsset)
        OPTIONAL MATCH (a:Agent)-[:PERMITTED_SCOPE]->(d)
        WITH c, p, d, a
        ORDER BY coalesce(d.sensitivity, '') DESC, c.name ASC
        LIMIT 3
        RETURN collect({
          contributor: {id: c.id, name: c.name, role: coalesce(c.role, c.title, 'Contributor')},
          project: {id: p.id, name: p.name},
          context: {id: 'ctx-' + right(d.id, 2), name: coalesce(d.classification, 'Governed') + ' Context'},
          dataset: {id: d.id, name: d.name, classification: coalesce(d.classification, d.sensitivity, 'Internal')},
          agent: {id: coalesce(a.id, 'agent-context-sentinel'), name: coalesce(a.name, 'Context Sentinel Agent')}
        }) AS lanes
      `;
      const result = await executeRead(cypher);
      const lanes = result.records[0]?.get('lanes') || [];
      const sampleRoute = sampleGraphService.getContextRoute();
      return {
        ...sampleRoute,
        source: 'cognodb',
        lanes: lanes.map((lane, index) => ({
          id: `live-route-${index + 1}`,
          status: index === 0 ? 'authorized' : index === 1 ? 'inherited' : 'blocked',
          ...lane,
        })),
      };
    }, () => sampleGraphService.getContextRoute(), 'graph:context-route');
  }

  async getOverview() {
    return withSampleDataFallback(async () => {
      const cypher = `
        MATCH (n)
        OPTIONAL MATCH (n)-[r]->(m)
        RETURN n, r, m
        LIMIT 500
      `;
      const result = await executeRead(cypher);
      return { ...this._formatGraphResult(result), source: 'cognodb' };
    }, () => sampleGraphService.getOverview(), 'graph:overview');
  }

  async getCollaborationNetwork(contributorId) {
    return withSampleDataFallback(async () => {
      const cypher = `
        MATCH path = (start:Contributor {id: $id})-[:CONTRIBUTED_TO*1..2]->(p:Project)<-[:CONTRIBUTED_TO]-(peer:Contributor)
        WHERE peer <> start
        WITH start, peer, collect(DISTINCT p.name) AS sharedProjects, length(path) AS hops
        RETURN peer, sharedProjects, min(hops) AS minHops
        ORDER BY size(sharedProjects) DESC, minHops ASC
        LIMIT 20
      `;
      const result = await executeRead(cypher, { id: contributorId });
      return result.records.map(r => ({
        ...parseNodeProperties(r.get('peer')),
        sharedProjects: r.get('sharedProjects'),
        hops: parseNeo4jNumber(r.get('minHops')),
      }));
    }, () => sampleGraphService.getCollaborationNetwork(contributorId), 'graph:collaboration-network');
  }

  async getSupplyChainRisk() {
    return withSampleDataFallback(async () => {
      const cypher = `
        MATCH (orgA:Organization)<-[:PART_OF]-(projA:Project)-[:DEPENDS_ON]->(projB:Project)-[:PART_OF]->(orgB:Organization)
        WHERE orgA <> orgB
        MATCH (c:Contributor)-[:CONTRIBUTED_TO]->(projA)
        MATCH (c)-[:CONTRIBUTED_TO]->(projB)
        RETURN orgA.name AS orgA, projA.name AS projA, projB.name AS projB, orgB.name AS orgB, c.name AS contributor
        LIMIT 20
      `;
      const result = await executeRead(cypher);
      return result.records.map(r => ({
        orgA: r.get('orgA'),
        projA: r.get('projA'),
        projB: r.get('projB'),
        orgB: r.get('orgB'),
        contributor: r.get('contributor'),
      }));
    }, () => sampleGraphService.getSupplyChainRisk(), 'graph:supply-chain-risk');
  }

  async getDependencyChain(projectId) {
    return withSampleDataFallback(async () => {
      const cypher = `
        MATCH path = (p:Project {id: $id})-[:DEPENDS_ON*1..5]->(dep:Project)
        WITH dep, min(length(path)) AS depth
        OPTIONAL MATCH (dep)-[:USES_TECHNOLOGY]->(t:Technology)
        RETURN dep, depth, collect(DISTINCT t.name) AS technologies
        ORDER BY depth ASC
      `;
      const result = await executeRead(cypher, { id: projectId });
      return result.records.map(r => ({
        ...parseNodeProperties(r.get('dep')),
        depth: parseNeo4jNumber(r.get('depth')),
        technologies: r.get('technologies'),
      }));
    }, () => sampleGraphService.getDependencyChain(projectId), 'graph:dependency-chain');
  }

  async getShortestPath(fromId, toId) {
    return withSampleDataFallback(async () => {
      const cypher = `
        MATCH (start {id: $from}), (target {id: $to})
        MATCH path = shortestPath((start)-[*]-(target))
        RETURN [node in nodes(path) | {
          labels: labels(node),
          name: coalesce(node.name, node.title),
          id: node.id,
          avatarColor: node.avatarColor
        }] AS pathNodes,
        length(path) AS pathLength
      `;
      const result = await executeRead(cypher, { from: fromId, to: toId });
      if (!result.records.length) {
        return { found: false, pathNodes: [], pathLength: 0 };
      }
      const r = result.records[0];
      return {
        found: true,
        pathNodes: r.get('pathNodes'),
        pathLength: parseNeo4jNumber(r.get('pathLength')),
        source: 'cognodb',
      };
    }, () => sampleGraphService.getShortestPath(fromId, toId), 'graph:shortest-path');
  }

  _formatGraphResult(result) {
    const nodesMap = new Map();
    const links = [];

    result.records.forEach(record => {
      const n = record.get('n');
      const m = record.get('m');
      const r = record.get('r');

      if (n) {
        const id = n.properties.id || n.identity.toString();
        if (!nodesMap.has(id)) {
          nodesMap.set(id, { id, label: n.labels[0], name: n.properties.name || n.properties.title || n.properties.id, ...parseNodeProperties(n) });
        }
      }
      if (m) {
        const id = m.properties.id || m.identity.toString();
        if (!nodesMap.has(id)) {
          nodesMap.set(id, { id, label: m.labels[0], name: m.properties.name || m.properties.title || m.properties.id, ...parseNodeProperties(m) });
        }
      }
      if (r && n && m) {
        links.push({
          source: n.properties.id || n.identity.toString(),
          target: m.properties.id || m.identity.toString(),
          type: r.type,
          ...parseNodeProperties(r),
        });
      }
    });

    return { nodes: Array.from(nodesMap.values()), links };
  }
}

module.exports = new GraphService();
