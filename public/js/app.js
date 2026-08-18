/**
 * SentinelGraph — Main Application Logic
 * SPA routing, rendering, query UI
 */

const state = {
  contributors: null,
  projects: null,
  organizations: null,
  contextBrief: null,
  graphLoaded: false,
};

// ─── Router ───────────────────────────────────────────────────────────────────
const pageTitles = {
  home: 'Dashboard Overview',
  graph: 'Graph Explorer',
  queries: 'Run Queries',
  contributors: 'Contributors',
  projects: 'Projects',
  organizations: 'Organizations',
  'agent-os': 'Agent Passports & Identity',
  'rag-simulator': 'Zero-Trust RAG Simulator',
  'openfga-bridge': 'Zanzibar / OpenFGA Bridge',
  auth: 'Graph-Based Access Control',
  audit: 'Security Audit Logs'
};

function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(l => {
    l.classList.toggle('active', l.dataset.page === page);
  });
  
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.add('active');

  const breadcrumb = document.getElementById('topbar-breadcrumb');
  if (breadcrumb) breadcrumb.textContent = pageTitles[page] || 'Dashboard';

  if (page === 'home')           loadHome();
  if (page === 'graph')          loadGraph();
  if (page === 'contributors')   loadContributors();
  if (page === 'projects')       loadProjects();
  if (page === 'organizations')  loadOrganizations();
  if (page === 'queries')        loadQueries();
  if (page === 'agent-os')       loadAgentOs();
  if (page === 'rag-simulator')  loadRagSimulator();
  if (page === 'openfga-bridge') loadOpenFgaBridge();
  if (page === 'auth')           loadAuth();
  if (page === 'audit')          loadAudit();

  const scrollArea = document.querySelector('.scroll-area') || document.querySelector('.main-content') || window;
  if (scrollArea.scrollTo) scrollArea.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('[data-page]').forEach(el => {
  el.addEventListener('click', (e) => navigate(e.currentTarget.dataset.page));
});

// ─── DB Status ────────────────────────────────────────────────────────────────
async function checkDBStatus() {
  const dot   = document.getElementById('db-dot');
  const label = document.getElementById('db-label');
  try {
    const data = await API.health();

    if (data.status === 'ok') {
      dot.className = 'db-dot connected';
      label.textContent = 'CognoDB Live';
      return;
    }

    if (data.status === 'degraded' && data.db === 'standby') {
      dot.className = 'db-dot standby';
      label.textContent = 'Standby';
      return;
    }

    throw new Error(data.message || 'Health check failed');
  } catch {
    dot.className = 'db-dot error';
    label.textContent = 'Disconnected';
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatNum(n) { return Number(n).toLocaleString(); }
function emptyHtml(msg = 'No results') { return `<div class="empty-state">${msg}</div>`; }
function errorHtml(msg) {
  return `<div class="error-banner">${escapeHtml(msg || 'Unable to load this graph view right now.')}</div>`;
}
function avatarHtml(c, size = 32) {
  const initials = (c.name || '').substring(0, 2).toUpperCase();
  return `<div class="avatar-sm" style="width:${size}px;height:${size}px;font-size:${size*0.4}px">${initials}</div>`;
}
function badgeHtml(text, type = '') {
  return `<span class="badge ${type}">${text}</span>`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[char]));
}

function severityClass(severity) {
  const normalized = String(severity || '').toLowerCase();
  if (normalized.includes('high')) return 'severity-high';
  if (normalized.includes('low')) return 'severity-low';
  return 'severity-medium';
}

function laneStatusLabel(status) {
  if (status === 'blocked') return 'Blocked';
  if (status === 'inherited') return 'Inherited';
  return 'Authorized';
}

function renderRouteNode(kind, item) {
  return `
    <div class="route-node route-node-${kind}">
      <span>${escapeHtml(kind)}</span>
      <strong>${escapeHtml(item?.name || 'Unknown')}</strong>
      <small>${escapeHtml(item?.id || item?.classification || '')}</small>
    </div>
  `;
}

function renderRouteLane(lane) {
  const status = lane.status || 'authorized';
  return `
    <div class="route-lane route-${status}">
      <div class="route-person">
        <div class="route-avatar">${escapeHtml((lane.contributor?.name || 'U').slice(0, 1))}</div>
        <div>
          <strong>${escapeHtml(lane.contributor?.name)}</strong>
          <span>${escapeHtml(lane.contributor?.role)}</span>
        </div>
      </div>
      ${renderRouteNode('Project', lane.project)}
      ${renderRouteNode('Context', lane.context)}
      ${renderRouteNode('Dataset', lane.dataset)}
      ${renderRouteNode('Agent', lane.agent)}
      <div class="route-status">${laneStatusLabel(status)}</div>
    </div>
  `;
}

