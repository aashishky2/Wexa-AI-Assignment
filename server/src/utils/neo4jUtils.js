/**
 * Utilities for parsing Neo4j records and types
 */

function parseNeo4jNumber(val) {
  if (val == null) return null;
  if (typeof val.toNumber === 'function') {
    try {
      return val.toNumber();
    } catch {
      return val.toString();
    }
  }
  return val;
}

function parseNodeProperties(node) {
  if (!node || !node.properties) return node;
  const props = { ...node.properties };
  for (const key in props) {
    props[key] = parseNeo4jNumber(props[key]);
  }
  return props;
}

module.exports = {
  parseNeo4jNumber,
  parseNodeProperties
};
