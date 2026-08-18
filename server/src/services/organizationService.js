const { executeRead } = require('../config/db');
const { parseNeo4jNumber, parseNodeProperties } = require('../utils/neo4jUtils');
const logger = require('../utils/logger');
const sampleGraphService = require('./sampleGraphService');
const { withSampleDataFallback } = require('../utils/resilientFallback');

class OrganizationService {
  async getAllOrganizations() {
    return withSampleDataFallback(async () => {
      const cypher = `
        MATCH (o:Organization)
        OPTIONAL MATCH (c:Contributor)-[:WORKS_AT]->(o)
        OPTIONAL MATCH (o)-[:SPONSORS]->(p:Project)
        OPTIONAL MATCH (proj:Project)-[:PART_OF]->(o)
        RETURN o,
               count(DISTINCT c) AS employeeCount,
               count(DISTINCT p) AS sponsoredCount,
               count(DISTINCT proj) AS ownedCount
        ORDER BY o.name
      `;
      const result = await executeRead(cypher);

      return result.records.map(r => ({
        ...parseNodeProperties(r.get('o')),
        employeeCount: parseNeo4jNumber(r.get('employeeCount')),
        sponsoredCount: parseNeo4jNumber(r.get('sponsoredCount')),
        ownedCount: parseNeo4jNumber(r.get('ownedCount')),
      }));
    }, () => sampleGraphService.getAllOrganizations(), 'organizations:list');
  }

  async getOrganizationById(id) {
    return withSampleDataFallback(async () => {
      const cypher = `
        MATCH (o:Organization {id: $id})
        OPTIONAL MATCH (c:Contributor)-[wa:WORKS_AT]->(o)
        OPTIONAL MATCH (o)-[sp:SPONSORS]->(sponsored:Project)
        OPTIONAL MATCH (owned:Project)-[:PART_OF]->(o)
        RETURN o,
               collect(DISTINCT {contributor: c, since: wa.since, role: wa.role}) AS employees,
               collect(DISTINCT {project: sponsored, amount: sp.amount, since: sp.since}) AS sponsoring,
               collect(DISTINCT owned) AS ownedProjects
      `;
      const result = await executeRead(cypher, { id });
      if (!result.records.length) return null;

      const r = result.records[0];
      const o = parseNodeProperties(r.get('o'));

      return {
        ...o,
        employees: r.get('employees').filter(x => x.contributor).map(x => ({
          ...parseNodeProperties(x.contributor),
          since: parseNeo4jNumber(x.since),
          role: x.role,
        })),
        sponsoring: r.get('sponsoring').filter(x => x.project).map(x => ({
          ...parseNodeProperties(x.project),
          amount: parseNeo4jNumber(x.amount),
          since: parseNeo4jNumber(x.since),
        })),
        ownedProjects: r.get('ownedProjects').filter(Boolean).map(parseNodeProperties),
      };
    }, () => sampleGraphService.getOrganizationById(id), 'organizations:detail');
  }
}

module.exports = new OrganizationService();