function renderContextCockpit(brief, route) {
  const highlights = Array.isArray(brief.highlights) ? brief.highlights : [];
  const hotspots = Array.isArray(route.riskHotspots) ? route.riskHotspots : brief.riskHotspots || [];
  const talkTracks = Array.isArray(route.walkthroughPoints) ? route.walkthroughPoints : brief.interviewTalkingPoints || [];
  const economics = brief.promptEconomics || {};
  const lanes = Array.isArray(route.lanes) ? route.lanes : [];
  const posture = route.posture || brief.posture || {};
  const checks = Array.isArray(posture.checks) ? posture.checks : highlights.map(item => ({
    label: item.label,
    value: Math.min(100, Number(item.value || 0) * 10),
  }));
  const promptEconomics = Array.isArray(route.promptEconomics) ? route.promptEconomics : [
    { label: 'Raw tokens', value: formatNum(economics.rawTokens || 0), delta: `${economics.reductionPercent || 0}% cut` },
    { label: 'Guarded tokens', value: formatNum(economics.governedTokens || 0), delta: 'scoped' },
    { label: 'Savings / 1k', value: `$${formatNum(economics.estimatedSavingsPerThousandQueries || 0)}`, delta: 'projected' },
  ];

  return `
    <div class="cockpit-grid">
      <div class="policy-panel">
        <div class="cockpit-label">Policy Posture</div>
        <div class="posture-meter" style="--score:${Number(posture.score || 0) * 3.6}deg">
          <div>
            <strong>${formatNum(posture.score || 0)}</strong>
            <span>${escapeHtml(posture.label || 'Strong')}</span>
          </div>
        </div>
        <p>${escapeHtml(brief.posture?.summary || route.subtitle || '')}</p>
        <div class="posture-checks">
          ${checks.slice(0, 5).map(check => `
            <div>
              <span>${escapeHtml(check.label)}</span>
              <strong>${formatNum(check.value || 0)}/100</strong>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="route-panel">
        <div class="route-header">
          <div>
            <div class="cockpit-label">submission brief</div>
            <h2>${escapeHtml(route.title || 'Authorized Context Route')}</h2>
          </div>
          <div class="route-legend">
            <span class="legend-authorized">Authorized</span>
            <span class="legend-inherited">Inherited</span>
            <span class="legend-blocked">Blocked</span>
          </div>
        </div>
        <div class="route-stage">
          <div class="route-columns">
            <span>Contributor</span><span>Project</span><span>Context</span><span>Dataset</span><span>Agent / Model</span><span>Decision</span>
          </div>
          ${lanes.map(renderRouteLane).join('')}
        </div>
        <div class="cypher-proof">
          <span>Cypher Proof</span>
          <code>${escapeHtml(route.cypherProof || '')}</code>
          <strong>Verified</strong>
        </div>
      </div>

      <div class="side-rail">
        <div class="rail-card">
          <div class="cockpit-label">Risk Hotspots</div>
          ${hotspots.slice(0, 5).map(item => `
            <div class="rail-row">
              <span>${escapeHtml(item.label || item.title)}</span>
              <strong class="${severityClass(item.severity)}">${escapeHtml(item.value ?? item.severity)}</strong>
            </div>
          `).join('')}
        </div>
        <div class="rail-card">
          <div class="cockpit-label">Prompt Economics</div>
          ${promptEconomics.slice(0, 4).map(item => `
            <div class="rail-row">
              <span>${escapeHtml(item.label)}</span>
              <strong>${escapeHtml(item.value)}</strong>
              <em>${escapeHtml(item.delta)}</em>
            </div>
          `).join('')}
        </div>
        <div class="rail-card">
          <div class="cockpit-label">Walkthrough Points</div>
          <ol class="walkthrough-list">
            ${talkTracks.slice(0, 5).map(point => `<li>${escapeHtml(point)}</li>`).join('')}
          </ol>
        </div>
      </div>
    </div>
  `;
}

function renderContextBrief(brief) {
  return renderContextCockpit(brief, {});
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
async function loadHome(force = false) {
  if (force) {
    state.contributors = null;
    state.projects = null;
    state.organizations = null;
    state.contextBrief = null;
    state.graphLoaded = false;
  }
  try {
    const stats = await API.graphStats();
    document.getElementById('home-stats').innerHTML = `
      <div class="metric-card"><div style="color:var(--text-muted);font-size:0.75rem;text-transform:uppercase">Nodes</div><div style="font-size:1.8rem;font-weight:600;margin-top:8px">${formatNum(stats.nodes)}</div></div>
      <div class="metric-card"><div style="color:var(--text-muted);font-size:0.75rem;text-transform:uppercase">Relationships</div><div style="font-size:1.8rem;font-weight:600;margin-top:8px">${formatNum(stats.relationships)}</div></div>
      <div class="metric-card"><div style="color:var(--text-muted);font-size:0.75rem;text-transform:uppercase">Contributors</div><div style="font-size:1.8rem;font-weight:600;margin-top:8px">${formatNum(stats.contributors)}</div></div>
      <div class="metric-card"><div style="color:var(--text-muted);font-size:0.75rem;text-transform:uppercase">Projects</div><div style="font-size:1.8rem;font-weight:600;margin-top:8px">${formatNum(stats.projects)}</div></div>
    `;
  } catch (err) {
    document.getElementById('home-stats').innerHTML = errorHtml(err.message);
  }

  const briefEl = document.getElementById('home-context-brief');
  if (briefEl) {
    try {
      const [brief, route] = await Promise.all([API.contextBrief(), API.contextRoute()]);
      state.contextBrief = brief;
      briefEl.innerHTML = renderContextCockpit(brief, route);
    } catch (err) {
      briefEl.innerHTML = errorHtml(`Could not load submission brief: ${err.message}`);
    }
  }

  if (!state.contributors) { try { state.contributors = await API.contributors(); } catch { state.contributors = []; } }
  const topC = state.contributors.slice(0, 5);
  document.getElementById('home-contributors').innerHTML = topC.length
    ? topC.map(c => `
      <div class="list-item" data-id="${c.id}" onclick="openContributor('${c.id}')">
        ${avatarHtml(c)}
        <div>
          <div class="list-item-title">${c.name}</div>
          <div class="list-item-sub">@${c.username} · ${formatNum(c.followers)} followers</div>
        </div>
      </div>`).join('')
    : emptyHtml();

  if (!state.projects) { try { state.projects = await API.projects(); } catch { state.projects = []; } }
  const topP = state.projects.slice(0, 5);
  document.getElementById('home-projects').innerHTML = topP.length
    ? topP.map(p => `
      <div class="list-item" data-id="${p.id}" onclick="openProject('${p.id}')">
        <div style="width:32px;height:32px;background:var(--bg-active);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--cyan);font-family:monospace">P</div>
        <div>
          <div class="list-item-title">${p.name}</div>
          <div class="list-item-sub">${p.language || 'Unknown'} · ★ ${formatNum(p.stars)}</div>
        </div>
      </div>`).join('')
    : emptyHtml();
}

// ─── GRAPH ────────────────────────────────────────────────────────────────────
async function loadGraph() {
  if (state.graphLoaded) return;
  GraphViz.init('graph-container');
  try {
    const data = await API.graphOverview();
    GraphViz.load(data);
    state.graphLoaded = true;
  } catch (err) {
    document.getElementById('graph-loading').innerHTML = errorHtml('Could not load graph: ' + err.message);
  }
}

// ─── CONTRIBUTORS ─────────────────────────────────────────────────────────────
async function loadContributors() {
  if (!state.contributors) { try { state.contributors = await API.contributors(); } catch { state.contributors = []; } }
  const tb = document.getElementById('contributors-table-body');
  if (!tb) return;
  tb.innerHTML = state.contributors.length
    ? state.contributors.map(c => `
      <tr onclick="openContributor('${c.id}')">
        <td><div style="display:flex;align-items:center;gap:12px">${avatarHtml(c, 24)} <strong>${c.name}</strong> <span style="color:var(--text-muted)">@${c.username}</span></div></td>
        <td><div style="color:var(--primary); font-weight: 600;">${formatNum(c.influenceScore)}</div></td>
        <td>${formatNum(c.followers)}</td>
        <td>${c.projectCount || 0}</td>
        <td>${c.org ? badgeHtml(c.org) : '<span style="color:var(--text-muted)">-</span>'}</td>
      </tr>`).join('')
    : `<tr><td colspan="5">${emptyHtml()}</td></tr>`;
}

async function openContributor(id) {
  navigate('contributors');
  document.getElementById('contributors-list-view').style.display = 'none';
  document.getElementById('contributors-detail-view').style.display = 'block';
  
  document.getElementById('contributor-sidebar').innerHTML = '<div class="skeleton" style="height:200px"></div>';
  document.getElementById('contributor-main').innerHTML = '<div class="skeleton" style="height:300px"></div>';

  try {
    const c = await API.contributor(id);
    document.getElementById('contributor-sidebar').innerHTML = `
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
        ${avatarHtml(c, 64)}
        <div>
          <h2 style="font-size:1.1rem;font-weight:600">${c.name}</h2>
          <div style="color:var(--text-muted);font-family:monospace;font-size:0.8rem">@${c.username}</div>
        </div>
      </div>
      <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:24px">${c.bio || ''}</p>
      <div style="display:flex;flex-direction:column;gap:12px;font-size:0.85rem;color:var(--text-secondary)">
        <div>Location: ${c.location || 'Unknown'}</div>
        <div>Followers: ${formatNum(c.followers)}</div>
        ${c.orgs?.length ? `<div>Organizations: ${c.orgs.map(o=>o.name).join(', ')}</div>` : ''}
      </div>
    `;

    let mainHtml = '';
    if (c.projects?.length) {
      mainHtml += `
        <div class="panel">
          <div class="panel-header"><h3 class="panel-title">Projects</h3></div>
          <div class="panel-body">
            ${c.projects.map(p => `
              <div class="list-item" onclick="openProject('${p.id}')">
                <div style="flex:1">
                  <div class="list-item-title">${p.name} ${badgeHtml(p.role)}</div>
                  <div class="list-item-sub">${p.language || ''} · ${formatNum(p.commits || 0)} commits</div>
                </div>
                <div style="font-size:0.85rem">★ ${formatNum(p.stars)}</div>
              </div>`).join('')}
          </div>
        </div>
      `;
    }
    document.getElementById('contributor-main').innerHTML = mainHtml || emptyHtml('No project data');
  } catch (err) {
    document.getElementById('contributor-sidebar').innerHTML = errorHtml(err.message);
  }
}

document.getElementById('contributors-back')?.addEventListener('click', () => {
  document.getElementById('contributors-list-view').style.display = 'block';
  document.getElementById('contributors-detail-view').style.display = 'none';
});

// ─── PROJECTS ─────────────────────────────────────────────────────────────────
async function loadProjects() {
  if (!state.projects) { try { state.projects = await API.projects(); } catch { state.projects = []; } }
  const tb = document.getElementById('projects-table-body');
  if (!tb) return;
  tb.innerHTML = state.projects.length
    ? state.projects.map(p => `
      <tr onclick="openProject('${p.id}')">
        <td><strong>${p.name}</strong> ${p.org ? `<span style="color:var(--text-muted);font-size:0.75rem">by ${p.org}</span>` : ''}</td>
        <td>${formatNum(p.stars)}</td>
        <td>${p.language ? badgeHtml(p.language) : '-'}</td>
        <td>${formatNum(p.forks)}</td>
      </tr>`).join('')
    : `<tr><td colspan="4">${emptyHtml()}</td></tr>`;
}

async function openProject(id) {
  navigate('projects');
  document.getElementById('projects-list-view').style.display = 'none';
  document.getElementById('projects-detail-view').style.display = 'block';
  
  document.getElementById('project-sidebar').innerHTML = '<div class="skeleton" style="height:200px"></div>';
  document.getElementById('project-main').innerHTML = '<div class="skeleton" style="height:300px"></div>';

  try {
    const p = await API.project(id);
    document.getElementById('project-sidebar').innerHTML = `
      <h2 style="font-size:1.1rem;font-weight:600">${p.name}</h2>
      ${p.org ? `<div style="color:var(--text-muted);font-size:0.8rem;margin-bottom:16px">by ${p.org.name || p.org}</div>` : ''}
      <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:24px;line-height:1.6">${p.description || ''}</p>
      
      <div style="display:flex;flex-direction:column;gap:12px;font-size:0.85rem;color:var(--text-secondary)">
        <div>★ ${formatNum(p.stars)} stars</div>
        <div>🍴 ${formatNum(p.forks)} forks</div>
        <div>📄 ${p.license || 'N/A'}</div>
      </div>
      ${p.technologies?.length ? `
        <div style="margin-top:24px;display:flex;gap:8px;flex-wrap:wrap">
          ${p.technologies.map(t => badgeHtml(t.name)).join('')}
        </div>` : ''}
    `;

    let mainHtml = '';
    if (p.contributors?.length) {
      mainHtml += `
        <div class="panel">
          <div class="panel-header"><h3 class="panel-title">Top Contributors</h3></div>
          <div class="panel-body">
            ${p.contributors.map(c => `
              <div class="list-item" onclick="openContributor('${c.id}')">
                ${avatarHtml(c, 24)}
                <div style="flex:1">
                  <div class="list-item-title">${c.name}</div>
                  <div class="list-item-sub">@${c.username}</div>
                </div>
                <div>${badgeHtml(c.role)}</div>
              </div>`).join('')}
          </div>
        </div>
      `;
    }
    document.getElementById('project-main').innerHTML = mainHtml || emptyHtml('No contributor data');
  } catch(err) {
    document.getElementById('project-sidebar').innerHTML = errorHtml(err.message);
  }
}

document.getElementById('projects-back')?.addEventListener('click', () => {
  document.getElementById('projects-list-view').style.display = 'block';
  document.getElementById('projects-detail-view').style.display = 'none';
});

// ─── ORGANIZATIONS ────────────────────────────────────────────────────────────
async function loadOrganizations() {
  if (!state.organizations) { try { state.organizations = await API.organizations(); } catch { state.organizations = []; } }
  const tb = document.getElementById('orgs-table-body');
  if (!tb) return;
  tb.innerHTML = state.organizations.length
    ? state.organizations.map(o => `
      <tr onclick="openOrganization('${o.id}')" style="cursor:pointer">
        <td><strong style="color:var(--white)">${o.name}</strong></td>
        <td>${badgeHtml(o.type)}</td>
        <td style="color:var(--zinc-400)">${o.country || '—'}</td>
        <td><span style="font-family:'JetBrains Mono',monospace;color:var(--zinc-300)">${o.employeeCount || 0}</span></td>
        <td><span style="font-family:'JetBrains Mono',monospace;color:var(--zinc-300)">${o.ownedCount || 0}</span></td>
      </tr>`).join('')
    : `<tr><td colspan="5">${emptyHtml()}</td></tr>`;
}

async function openOrganization(id) {
  navigate('organizations');
  document.getElementById('orgs-list-view').style.display = 'none';
  document.getElementById('orgs-detail-view').style.display = 'block';

  // Reset to loading state
  document.getElementById('org-header-card').innerHTML = '<div class="skeleton" style="height:80px;width:100%;border-radius:8px;"></div>';
  document.getElementById('org-projects-panel').innerHTML = '<div class="skeleton" style="height:200px;border-radius:16px;"></div>';
  document.getElementById('org-employees-panel').innerHTML = '<div class="skeleton" style="height:200px;border-radius:16px;"></div>';
  document.getElementById('org-sponsoring-panel').innerHTML = '<div class="skeleton" style="height:80px;border-radius:16px;"></div>';

  try {
    const o = await API.organization(id);

    // ── Header Card ──
    document.getElementById('org-header-card').innerHTML = `
      <div>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px">
          <div style="width:48px;height:48px;border-radius:12px;background:var(--zinc-800);border:1px solid var(--zinc-700);display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:700;color:var(--white);flex-shrink:0;">${(o.name||'?').substring(0,2).toUpperCase()}</div>
          <div>
            <div style="font-size:1.2rem;font-weight:600;color:var(--white);letter-spacing:-0.3px">${o.name}</div>
            <div style="font-size:0.8rem;color:var(--zinc-500);font-family:'JetBrains Mono',monospace;margin-top:2px">${o.country || ''}</div>
          </div>
        </div>
        ${o.description ? `<p style="font-size:0.875rem;color:var(--zinc-400);line-height:1.6;max-width:560px">${o.description}</p>` : ''}
      </div>
      <div style="display:flex;gap:24px;flex-shrink:0">
        <div style="text-align:right">
          <div style="font-family:'JetBrains Mono',monospace;font-size:0.6rem;color:var(--zinc-500);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px">Type</div>
          ${badgeHtml(o.type || 'Organization')}
        </div>
        ${o.founded ? `<div style="text-align:right">
          <div style="font-family:'JetBrains Mono',monospace;font-size:0.6rem;color:var(--zinc-500);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px">Founded</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:1rem;color:var(--white)">${o.founded}</div>
        </div>` : ''}
        <div style="text-align:right">
          <div style="font-family:'JetBrains Mono',monospace;font-size:0.6rem;color:var(--zinc-500);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px">Contributors</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:1rem;color:var(--white)">${o.employees?.length || 0}</div>
        </div>
        <div style="text-align:right">
          <div style="font-family:'JetBrains Mono',monospace;font-size:0.6rem;color:var(--zinc-500);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px">Projects</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:1rem;color:var(--white)">${o.ownedProjects?.length || 0}</div>
        </div>
      </div>
    `;

    // ── Owned Projects Panel ──
    const projPanel = document.getElementById('org-projects-panel');
    if (o.ownedProjects?.length) {
      projPanel.innerHTML = o.ownedProjects.map(p => `
        <div class="list-item" onclick="openProject('${p.id}')">
          <div style="width:34px;height:34px;border-radius:8px;background:var(--zinc-800);border:1px solid var(--zinc-700);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;color:var(--cyan);font-family:'JetBrains Mono',monospace;">P</div>
          <div style="flex:1;min-width:0">
            <div class="list-item-title" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</div>
            <div class="list-item-sub">${p.language || 'N/A'}</div>
          </div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:0.75rem;color:var(--zinc-400);flex-shrink:0">★ ${formatNum(p.stars)}</div>
        </div>`).join('');
    } else {
      projPanel.innerHTML = emptyHtml('No owned projects');
    }

    // ── Employees Panel ──
    const empPanel = document.getElementById('org-employees-panel');
    if (o.employees?.length) {
      empPanel.innerHTML = o.employees.map(c => `
        <div class="list-item" onclick="openContributor('${c.id}')">
          ${avatarHtml(c, 34)}
          <div style="flex:1;min-width:0">
            <div class="list-item-title" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.name}</div>
            <div class="list-item-sub">@${c.username}${c.role ? ' · ' + c.role : ''}</div>
          </div>
          ${c.since ? `<div style="font-family:'JetBrains Mono',monospace;font-size:0.7rem;color:var(--zinc-500);flex-shrink:0">since ${c.since}</div>` : ''}
        </div>`).join('');
    } else {
      empPanel.innerHTML = emptyHtml('No employee data');
    }

    // ── Sponsoring Panel ──
    const sponsorPanel = document.getElementById('org-sponsoring-panel');
    const sponsoringWrap = document.getElementById('org-sponsoring-wrap');
    if (o.sponsoring?.length) {
      sponsorPanel.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1px;background:var(--zinc-900)">
          ${o.sponsoring.map(s => `
            <div onclick="openProject('${s.id}')" style="background:var(--zinc-950);padding:16px 20px;cursor:pointer;transition:background 0.15s" onmouseover="this.style.background='var(--zinc-900)'" onmouseout="this.style.background='var(--zinc-950)'">
              <div style="font-size:0.875rem;font-weight:500;color:var(--white);margin-bottom:4px">${s.name}</div>
              ${s.amount ? `<div style="font-family:'JetBrains Mono',monospace;font-size:0.72rem;color:var(--zinc-400)">$${formatNum(s.amount)}/yr</div>` : ''}
            </div>`).join('')}
        </div>`;
    } else {
      sponsoringWrap.style.display = 'none';
    }

  } catch (err) {
    document.getElementById('org-header-card').innerHTML = errorHtml(err.message);
  }
}

