const assert = require('assert');
const { PassThrough, Readable, Writable } = require('stream');

delete process.env.COGNODB_URI;
delete process.env.COGNODB_PASSWORD;
delete process.env.COGNODB_USER;

const app = require('../server/src/app');

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for ${method} ${path}`));
    }, 1000);
    const payload = body ? Buffer.from(JSON.stringify(body)) : null;
    let sent = false;
    const req = new Readable({
      read() {
        if (sent) return;
        sent = true;
        if (payload) this.push(payload);
        this.push(null);
      }
    });

    req.method = method;
    req.url = path;
    req.originalUrl = path;
    req.httpVersion = '1.1';
    req.httpVersionMajor = 1;
    req.httpVersionMinor = 1;
    req.ip = '127.0.0.1';
    req.headers = payload
      ? { 'content-type': 'application/json', 'content-length': String(payload.length) }
      : {};
    const socket = new PassThrough();
    socket.encrypted = false;
    req.connection = socket;
    req.socket = socket;

    const chunks = [];
    const headers = {};
    const res = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      }
    });

    res.statusCode = 200;
    res.setHeader = (name, value) => {
      headers[name.toLowerCase()] = value;
    };
    res.getHeader = (name) => headers[name.toLowerCase()];
    res.removeHeader = (name) => {
      delete headers[name.toLowerCase()];
    };
    res.writeHead = (statusCode, nextHeaders = {}) => {
      res.statusCode = statusCode;
      Object.entries(nextHeaders).forEach(([name, value]) => res.setHeader(name, value));
      return res;
    };
    const originalEnd = res.end.bind(res);
    res.end = (chunk, encoding, callback) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      originalEnd(callback);
    };
    res.on('finish', () => {
      clearTimeout(timeout);
      const rawBody = Buffer.concat(chunks).toString('utf8');
      const contentType = String(headers['content-type'] || '');
      if (path.startsWith('/api/') && rawBody && !contentType.includes('application/json')) {
        reject(new Error(`Expected JSON from ${path}, got ${contentType || 'unknown content type'}`));
        return;
      }
      resolve({
        statusCode: res.statusCode,
        headers,
        body: rawBody ? JSON.parse(rawBody) : null,
      });
    });
    res.on('error', reject);

    app.handle(req, res, reject);
  });
}

(async () => {
  const health = await request('GET', '/api/health');
  assert.strictEqual(health.statusCode, 503);
  assert.strictEqual(health.body.status, 'degraded');
  assert.strictEqual(health.body.db, 'standby');

  const stats = await request('GET', '/api/graph/stats');
  assert.strictEqual(stats.statusCode, 200);
  assert.strictEqual(stats.body.nodes, 80);
  assert.strictEqual(stats.body.relationships, 144);
  assert.strictEqual(stats.body.source, 'sample-data');

  const contributors = await request('GET', '/api/contributors');
  assert.strictEqual(contributors.statusCode, 200);
  assert.ok(contributors.body.length >= 10);
  assert.ok(contributors.body.some(contributor => contributor.id === 'c-1'));

  const overview = await request('GET', '/api/graph/overview');
  assert.strictEqual(overview.statusCode, 200);
  assert.ok(overview.body.nodes.length >= 50);
  assert.ok(overview.body.links.length >= 100);
  assert.strictEqual(overview.body.source, 'sample-data');

  const brief = await request('GET', '/api/insights/context-brief');
  assert.strictEqual(brief.statusCode, 200);
  assert.strictEqual(brief.body.source, 'sample-data');
  assert.ok(brief.body.posture.score >= 80);
  assert.ok(brief.body.riskHotspots.length >= 2);
  assert.ok(brief.body.promptEconomics.reductionPercent >= 60);

  const route = await request('GET', '/api/insights/context-route');
  assert.strictEqual(route.statusCode, 200);
  assert.strictEqual(route.body.source, 'sample-data');
  assert.ok(route.body.lanes.some(lane => lane.status === 'authorized'));
  assert.ok(route.body.lanes.some(lane => lane.status === 'blocked'));
  assert.ok(route.body.cypherProof.includes('MATCH'));

  const project = await request('GET', '/api/projects/p-2');
  assert.strictEqual(project.statusCode, 200);
  assert.strictEqual(project.body.id, 'p-2');
  assert.ok(project.body.technologies.some(technology => technology.name === 'TypeScript'));

  const access = await request('GET', '/api/auth/check-access?contributorId=c-1&assetId=da-4');
  assert.strictEqual(access.statusCode, 200);
  assert.strictEqual(access.body.granted, true);
  assert.deepStrictEqual(access.body.path.map(step => step.label), [
    'Contributor',
    'WORKS_AT',
    'Organization',
    'OWNS_ASSET',
    'DataAsset',
  ]);

  const rag = await request('POST', '/api/agent/simulate-rag', { userId: 'c-1', agentId: 'agent-fin-auditor' });
  assert.strictEqual(rag.statusCode, 200);
  assert.strictEqual(rag.body.source, 'sample-data');
  assert.strictEqual(rag.body.graphGuardRag.status, 'ISOLATED_ZERO_TRUST');
  assert.ok(rag.body.graphGuardRag.blockedDocuments.length > 0);

  const tuples = await request('GET', '/api/bridge/openfga/tuples');
  assert.strictEqual(tuples.statusCode, 200);
  assert.ok(tuples.body.count >= 50);
  assert.strictEqual(tuples.body.specification, 'Google Zanzibar / OpenFGA 1.0');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
