const { executeRead } = require('../config/db');
const { parseNeo4jNumber, parseNodeProperties } = require('../utils/neo4jUtils');
const logger = require('../utils/logger');
const sampleGraphService = require('./sampleGraphService');
const { withSampleDataFallback } = require('../utils/resilientFallback');

class ContributorService {
  async getAllContributors() {
    return withSampleDataFallback(async () => {
      const cypher = `
        MATCH (c:Contributor)
        OPTIONAL MATCH (c)-[:CONTRIBUTED_TO]->(p:Project)
        OPTIONAL MATCH (c)-[:WORKS_AT]->(o:Organization)
        OPTIONAL MATCH (c)-[:CONTRIBUTED_TO]->(p2:Project)<-[:CONTRIBUTED_TO]-(co:Contributor) WHERE c <> co

        WITH c,
             count(DISTINCT p) AS projectCount,
             collect(DISTINCT o.name) AS orgList,
             count(DISTINCT co) AS coContributorCount

        // Calculate Graph Influence Score natively
        WITH c, projectCount, orgList,
             (projectCount * 15) + (size(orgList) * 25) + (coContributorCount * 5) + (coalesce(c.followers, 0) / 100.0) AS influenceScore

        RETURN c, projectCount, orgList, influenceScore
        ORDER BY influenceScore DESC
      `;
      const result = await executeRead(cypher);

      return result.records.map(r => ({
        ...parseNodeProperties(r.get('c')),
        projectCount: parseNeo4jNumber(r.get('projectCount')),
        org: r.get('orgList')[0] || 'Independent',
        influenceScore: Math.round(parseNeo4jNumber(r.get('influenceScore')))
      }));
    }, () => sampleGraphService.getAllContributors(), 'contributors:list');
  }

  async getContributorById(id) {
    return withSampleDataFallback(async () => {
      const cypher = `
        MATCH (c:Contributor {id: $id})
        OPTIONAL MATCH (c)-[ct:CONTRIBUTED_TO]->(p:Project)
        OPTIONAL MATCH (c)-[wa:WORKS_AT]->(o:Organization)
        OPTIONAL MATCH (c)-[:AUTHORED]->(i:Issue)
        OPTIONAL MATCH (c)-[:FOLLOWS]->(f:Contributor)
        RETURN c,
               collect(DISTINCT {project: p, role: ct.role, commits: ct.commits}) AS projects,
               collect(DISTINCT {org: o, since: wa.since, role: wa.role}) AS orgs,
               collect(DISTINCT i) AS issues,
               collect(DISTINCT {id: f.id, name: f.name, username: f.username, avatarColor: f.avatarColor}) AS following
      `;
      const result = await executeRead(cypher, { id });

      if (!result.records.length) {
        return null;
      }

      const r = result.records[0];
      const c = parseNodeProperties(r.get('c'));

      const projects = r.get('projects')
        .filter(x => x.project)
        .map(x => ({
          ...parseNodeProperties(x.project),
          role: x.role,
          commits: parseNeo4jNumber(x.commits),
        }));

      const orgs = r.get('orgs')
        .filter(x => x.org)
        .map(x => ({
          ...parseNodeProperties(x.org),
          since: parseNeo4jNumber(x.since),
          role: x.role,
        }));

      return {
        ...c,
        projects,
        orgs,
        issues: r.get('issues').map(parseNodeProperties).filter(Boolean),
        following: r.get('following').filter(f => f.id),
      };
    }, () => sampleGraphService.getContributorById(id), 'contributors:detail');
  }
}

module.exports = new ContributorService();