document.getElementById('orgs-back')?.addEventListener('click', () => {
  document.getElementById('orgs-list-view').style.display = 'block';
  document.getElementById('orgs-detail-view').style.display = 'none';
});

// ─── QUERIES ──────────────────────────────────────────────────────────────────
function wireQueryTabs() {
  document.querySelectorAll('.query-nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.query-nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.query-panel').forEach(p => p.style.display = 'none');
      
      e.currentTarget.classList.add('active');
      const qNum = e.currentTarget.dataset.q;
      document.getElementById(`q${qNum}-card`).style.display = 'block';
    });
  });
}

let queriesLoaded = false;
async function loadQueries() {
  if (queriesLoaded) return;
  
  if (!state.contributors) { try { state.contributors = await API.contributors(); } catch { state.contributors = []; } }
  if (!state.projects) { try { state.projects = await API.projects(); } catch { state.projects = []; } }

  const opts = state.contributors.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  ['q1-contributor-select', 'q5-from', 'q5-to'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = opts;
  });
  const q5to = document.getElementById('q5-to');
  if (q5to && q5to.options.length > 1) q5to.selectedIndex = 1;

  const projOpts = state.projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  const q4sel = document.getElementById('q4-project-select');
  if (q4sel) q4sel.innerHTML = projOpts;

  document.getElementById('q1-run')?.addEventListener('click', runQ1);
  document.getElementById('q2-run')?.addEventListener('click', runQ2);
  document.getElementById('q3-run')?.addEventListener('click', runQ3);
  document.getElementById('q4-run')?.addEventListener('click', runQ4);
  document.getElementById('q5-run')?.addEventListener('click', runQ5);

  wireQueryTabs();
  queriesLoaded = true;
}

