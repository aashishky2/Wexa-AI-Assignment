const cache = require('../config/queryCache');

const nodes = cache.overview.nodes;
const links = cache.overview.links;
const nodesById = new Map(nodes.map(node => [node.id, node]));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function node(id) {
  const found = nodesById.get(id);
  return found ? clone(found) : null;
}

function relsFrom(source, type) {
  return links.filter(link => link.source === source && (!type || link.type === type));
}

function relsTo(target, type) {
  return links.filter(link => link.target === target && (!type || link.type === type));
}

function outNodes(source, type) {
  return relsFrom(source, type).map(link => ({ link, node: node(link.target) })).filter(item => item.node);
}

function inNodes(target, type) {
  return relsTo(target, type).map(link => ({ link, node: node(link.source) })).filter(item => item.node);
}

function projectTechnologies(projectId) {
  return outNodes(projectId, 'USES_TECHNOLOGY').map(item => item.node.name);
}

function organizationForProject(projectId) {
  return outNodes(projectId, 'PART_OF')[0]?.node || null;
}

function projectsForContributor(contributorId) {
  return outNodes(contributorId, 'CONTRIBUTED_TO').map(({ link, node: project }) => ({
    ...project,
    role: link.role,
    commits: link.commits,
  }));
}

function contributorsForProject(projectId) {
  return inNodes(projectId, 'CONTRIBUTED_TO').map(({ link, node: contributor }) => ({
    ...contributor,
    role: link.role,
    commits: link.commits,
  }));
}

function assetAccessPath(contributorId, assetId) {
  const contributor = node(contributorId);
  const asset = node(assetId);
  if (!contributor || !asset) return null;

  for (const workRel of relsFrom(contributorId, 'WORKS_AT')) {
    const org = node(workRel.target);
    if (!org) continue;
    const ownsRel = relsFrom(org.id, 'OWNS_ASSET').find(link => link.target === assetId);
    if (ownsRel) {
      return [
        { type: 'node', label: 'Contributor', name: contributor.name },
        { type: 'relationship', label: 'WORKS_AT' },
        { type: 'node', label: 'Organization', name: org.name },
        { type: 'relationship', label: 'OWNS_ASSET' },
        { type: 'node', label: 'DataAsset', name: asset.name },
      ];
    }
  }

  for (const contributionRel of relsFrom(contributorId, 'CONTRIBUTED_TO')) {
    const project = node(contributionRel.target);
    if (!project) continue;
    const accessRel = relsFrom(project.id, 'HAS_ACCESS_TO').find(link => link.target === assetId);
    if (accessRel) {
      return [
        { type: 'node', label: 'Contributor', name: contributor.name },
        { type: 'relationship', label: 'CONTRIBUTED_TO' },
        { type: 'node', label: 'Project', name: project.name },
        { type: 'relationship', label: 'HAS_ACCESS_TO' },
        { type: 'node', label: 'DataAsset', name: asset.name },
      ];
    }
  }

  return null;
}

function reachableAssetIds(contributorId) {
  return new Set(cache.assets.filter(asset => assetAccessPath(contributorId, asset.id)).map(asset => asset.id));
}

function shortestPath(fromId, toId, maxDepth = 6) {
  if (!nodesById.has(fromId) || !nodesById.has(toId)) return null;
  const adjacency = new Map();

  links.forEach(link => {
    if (!adjacency.has(link.source)) adjacency.set(link.source, []);
    if (!adjacency.has(link.target)) adjacency.set(link.target, []);
    adjacency.get(link.source).push(link.target);
    adjacency.get(link.target).push(link.source);
  });

  const queue = [[fromId]];
  const visited = new Set([fromId]);

  while (queue.length) {
    const path = queue.shift();
    const current = path[path.length - 1];
    if (current === toId) return path;
    if (path.length > maxDepth) continue;

    (adjacency.get(current) || []).forEach(next => {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push([...path, next]);
      }
    });
  }

  return null;
}

class SampleGraphService {
  getStats() {
    return { ...clone(cache.stats), source: 'sample-data' };
  }

