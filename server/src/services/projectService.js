const { executeRead } = require('../config/db');
const { parseNeo4jNumber, parseNodeProperties } = require('../utils/neo4jUtils');
const logger = require('../utils/logger');
const sampleGraphService = require('./sampleGraphService');
const { withSampleDataFallback } = require('../utils/resilientFallback');

class ProjectService {
  async getAllProjects() {
    return withSampleDataFallback(async () => {
      const cypher = `
        MATCH (p:Project)
        OPTIONAL MATCH (p)-[:USES_TECHNOLOGY]->(t:Technology)
        OPTIONAL MATCH (p)-[:PART_OF]->(o:Organization)
        OPTIONAL MATCH (c:Contributor)-[:CONTRIBUTED_TO]->(p)
        RETURN p,
               collect(DISTINCT t.name) AS technologies,
               o.name AS org,
               count(DISTINCT c) AS contributorCount
        ORDER BY p.stars DESC
      `;
      const result = await executeRead(cypher);

      return result.records.map(r => {
        const p = parseNodeProperties(r.get('p'));
        return {
          ...p,
          technologies: r.get('technologies'),
          org: r.get('org'),
          contributorCount: parseNeo4jNumber(r.get('contributorCount')),
        };
      });
    }, () => sampleGraphService.getAllProjects(), 'projects:list');
  }

  async getProjectById(id) {
    return withSampleDataFallback(async () => {
      const cypher = `
        MATCH (p:Project {id: $id})
        OPTIONAL MATCH (p)-[:USES_TECHNOLOGY]->(t:Technology)
        OPTIONAL MATCH (p)-[:PART_OF]->(o:Organization)
        OPTIONAL MATCH (c:Contributor)-[ct:CONTRIBUTED_TO]->(p)
        OPTIONAL MATCH (p)-[dep:DEPENDS_ON]->(dep_p:Project)
        OPTIONAL MATCH (dep_in:Project)-[:DEPENDS_ON]->(p)
        RETURN p,
               collect(DISTINCT t) AS technologies,
               o AS org,
               collect(DISTINCT {contributor: c, role: ct.role, commits: ct.commits}) AS contributors,
               collect(DISTINCT {project: dep_p, version: dep.version, type: dep.type}) AS dependencies,
               collect(DISTINCT {id: dep_in.id, name: dep_in.name}) AS dependents
      `;
      const result = await executeRead(cypher, { id });
      if (!result.records.length) return null;

      const r = result.records[0];
      const p = parseNodeProperties(r.get('p'));

      return {
        ...p,
        technologies: r.get('technologies').filter(Boolean).map(parseNodeProperties),
        org: r.get('org') ? parseNodeProperties(r.get('org')) : null,
        contributors: r.get('contributors')
          .filter(x => x.contributor)
          .map(x => ({
            ...parseNodeProperties(x.contributor),
            role: x.role,
            commits: parseNeo4jNumber(x.commits),
          })),
        dependencies: r.get('dependencies')
          .filter(x => x.project)
          .map(x => ({
            ...parseNodeProperties(x.project),
            version: x.version,
            type: x.type,
          })),
        dependents: r.get('dependents').filter(x => x.id),
      };
    }, () => sampleGraphService.getProjectById(id), 'projects:detail');
  }
}

module.exports = new ProjectService();