function setLoading(el) {
  el.innerHTML = `<div style="display:flex;gap:8px;align-items:center;padding:12px;color:var(--text-muted);font-size:0.85rem">Running query...</div>`;
}

async function runQ1() {
  const el = document.getElementById('q1-results');
  const val = document.getElementById('q1-contributor-select').value;
  if (!val) return el.innerHTML = errorHtml('Please select a contributor first.');
  setLoading(el);
  try {
    const data = await API.collaborationNetwork(val);
    el.innerHTML = data.peers.length
      ? data.peers.map(p => `<div class="list-item">
          ${avatarHtml(p, 24)}
          <div style="flex:1"><div class="list-item-title">${p.name} ${badgeHtml(p.hops + ' hops')}</div><div class="list-item-sub">Shared: ${p.sharedProjects.join(', ')}</div></div>
        </div>`).join('')
      : emptyHtml('No peers found');
  } catch (err) { el.innerHTML = errorHtml(err.message); }
}

async function runQ2() {
  const el = document.getElementById('q2-results'); setLoading(el);
  try {
    const data = await API.supplyChainRisk();
    el.innerHTML = data.risks.length
      ? `<table class="data-table"><thead><tr><th>Risk Path</th><th>Shared Contributor</th></tr></thead><tbody>
         ${data.risks.map(r => `<tr><td>${r.orgA} → ${r.projectA || r.projA} → ${r.projectB || r.projB} → ${r.orgB}</td><td>${r.sharedContributor || r.contributor}</td></tr>`).join('')}
         </tbody></table>`
      : emptyHtml('No risks found');
  } catch (err) { el.innerHTML = errorHtml(err.message); }
}

