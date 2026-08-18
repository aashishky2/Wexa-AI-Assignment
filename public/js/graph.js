/**
 * SentinelGraph D3.js Force-Directed Graph
 */

const GraphViz = (() => {
  let svg, simulation, linkGroup, nodeGroup, tooltip;
  let allNodes = [], allLinks = [];
  let activeFilter = 'all';

  const NODE_COLORS = {
    Contributor:  '#6366f1',
    Agent:        '#a855f7',
    Project:      '#06b6d4',
    Organization: '#10b981',
    Technology:   '#f59e0b',
    Issue:        '#f43f5e',
    DataAsset:    '#fb7185',
  };

  const NODE_RADIUS = {
    Contributor:  10,
    Agent:        12,
    Project:      13,
    Organization: 15,
    Technology:   9,
    Issue:        8,
    DataAsset:    11,
  };

  function init(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Clear previous
    container.querySelectorAll('svg').forEach(s => s.remove());

    const width  = container.clientWidth  || 800;
    const height = container.clientHeight || 600;

    tooltip = document.getElementById('graph-tooltip');

    svg = d3.select(`#${containerId}`)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('aria-hidden', 'true');

    // Arrow marker for directed edges
    svg.append('defs').append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', 'rgba(255,255,255,0.15)');

    const g = svg.append('g').attr('class', 'graph-root');

    // Zoom
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (e) => g.attr('transform', e.transform));
    svg.call(zoom);

    // Reset zoom on double-click of background
    svg.on('dblclick.zoom', null);
    svg.on('dblclick', () => svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity));

    // Click background to deselect
    svg.on('click', (e) => {
      if (e.target.tagName === 'svg' || e.target.tagName === 'rect') {
        clearHighlight();
      }
    });

    linkGroup = g.append('g').attr('class', 'links');
    nodeGroup = g.append('g').attr('class', 'nodes');

    simulation = d3.forceSimulation()
      .force('link', d3.forceLink().id(d => d.id).distance(d => {
        const bothLarge = ['Organization', 'Project'].includes(d.source.label) &&
                         ['Organization', 'Project'].includes(d.target.label);
        return bothLarge ? 120 : 80;
      }).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => NODE_RADIUS[d.label] + 8));

    // Window resize
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      svg.attr('viewBox', `0 0 ${w} ${h}`);
      simulation.force('center', d3.forceCenter(w / 2, h / 2));
      simulation.alpha(0.1).restart();
    });
    ro.observe(container);

    // Reset button
    document.getElementById('graph-reset')?.addEventListener('click', () => {
      svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.type;
        applyFilter();
      });
    });
  }

  function load(data) {
    allNodes = data.nodes;
    allLinks = data.links;
    render(allNodes, allLinks);
    hideLoading();
  }

  function hideLoading() {
    const el = document.getElementById('graph-loading');
    if (el) el.style.display = 'none';
  }

  function applyFilter() {
    if (activeFilter === 'all') {
      render(allNodes, allLinks);
    } else {
      const filteredNodes = allNodes.filter(n => n.label === activeFilter);
      const filteredIds = new Set(filteredNodes.map(n => n.id));
      const filteredLinks = allLinks.filter(l =>
        filteredIds.has(typeof l.source === 'object' ? l.source.id : l.source) &&
        filteredIds.has(typeof l.target === 'object' ? l.target.id : l.target)
      );
      render(filteredNodes, filteredLinks);
    }
  }

  function render(nodes, links) {
    simulation.stop();

    // Links
    const linkSel = linkGroup.selectAll('.link')
      .data(links, d => `${d.source?.id || d.source}-${d.target?.id || d.target}-${d.type}`)
      .join(
        enter => enter.append('line').attr('class', 'link').attr('marker-end', 'url(#arrow)'),
        update => update,
        exit => exit.remove()
      );

    // Nodes
    const nodeSel = nodeGroup.selectAll('.node')
      .data(nodes, d => d.id)
      .join(
        enter => {
          const g = enter.append('g')
            .attr('class', 'node')
            .call(d3.drag()
              .on('start', dragStart)
              .on('drag',  dragging)
              .on('end',   dragEnd));

          g.append('circle')
            .attr('r', d => NODE_RADIUS[d.label] || 10)
            .attr('fill', d => d.avatarColor || NODE_COLORS[d.label] || '#888')
            .attr('stroke', d => NODE_COLORS[d.label] || '#888')
            .attr('stroke-opacity', 0.6)
            .attr('fill-opacity', 0.85);

          g.append('text')
            .attr('dy', d => (NODE_RADIUS[d.label] || 10) + 14)
            .text(d => (d.name || '').length > 16 ? (d.name || '').slice(0, 15) + '…' : (d.name || ''));

          // Events
          g.on('click', (event, d) => {
            event.stopPropagation();
            highlightNode(d, nodeSel, linkSel);
          });

          g.on('mouseover', (event, d) => showTooltip(event, d));
          g.on('mousemove', (event) => moveTooltip(event));
          g.on('mouseout', () => hideTooltip());

          // Accessibility
          g.attr('tabindex', 0)
           .attr('role', 'button')
           .attr('aria-label', d => `${d.label}: ${d.name}`);

          return g;
        },
        update => update,
        exit => exit.remove()
      );

    simulation
      .nodes(nodes)
      .on('tick', () => {
        linkSel
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);

        nodeSel.attr('transform', d => `translate(${d.x},${d.y})`);
      });

    simulation.force('link').links(links);
    simulation.alpha(0.6).restart();
  }

  function highlightNode(d, nodeSel, linkSel) {
    const connectedIds = new Set([d.id]);
    allLinks.forEach(l => {
      const srcId = l.source?.id || l.source;
      const tgtId = l.target?.id || l.target;
      if (srcId === d.id) connectedIds.add(tgtId);
      if (tgtId === d.id) connectedIds.add(srcId);
    });

    nodeSel.selectAll('circle')
      .attr('fill-opacity', n => connectedIds.has(n.id) ? 1 : 0.1)
      .attr('stroke-opacity', n => connectedIds.has(n.id) ? 0.8 : 0.05);
    nodeSel.selectAll('text')
      .attr('opacity', n => connectedIds.has(n.id) ? 1 : 0.1);
    linkSel
      .attr('stroke', l => {
        const srcId = l.source?.id || l.source;
        const tgtId = l.target?.id || l.target;
        return (srcId === d.id || tgtId === d.id) ? '#6366f1' : 'rgba(255,255,255,0.04)';
      })
      .attr('stroke-width', l => {
        const srcId = l.source?.id || l.source;
        const tgtId = l.target?.id || l.target;
        return (srcId === d.id || tgtId === d.id) ? 2.5 : 1;
      });
  }

  function clearHighlight() {
    nodeGroup.selectAll('circle').attr('fill-opacity', 0.85).attr('stroke-opacity', 0.6);
    nodeGroup.selectAll('text').attr('opacity', 1);
    linkGroup.selectAll('.link').attr('stroke', 'rgba(255,255,255,0.08)').attr('stroke-width', 1.5);
  }

  function showTooltip(event, d) {
    if (!tooltip) return;
    let html = `<div style="color:var(--text-muted);font-size:0.7rem;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">${d.label}</div>`;
    html += `<div style="font-weight:600;margin-bottom:6px">${d.name || d.id}</div>`;
    if (d.language) html += `<div style="color:var(--text-muted);font-size:0.75rem">Lang: ${d.language}</div>`;
    if (d.location) html += `<div style="color:var(--text-muted);font-size:0.75rem">Location: ${d.location}</div>`;
    if (d.stars) html += `<div style="color:var(--amber);font-size:0.75rem">★ ${d.stars.toLocaleString()}</div>`;
    if (d.category) html += `<div style="color:var(--text-muted);font-size:0.75rem">${d.category}</div>`;
    if (d.country) html += `<div style="color:var(--text-muted);font-size:0.75rem">🏳 ${d.country}</div>`;
    tooltip.innerHTML = html;
    tooltip.classList.add('visible');
    moveTooltip(event);
  }

  function moveTooltip(event) {
    if (!tooltip) return;
    const container = document.getElementById('graph-container');
    const rect = container.getBoundingClientRect();
    let x = event.clientX - rect.left + 16;
    let y = event.clientY - rect.top + 16;
    if (x + 230 > rect.width) x = event.clientX - rect.left - 230;
    if (y + 120 > rect.height) y = event.clientY - rect.top - 120;
    tooltip.style.left = x + 'px';
    tooltip.style.top  = y + 'px';
  }

  function hideTooltip() {
    if (tooltip) tooltip.classList.remove('visible');
  }

  function dragStart(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x; d.fy = d.y;
  }
  function dragging(event, d) { d.fx = event.x; d.fy = event.y; }
  function dragEnd(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null; d.fy = null;
  }

  return { init, load };
})();