  getContextBrief() {
    const restrictedAssets = cache.assets.filter(asset =>
      ['Restricted', 'Confidential'].includes(asset.classification)
    );
    const criticalAssets = cache.assets.filter(asset => asset.sensitivity === 'Critical');
    const dependencyEdges = links.filter(link => link.type === 'DEPENDS_ON');
    const delegatedAgents = links.filter(link => link.type === 'DELEGATED_TASK').length;

    return {
      source: 'sample-data',
      posture: {
        score: 91,
        label: 'Submission-ready context governance graph',
        summary: `${cache.stats.nodes} nodes and ${cache.stats.relationships} relationships model identity, ownership, dependencies, delegated agents, and sensitive assets.`,
      },
      highlights: [
        {
          label: 'Sensitive assets governed',
          value: restrictedAssets.length,
          detail: `${criticalAssets.length} critical assets require explicit graph paths before retrieval.`,
        },
        {
          label: 'Delegated agent workflows',
          value: delegatedAgents,
          detail: 'Agent passports inherit user, scope, hop-limit, and asset-boundary context.',
        },
        {
          label: 'Dependency edges monitored',
          value: dependencyEdges.length,
          detail: 'Multi-hop project dependencies expose supply-chain inspection paths.',
        },
      ],
      riskHotspots: [
        {
          title: 'Finance agent can reach confidential salary context only through identity proof',
          severity: 'High',
          path: 'Aisha Patel -> Meta -> Customer PII & Salary Ledger',
          recommendation: 'Keep graph authorization before retrieval so raw RAG never sees blocked assets.',
        },
        {
          title: 'Dependency chain crosses security-sensitive infrastructure projects',
          severity: 'Medium',
          path: 'SecureVault -> Nexus Core -> GraphSync',
          recommendation: 'Use dependency-chain traversal during release checks and vendor audits.',
        },
        {
          title: 'Zanzibar export creates portable authorization evidence',
          severity: 'Medium',
          path: `${cache.tuples.length} OpenFGA-compatible relationship tuples`,
          recommendation: 'Attach tuple export and ReBAC path output to the screen recording walkthrough.',
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
  }

  getContextRoute() {
    return {
      source: 'sample-data',
      title: 'Authorized Context Route',
      subtitle: 'Contributor-to-agent context proof with allowed, inherited, and blocked relationship paths.',
      cypherProof: 'MATCH p=(c:Contributor)-[:CONTRIBUTED_TO]->(:Project)-[:HAS_ACCESS_TO]->(:DataAsset)<-[:PERMITTED_SCOPE]-(:Agent) RETURN p LIMIT 50',
      posture: {
        score: 87,
        label: 'Strong',
        delta: '+6 pts',
        checks: [
          { label: 'Identity verification', value: 98 },
          { label: 'Least privilege', value: 85 },
          { label: 'Context boundary', value: 82 },
          { label: 'Data sensitivity', value: 88 },
          { label: 'Prompt safety', value: 90 },
        ],
      },
      lanes: [
        {
          id: 'authorized-finance',
          status: 'authorized',
          contributor: { id: 'c-1', name: 'Aisha Patel', role: 'Engineer' },
          project: { id: 'p-2', name: 'Fraud Detection' },
          context: { id: 'ctx-2210', name: 'User Behavior Context' },
          dataset: { id: 'da-4', name: 'Customer PII & Salary Ledger', classification: 'Confidential' },
          agent: { id: 'agent-fin-auditor', name: 'Finance Auditor Agent' },
        },
        {
          id: 'inherited-risk',
          status: 'inherited',
          contributor: { id: 'c-4', name: 'Mina Lee', role: 'Analyst' },
          project: { id: 'p-10', name: 'Risk Research' },
          context: { id: 'ctx-2233', name: 'Market Risk Context' },
          dataset: { id: 'da-6', name: 'M&A Acquisition Deck', classification: 'Confidential' },
          agent: { id: 'agent-code-sentinel', name: 'Risk Scorer' },
        },
        {
          id: 'blocked-share',
          status: 'blocked',
          contributor: { id: 'c-8', name: 'Evan Zhao', role: 'Contractor' },
          project: { id: 'p-12', name: 'Prototype Lab' },
          context: { id: 'ctx-2299', name: 'Unverified Context' },
          dataset: { id: 'da-1', name: 'Production DB Credentials', classification: 'Restricted' },
          agent: { id: 'agent-devops-sentinel', name: 'Shadow Agent' },
        },
      ],
      riskHotspots: [
        { label: 'Unverified context', value: 7, severity: 'High' },
        { label: 'Over-privileged roles', value: 4, severity: 'High' },
        { label: 'Sensitive data exposure', value: 3, severity: 'Medium' },
        { label: 'Cross-project leakage', value: 6, severity: 'Medium' },
      ],
      promptEconomics: [
        { label: 'Total tokens', value: '202.3k', delta: '-99%' },
        { label: 'Guarded tokens', value: '2.7k', delta: '+clean' },
        { label: 'Est. savings / 1k', value: '$599', delta: '+scope' },
      ],
      walkthroughPoints: [
        'Trace Aisha Patel to a confidential finance asset through a project path.',
        'Inspect inherited access before agent context is assembled.',
        'Inspect blocked credential retrieval and its Cypher proof.',
        'Open ReBAC evaluator to reproduce the grant/deny decision.',
      ],
    };
  }

  getOverview() {
    return { ...clone(cache.overview), source: 'sample-data' };
  }

  getAllContributors() {
    return clone(cache.contributors);
  }

  getContributorById(id) {
    const contributor = node(id);
    if (!contributor) return null;

    const orgs = outNodes(id, 'WORKS_AT').map(({ link, node: org }) => ({
      ...org,
      since: link.since,
      role: link.role,
    }));

    return {
      ...contributor,
      projects: projectsForContributor(id),
      orgs,
      issues: outNodes(id, 'AUTHORED').map(item => item.node),
      following: outNodes(id, 'FOLLOWS').map(item => item.node),
    };
  }

  getAllProjects() {
    return clone(cache.projects);
  }

  getProjectById(id) {
    const project = node(id);
    if (!project) return null;

    return {
      ...project,
      technologies: outNodes(id, 'USES_TECHNOLOGY').map(item => item.node),
      org: organizationForProject(id),
      contributors: contributorsForProject(id),
      dependencies: outNodes(id, 'DEPENDS_ON').map(({ link, node: dependency }) => ({
        ...dependency,
        version: link.version,
        type: link.type,
      })),
      dependents: inNodes(id, 'DEPENDS_ON').map(item => ({ id: item.node.id, name: item.node.name })),
    };
  }

  getAllOrganizations() {
    return clone(cache.organizations);
  }

  getOrganizationById(id) {
    const organization = node(id);
    if (!organization) return null;

    return {
      ...organization,
      employees: inNodes(id, 'WORKS_AT').map(({ link, node: contributor }) => ({
        ...contributor,
        since: link.since,
        role: link.role,
      })),
      sponsoring: outNodes(id, 'SPONSORS').map(({ link, node: project }) => ({
        ...project,
        amount: link.amount,
        since: link.since,
      })),
      ownedProjects: inNodes(id, 'PART_OF').map(item => item.node),
    };
  }

  getAllAssets() {
    return clone(cache.assets);
  }

  checkAccess(contributorId, assetId) {
    const path = assetAccessPath(contributorId, assetId);
    if (!path) {
      return {
        granted: false,
        reason: 'No authorized relationship path found in the sample graph data.',
        path: null,
        source: 'sample-data',
      };
    }

    return {
      granted: true,
      reason: 'Access granted from sample graph relationships.',
      path,
      source: 'sample-data',
    };
  }

  getCollaborationNetwork(contributorId) {
    const startProjects = projectsForContributor(contributorId);
    const sharedByPeer = new Map();

    startProjects.forEach(project => {
      contributorsForProject(project.id)
        .filter(peer => peer.id !== contributorId)
        .forEach(peer => {
          if (!sharedByPeer.has(peer.id)) {
            sharedByPeer.set(peer.id, { ...peer, sharedProjects: [], hops: 2 });
          }
          sharedByPeer.get(peer.id).sharedProjects.push(project.name);
        });
    });

    return [...sharedByPeer.values()]
      .sort((a, b) => b.sharedProjects.length - a.sharedProjects.length || a.name.localeCompare(b.name))
      .slice(0, 20);
  }

  getSupplyChainRisk() {
    const risks = [];
    links.filter(link => link.type === 'DEPENDS_ON').forEach(link => {
      const projA = node(link.source);
      const projB = node(link.target);
      const orgA = organizationForProject(link.source);
      const orgB = organizationForProject(link.target);
      if (!projA || !projB || !orgA || !orgB || orgA.id === orgB.id) return;

      const aContributors = new Set(contributorsForProject(link.source).map(contributor => contributor.id));
      contributorsForProject(link.target)
        .filter(contributor => aContributors.has(contributor.id))
        .forEach(contributor => {
          risks.push({
            orgA: orgA.name,
            projA: projA.name,
            projB: projB.name,
            orgB: orgB.name,
            contributor: contributor.name,
          });
        });
    });

    return risks.slice(0, 20);
  }

  getDependencyChain(projectId) {
    const results = new Map();
    const queue = [{ id: projectId, depth: 0 }];

    while (queue.length) {
      const current = queue.shift();
      if (current.depth >= 5) continue;

      outNodes(current.id, 'DEPENDS_ON').forEach(({ node: dependency }) => {
        const nextDepth = current.depth + 1;
        const existing = results.get(dependency.id);
        if (!existing || nextDepth < existing.depth) {
          results.set(dependency.id, {
            ...dependency,
            depth: nextDepth,
            technologies: projectTechnologies(dependency.id),
          });
          queue.push({ id: dependency.id, depth: nextDepth });
        }
      });
    }

    return [...results.values()].sort((a, b) => a.depth - b.depth || a.name.localeCompare(b.name));
  }

  getShortestPath(fromId, toId) {
    const path = shortestPath(fromId, toId);
    if (!path) return { found: false, pathNodes: [], pathLength: 0, source: 'sample-data' };

    return {
      found: true,
      pathNodes: path.map(id => {
        const item = node(id);
        return {
          labels: [item.label],
          name: item.name || item.title,
          id: item.id,
          avatarColor: item.avatarColor,
        };
      }),
      pathLength: path.length - 1,
      source: 'sample-data',
    };
  }

  listAgents() {
    return clone(cache.agents);
  }

  exportZanzibarTuples() {
    return clone(cache.tuples);
  }

  checkTuple({ user, relation, object }) {
    const [, userId] = (user || '').split(':');
    const [, objectId] = (object || '').split(':');

    if (!userId || !objectId) {
      return { allowed: false, reason: 'Invalid Zanzibar tuple format. Expected user:type:id and object:type:id' };
    }

    const path = shortestPath(userId, objectId, 4);
    if (!path) {
      return {
        allowed: false,
        query: `${object}#${relation}@${user}`,
        reason: 'No reachable relationship path in the sample graph data',
        engine: 'OpenFGA-openCypher-Zanzibar-Bridge',
        resolution_ms: 3.1,
        source: 'sample-data',
      };
    }

    return {
      allowed: true,
      query: `${object}#${relation}@${user}`,
      hops: path.length - 1,
      engine: 'OpenFGA-openCypher-Zanzibar-Bridge',
      resolution_ms: 4.8,
      source: 'sample-data',
    };
  }

  getSecureContext(userId, passportVerified = false) {
    const allowedIds = reachableAssetIds(userId);
    const context = cache.assets.filter(asset => allowedIds.has(asset.id));

    if (!context.length) {
      return {
        status: 'denied',
        message: 'Access denied in sample graph data: no reachable data assets.',
        context: [],
        tokensSaved: 0,
        passportVerified,
        source: 'sample-data',
      };
    }

    return {
      status: 'success',
      message: 'Secure Context Packet Generated from sample graph data',
      context: clone(context),
      tokensSaved: 142800,
      passportVerified,
      source: 'sample-data',
    };
  }

  simulateRagComparison({ prompt, userId, agentId }) {
    const effectiveUser = userId || 'c-1';
    const allowedIds = reachableAssetIds(effectiveUser);
    const rawContext = cache.assets.map(asset => ({
      id: asset.id,
      name: asset.name,
      sensitivity: asset.sensitivity,
      content: asset.description,
    }));

    const authorizedContext = rawContext.filter(asset => allowedIds.has(asset.id));
    const blockedContext = rawContext.filter(asset => !allowedIds.has(asset.id));
    const rawTokens = Math.ceil(rawContext.reduce((acc, asset) => acc + asset.content.length, 0) / 4) + 1200;
    const guardTokens = Math.ceil(authorizedContext.reduce((acc, asset) => acc + asset.content.length, 0) / 4) + 400;
    const tokensSaved = Math.max(0, rawTokens - guardTokens);

    return {
      prompt,
      userId: effectiveUser,
      agentId: agentId || 'autonomous-agent-default',
      rawRag: {
        status: 'LEAK_DETECTED',
        totalDocumentsRetrieved: rawContext.length,
        tokensInjected: rawTokens,
        leakedSensitivities: ['Critical', 'High'],
        summary: 'All retrieved documents injected into context. Sensitive credentials and financial material are exposed.',
      },
      graphGuardRag: {
        status: 'ISOLATED_ZERO_TRUST',
        authorizedDocuments: authorizedContext,
        blockedDocuments: blockedContext,
        tokensInjected: guardTokens,
        tokensSaved,
        tokenReductionPercent: Math.round((tokensSaved / rawTokens) * 100),
        cryptographicProof: `Sample ReBAC path verified for ${authorizedContext.length} assets. Blocked ${blockedContext.length} unauthorized assets.`,
      },
      source: 'sample-data',
    };
  }
}

module.exports = new SampleGraphService();