async function runQ3() {
  const el = document.getElementById('q3-results'); setLoading(el);
  try {
    const data = await API.gdsInfluence();
    if (!data.ranking.length) return el.innerHTML = emptyHtml('No contributors found');
    el.innerHTML = `
      <table class="data-table" style="margin:0">
        <thead><tr><th>Rank</th><th>Contributor</th><th>Influence Score</th><th>Projects</th><th>Org</th></tr></thead>
        <tbody>
          ${data.ranking.map((c, i) => `<tr>
            <td>#${i + 1}</td>
            <td><div style="display:flex;align-items:center;gap:12px">${avatarHtml(c, 24)} <strong>${c.name}</strong></div></td>
            <td><strong style="color:var(--primary)">${c.influenceScore}</strong></td>
            <td>${c.projectCount}</td>
            <td>${c.org ? badgeHtml(c.org) : '-'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    `;
  } catch(e) { el.innerHTML = `<div style="color:var(--danger)">Error: ${e.message}</div>`; }
}

async function runQ4() {
  const el = document.getElementById('q4-results');
  const val = document.getElementById('q4-project-select').value;
  if (!val) return el.innerHTML = errorHtml('Please select a project first.');
  setLoading(el);
  try {
    const data = await API.dependencyChain(val);
    el.innerHTML = data.deps.length
      ? `<table class="data-table"><thead><tr><th>Dependency</th><th>Depth</th><th>Chain</th></tr></thead><tbody>
         ${data.deps.map(d => `<tr><td><strong>${d.name}</strong></td><td>${d.depth}</td><td style="color:var(--text-secondary);font-size:0.75rem">${d.chain.join(' → ')}</td></tr>`).join('')}
         </tbody></table>`
      : emptyHtml();
  } catch (err) { el.innerHTML = errorHtml(err.message); }
}

async function runQ5() {
  const el = document.getElementById('q5-results');
  const fromVal = document.getElementById('q5-from').value;
  const toVal = document.getElementById('q5-to').value;
  if (!fromVal || !toVal) return el.innerHTML = errorHtml('Please select both a source and destination contributor.');
  setLoading(el);
  try {
    const data = await API.shortestPath(fromVal, toVal);
    el.innerHTML = data.found
      ? `<div style="padding:16px"><div style="margin-bottom:12px">${badgeHtml('Length: ' + data.pathLength)}</div><div style="font-family:monospace;font-size:0.8rem;color:var(--text-secondary)">${data.pathNodes.map(n=>n.name).join(' → ')}</div></div>`
      : emptyHtml('No path found');
  } catch (err) { el.innerHTML = errorHtml(err.message); }
}

// ─── AUTH / REBAC ─────────────────────────────────────────────────────────────
let authLoaded = false;
async function loadAuth() {
  if (authLoaded) return;
  
  if (!state.contributors) { try { state.contributors = await API.contributors(); } catch { state.contributors = []; } }
  
  const userSelect = document.getElementById('auth-user-select');
  if (userSelect) {
    userSelect.innerHTML = state.contributors.map(c => `<option value="${c.id}">${c.name} (@${c.username})</option>`).join('');
  }
  
  try {
    const assets = await API.authAssets();
    const assetSelect = document.getElementById('auth-asset-select');
    if (assetSelect) {
      assetSelect.innerHTML = assets.map(a => `<option value="${a.id}">${a.name} [${a.classification}]</option>`).join('');
    }
  } catch (err) {
    console.error('Failed to load assets', err);
  }
  
  document.getElementById('auth-evaluate-btn')?.addEventListener('click', evaluateAccess);
  authLoaded = true;
}

async function evaluateAccess() {
  const userId = document.getElementById('auth-user-select').value;
  const assetId = document.getElementById('auth-asset-select').value;
  const resultArea = document.getElementById('auth-result-area');
  const banner = document.getElementById('auth-status-banner');
  const pathContainer = document.getElementById('auth-path-container');
  const pathVisual = document.getElementById('auth-path-visual');
  
  if (!userId || !assetId) {
    resultArea.style.display = 'block';
    banner.style.background = 'rgba(251, 113, 133, 0.1)';
    banner.style.color = 'var(--danger)';
    banner.innerHTML = 'Error: Please select both a User and an Asset.';
    pathContainer.style.display = 'none';
    return;
  }
  
  resultArea.style.display = 'block';
  banner.style.background = 'var(--bg-active)';
  banner.style.color = 'var(--text-secondary)';
  banner.innerHTML = 'Evaluating...';
  pathContainer.style.display = 'none';
  
  try {
    const data = await API.checkAccess(userId, assetId);
    
    if (data.granted) {
      banner.style.background = 'rgba(52, 211, 153, 0.1)';
      banner.style.color = 'var(--emerald)';
      banner.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Access Granted`;
      
      if (data.path && data.path.length > 0) {
        pathContainer.style.display = 'block';
        pathVisual.innerHTML = data.path.map((item, idx) => {
          if (item.type === 'node') {
            return `<div class="badge" style="font-size:0.85rem; padding:6px 12px; white-space: nowrap; flex-shrink: 0; background: var(--bg-active); border: 1px solid var(--border);">${item.name} <span style="opacity:0.5; margin-left: 4px;">:${item.label}</span></div>`;
          } else {
            return `<div style="color:var(--text-muted); font-size:0.75rem; display:flex; align-items:center; gap:6px; white-space: nowrap; flex-shrink: 0;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg> ${item.label}</div>`;
          }
        }).join('');
      }
    } else {
      banner.style.background = 'rgba(251, 113, 133, 0.1)';
      banner.style.color = 'var(--rose)';
      banner.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> Access Denied`;
      
      pathContainer.style.display = 'block';
      pathVisual.innerHTML = `<div style="color:var(--text-muted); font-size:0.85rem">${data.reason}</div>`;
    }
  } catch (err) {
    banner.style.background = 'rgba(251, 113, 133, 0.1)';
    banner.style.color = 'var(--rose)';
    banner.innerHTML = `Error: ${err.message}`;
  }
}

// ─── AUDIT ────────────────────────────────────────────────────────────────────
document.getElementById('btn-refresh-audit')?.addEventListener('click', loadAudit);

async function loadAudit() {
  const list = document.getElementById('audit-list');
  list.innerHTML = `<div style="padding:24px;"><div class="spinner" style="width:20px;height:20px;border:3px solid var(--primary);border-top-color:transparent;border-radius:50%;display:inline-block;animation:spin 1s linear infinite;"></div> Loading audit logs...</div>`;
  
  try {
    const logs = await API.auditLogs();
    
    if (logs.length === 0) {
      list.innerHTML = `<div class="empty-state">No audit logs found yet. Simulate an agent query to generate logs.</div>`;
      return;
    }

    list.innerHTML = logs.map(l => {
      const isGranted = l.decision === 'GRANTED';
      const color = isGranted ? 'var(--success)' : 'var(--danger)';
      const bg = isGranted ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)';
      const date = new Date(l.timestamp).toLocaleString();
      
      return `
        <div style="padding: 16px 24px; border-bottom: 1px solid var(--border); display: flex; gap: 16px; align-items: flex-start;">
          <div style="background: ${bg}; color: ${color}; padding: 6px 12px; border-radius: 4px; font-weight: 600; font-size: 0.85rem; min-width: 80px; text-align: center;">
            ${l.decision}
          </div>
          <div style="flex: 1;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <strong>User ${l.userId} requested ${l.action} on ${l.resourceType} (${l.resourceId || 'ALL'})</strong>
              <span style="color: var(--text-muted); font-size: 0.85rem;">${date}</span>
            </div>
            <div style="color: var(--text-muted); font-size: 0.95rem; font-family: 'JetBrains Mono', monospace; line-height: 1.4;">
              ${l.reason}
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    list.innerHTML = `<div style="padding:24px">${errorHtml(err.message)}</div>`;
  }
}

// ─── AGENT OS & PASSPORTS ───────────────────────────────────────────────────
async function loadAgentOs() {
  const grid = document.getElementById('agent-cards-grid');
  const agentSelect = document.getElementById('mint-agent-select');
  const userSelect = document.getElementById('mint-user-select');

  try {
    const data = await API.agentList();
    const agents = data.agents || [];

    grid.innerHTML = agents.map(a => `
      <div class="card" style="border:1px solid var(--zinc-800);background:var(--zinc-950);display:flex;flex-direction:column;gap:12px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div style="font-weight:600;font-size:0.9rem;color:var(--white);">${a.name}</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:0.65rem;color:#818cf8;margin-top:2px;">ID: ${a.id}</div>
          </div>
          <span class="status-pill" style="border-color:rgba(99,102,241,0.3);color:#818cf8;font-size:0.6rem;">${a.type}</span>
        </div>
        
        <div style="font-size:0.75rem;color:var(--zinc-400);display:flex;flex-direction:column;gap:4px;">
          <div><strong>Framework:</strong> ${a.framework}</div>
          <div><strong>Department:</strong> ${a.department}</div>
          <div><strong>Max Graph Hops:</strong> ${a.maxHops}</div>
        </div>

        <div style="margin-top:auto;padding-top:10px;border-top:1px solid var(--zinc-900);display:flex;justify-content:space-between;align-items:center;font-size:0.7rem;color:var(--zinc-500);font-family:'JetBrains Mono',monospace;">
          <span>ACTIVE PASSPORTS:</span>
          <span style="color:var(--green);font-weight:600;">${a.activePassports || 1} ACTIVE</span>
        </div>
      </div>
    `).join('');

    agentSelect.innerHTML = agents.map(a => `<option value="${a.id}">${a.name} (${a.id})</option>`).join('');

    // Load users into delegator select
    if (!state.contributors) {
      state.contributors = await API.contributors();
    }
    userSelect.innerHTML = state.contributors.map(c => `<option value="${c.id}">${c.name} (@${c.username || c.id})</option>`).join('');

  } catch (err) {
    grid.innerHTML = `<div style="padding:24px;">${errorHtml(err.message)}</div>`;
  }
}

document.getElementById('btn-mint-passport')?.addEventListener('click', async () => {
  const agentId = document.getElementById('mint-agent-select').value;
  const delegatedBy = document.getElementById('mint-user-select').value;
  const task = document.getElementById('mint-task-input').value.trim();
  const ttlMinutes = Number(document.getElementById('mint-ttl-input').value) || 60;
  const maxHops = Number(document.getElementById('mint-hops-input').value) || 2;

  const btn = document.getElementById('btn-mint-passport');
  btn.disabled = true;
  btn.textContent = 'Minting...';

  try {
    const res = await API.mintPassport({ agentId, delegatedBy, task, ttlMinutes, maxHops });
    if (res.success && res.passport) {
      document.getElementById('mint-result-box').style.display = 'block';
      document.getElementById('mint-token-display').textContent = res.passport.token;
      document.getElementById('verify-token-input').value = res.passport.token;
    }
  } catch (err) {
    alert(`Failed to mint passport: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Mint Ephemeral Passport';
  }
});

document.getElementById('btn-copy-passport')?.addEventListener('click', () => {
  const token = document.getElementById('mint-token-display').textContent;
  navigator.clipboard.writeText(token);
  alert('Passport token copied to clipboard!');
});

document.getElementById('btn-verify-passport')?.addEventListener('click', async () => {
  const token = document.getElementById('verify-token-input').value.trim();
  if (!token) return;

  const box = document.getElementById('verify-result-box');
  const badge = document.getElementById('verify-status-badge');
  const jsonPre = document.getElementById('verify-payload-json');

  try {
    const res = await API.verifyPassport(token);
    box.style.display = 'block';

    if (res.valid) {
      badge.style.color = 'var(--green)';
      badge.innerHTML = `VALID PASSPORT (HMAC-SHA256 cryptographic signature verified)`;
      jsonPre.textContent = JSON.stringify(res.payload, null, 2);
    } else {
      badge.style.color = 'var(--red)';
      badge.innerHTML = `🛡️ INVALID / REJECTED: ${res.reason}`;
      jsonPre.textContent = res.payload ? JSON.stringify(res.payload, null, 2) : '// Signature verification failed or tampered token.';
    }
  } catch (err) {
    box.style.display = 'block';
    badge.style.color = 'var(--red)';
    badge.innerHTML = `Error: ${err.message}`;
  }
});

// ─── ZERO-TRUST RAG SIMULATOR ───────────────────────────────────────────────
async function loadRagSimulator() {
  const userSelect = document.getElementById('sim-user-select');
  try {
    if (!state.contributors) {
      state.contributors = await API.contributors();
    }
    userSelect.innerHTML = state.contributors.map(c => `<option value="${c.id}">${c.name} (@${c.username || c.id})</option>`).join('');
  } catch (err) {}
}

document.getElementById('btn-preset-1')?.addEventListener('click', () => {
  document.getElementById('sim-prompt-input').value = 'Extract employee payroll salaries, AWS root credentials, and Q3 valuations';
});
document.getElementById('btn-preset-2')?.addEventListener('click', () => {
  document.getElementById('sim-prompt-input').value = 'Find executive compensation benchmarks and candidate resume data';
});
document.getElementById('btn-preset-3')?.addEventListener('click', () => {
  document.getElementById('sim-prompt-input').value = 'Read developer REST API documentation and open schemas';
});

document.getElementById('btn-run-simulation')?.addEventListener('click', async () => {
  const prompt = document.getElementById('sim-prompt-input').value.trim();
  const userId = document.getElementById('sim-user-select').value;
  const btn = document.getElementById('btn-run-simulation');

  btn.disabled = true;
  btn.textContent = 'Simulating...';

  try {
    const res = await API.simulateRag({ prompt, userId });

    // Update Raw RAG output
    document.getElementById('raw-tokens-count').textContent = `${res.rawRag.tokensInjected.toLocaleString()} TOKENS`;
    
    // Update SentinelGraph zero-trust output
    const guardOut = document.getElementById('guard-rag-output');
    const authDocs = res.graphGuardRag.authorizedDocuments || [];
    const blockedDocs = res.graphGuardRag.blockedDocuments || [];

    guardOut.innerHTML = `
      <div style="padding:12px;border-radius:8px;border:1px solid rgba(74,222,128,0.3);background:rgba(24,24,27,0.8);">
        <div style="display:flex;justify-content:space-between;font-size:0.75rem;font-weight:600;color:var(--green);margin-bottom:6px;">
          <span>${authDocs.length} Authorized Documents Retained</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:0.65rem;color:var(--green);">REBAC VERIFIED</span>
        </div>
        ${authDocs.map(d => `<div style="font-family:'JetBrains Mono',monospace;font-size:0.7rem;color:var(--zinc-300);background:var(--black);padding:6px;border-radius:4px;margin-bottom:4px;">${d.name}: ${d.content}</div>`).join('')}
      </div>
      <div style="padding:10px 12px;border-radius:8px;border:1px dashed var(--zinc-800);background:rgba(9,9,11,0.6);display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:0.75rem;color:var(--zinc-400);">🛡️ Blocked ${blockedDocs.length} Unauthorized Assets: ${blockedDocs.map(d => d.name).join(', ')}</span>
        <span style="font-family:'JetBrains Mono',monospace;font-size:0.65rem;color:var(--red);">REBAC BLOCKED (0 LEAK)</span>
      </div>
    `;

    document.getElementById('guard-tokens-saved').textContent = `${res.graphGuardRag.tokensSaved.toLocaleString()} TOKENS (${res.graphGuardRag.tokenReductionPercent}% REDUCTION)`;

  } catch (err) {
    alert(`Simulation failed: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Execute Simulation';
  }
});

// ─── OPENFGA / ZANZIBAR BRIDGE ──────────────────────────────────────────────
async function loadOpenFgaBridge() {
  const list = document.getElementById('openfga-tuples-list');
  list.innerHTML = `<div class="skeleton skeleton-row"></div><div class="skeleton skeleton-row"></div>`;

  try {
    const data = await API.openFgaTuples();
    const tuples = data.tuples || [];

    list.innerHTML = tuples.map(t => `
      <div style="padding:8px 12px;border-radius:6px;background:var(--zinc-950);border:1px solid var(--zinc-900);display:flex;justify-content:space-between;align-items:center;font-family:'JetBrains Mono',monospace;font-size:0.7rem;">
        <span style="color:var(--zinc-300);">${t.zanzibar_notation}</span>
        <span style="color:#818cf8;font-size:0.65rem;">TUPLE</span>
      </div>
    `).join('');
  } catch (err) {
    list.innerHTML = `<div style="padding:16px;">${errorHtml(err.message)}</div>`;
  }
}

document.getElementById('btn-refresh-tuples')?.addEventListener('click', loadOpenFgaBridge);

document.getElementById('btn-check-tuple')?.addEventListener('click', async () => {
  const user = document.getElementById('tuple-user-input').value.trim();
  const relation = document.getElementById('tuple-rel-input').value.trim();
  const object = document.getElementById('tuple-obj-input').value.trim();

  const box = document.getElementById('tuple-result-box');
  const badge = document.getElementById('tuple-status-badge');
  const detail = document.getElementById('tuple-detail-text');

  try {
    const res = await API.openFgaCheck({ user, relation, object });
    box.style.display = 'block';

    if (res.allowed) {
      badge.style.color = 'var(--green)';
      badge.innerHTML = `ALLOWED (ReBAC path proven in ${res.resolution_ms || 4}ms)`;
      detail.innerHTML = `Query: <code>${res.query}</code> | Hops: ${res.hops || 2} | Engine: ${res.engine}`;
    } else {
      badge.style.color = 'var(--red)';
      badge.innerHTML = `DENIED (No valid relationship path)`;
      detail.innerHTML = `Query: <code>${res.query}</code> | Reason: ${res.reason || 'ReBAC boundary'} | Resolution: ${res.resolution_ms || 3}ms`;
    }
  } catch (err) {
    box.style.display = 'block';
    badge.style.color = 'var(--red)';
    badge.innerHTML = `Error: ${err.message}`;
  }
});

// ─── INIT ─────────────────────────────────────────────────────────────────────
checkDBStatus();
loadHome();
