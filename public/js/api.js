/**
 * SentinelGraph AI API Client
 * Keeps the dashboard connected to the live Express/CognoDB backend.
 */

const API = {
  base: '',

  async request(path, options = {}) {
    const res = await fetch(this.base + path, options);
    const payload = await res.json().catch(() => null);

    if (!res.ok) {
      const message = payload?.message || payload?.error || `HTTP ${res.status}`;
      throw new Error(message);
    }

    return payload;
  },

  get(path) {
    return this.request(path);
  },

  post(path, data) {
    return this.request(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {}),
    });
  },

  // Graph
  graphStats:        () => API.get('/api/graph/stats'),
  graphOverview:     () => API.get('/api/graph/overview'),
  contextBrief:      () => API.get('/api/insights/context-brief'),
  contextRoute:      () => API.get('/api/insights/context-route'),

  // Entities
  contributors:    () => API.get('/api/contributors'),
  contributor:     (id) => API.get(`/api/contributors/${id}`),
  projects:        () => API.get('/api/projects'),
  project:         (id) => API.get(`/api/projects/${id}`),
  organizations:   () => API.get('/api/organizations'),
  organization:    (id) => API.get(`/api/organizations/${id}`),

  // Queries
  collaborationNetwork: (id) => API.get(`/api/queries/collaboration-network/${id}`),
  supplyChainRisk:      ()  => API.get('/api/queries/supply-chain-risk'),
  dependencyChain:      (id) => API.get(`/api/queries/dependency-chain/${id}`),
  shortestPath:         (from, to) => API.get(`/api/queries/shortest-path?from=${from}&to=${to}`),
  gdsInfluence:         () => API.get('/api/queries/gds-influence'),
  auditLogs:            () => API.get('/api/admin/audit'),

  // Health
  health: () => API.get('/api/health'),

  // Auth / ReBAC
  authAssets: () => API.get('/api/auth/assets'),
  checkAccess: (user, asset, passport) => {
    let url = `/api/auth/check-access?contributorId=${user}&assetId=${asset}`;
    if (passport) url += `&passport=${encodeURIComponent(passport)}`;
    return API.get(url);
  },

  // Agent OS & Ephemeral Passports
  agentList:      () => API.get('/api/agent/list'),
  mintPassport:   (data) => API.post('/api/agent/passport/mint', data),
  verifyPassport: (token) => API.post('/api/agent/passport/verify', { token }),
  simulateRag:    (data) => API.post('/api/agent/simulate-rag', data),

  // OpenFGA / Google Zanzibar
  openFgaTuples: () => API.get('/api/bridge/openfga/tuples'),
  openFgaCheck:  (data) => API.post('/api/bridge/openfga/check', data),
};
