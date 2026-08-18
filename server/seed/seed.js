/**
 * SentinelGraph AI - Enterprise Zero-Trust Graph Data Model:
 *
 * Nodes:
 *   (:Contributor  {id, name, username, email, location, bio, followers, avatarColor})
 *   (:Agent        {id, name, type, framework, department, maxHops, permittedScopes, status})
 *   (:Project      {id, name, description, stars, forks, language, license, createdYear})
 *   (:Organization {id, name, type, country, founded, description})
 *   (:Technology   {id, name, category, description})
 *   (:Issue        {id, title, type, severity, status, createdAt})
 *   (:DataAsset    {id, name, classification, sensitivity, description})
 *
 * Relationships:
 *   (Contributor)-[:CONTRIBUTED_TO {commits, role}]->(Project)
 *   (Contributor)-[:WORKS_AT {since, role}]->(Organization)
 *   (Contributor)-[:DELEGATED_TASK {task, maxHops}]->(Agent)
 *   (Contributor)-[:AUTHORED]->(Issue)
 *   (Agent)-[:PERMITTED_SCOPE]->(DataAsset)
 *   (Project)-[:DEPENDS_ON {version, type}]->(Project)
 *   (Project)-[:USES_TECHNOLOGY]->(Technology)
 *   (Organization)-[:SPONSORS {amount, since}]->(Project)
 *   (Project)-[:PART_OF]->(Organization)
 *   (Contributor)-[:FOLLOWS]->(Contributor)
 *   (Organization)-[:OWNS_ASSET]->(DataAsset)
 *   (Project)-[:HAS_ACCESS_TO]->(DataAsset)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const neo4j = require('neo4j-driver');

const URI = process.env.COGNODB_URI;
const USER = process.env.COGNODB_USER || 'cognodb';
const PASSWORD = process.env.COGNODB_PASSWORD;

if (!URI || !PASSWORD) {
  console.error('[Seed] ERROR: Set COGNODB_URI and COGNODB_PASSWORD in your .env file.');
  process.exit(1);
}

const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD));

// ─── Seed Data ────────────────────────────────────────────────────────────────

const organizations = [
  { id: 'org-1', name: 'Google', type: 'Corporation', country: 'USA', founded: 1998, description: 'Tech giant behind many OSS projects' },
  { id: 'org-2', name: 'Meta', type: 'Corporation', country: 'USA', founded: 2004, description: 'Social media and OSS contributor' },
  { id: 'org-3', name: 'Microsoft', type: 'Corporation', country: 'USA', founded: 1975, description: 'Enterprise software and OSS leader' },
  { id: 'org-4', name: 'Vercel', type: 'Startup', country: 'USA', founded: 2015, description: 'Frontend cloud platform' },
  { id: 'org-5', name: 'HashiCorp', type: 'Startup', country: 'USA', founded: 2012, description: 'Infrastructure automation tools' },
  { id: 'org-6', name: 'Apache Foundation', type: 'Foundation', country: 'USA', founded: 1999, description: 'Steward of hundreds of OSS projects' },
  { id: 'org-7', name: 'Linux Foundation', type: 'Foundation', country: 'USA', founded: 2000, description: 'Supports Linux and cloud-native OSS' },
  { id: 'org-8', name: 'Cloudflare', type: 'Corporation', country: 'USA', founded: 2009, description: 'Edge computing and security' },
];

const technologies = [
  { id: 'tech-1', name: 'TypeScript', category: 'Language', description: 'Typed superset of JavaScript' },
  { id: 'tech-2', name: 'Rust', category: 'Language', description: 'Systems programming language' },
  { id: 'tech-3', name: 'Go', category: 'Language', description: 'Statically typed language by Google' },
  { id: 'tech-4', name: 'Python', category: 'Language', description: 'High-level interpreted language' },
  { id: 'tech-5', name: 'React', category: 'Framework', description: 'UI component library' },
  { id: 'tech-6', name: 'Kubernetes', category: 'Infrastructure', description: 'Container orchestration system' },
  { id: 'tech-7', name: 'WebAssembly', category: 'Runtime', description: 'Binary instruction format for VMs' },
  { id: 'tech-8', name: 'GraphQL', category: 'Protocol', description: 'Query language for APIs' },
  { id: 'tech-9', name: 'gRPC', category: 'Protocol', description: 'High-performance RPC framework' },
  { id: 'tech-10', name: 'Terraform', category: 'Infrastructure', description: 'Infrastructure as code tool' },
  { id: 'tech-11', name: 'Docker', category: 'Infrastructure', description: 'Containerization platform' },
  { id: 'tech-12', name: 'Node.js', category: 'Runtime', description: 'JavaScript runtime built on V8' },
];

const contributors = [
  { id: 'c-1', name: 'Aisha Patel', username: 'aishap', email: 'aisha@example.com', location: 'San Francisco', bio: 'Systems engineer, Rust & Go enthusiast', followers: 4200, avatarColor: '#6366f1' },
  { id: 'c-2', name: 'Marcus Webb', username: 'marcusw', email: 'marcus@example.com', location: 'Seattle', bio: 'Compiler engineer, WebAssembly core team', followers: 8900, avatarColor: '#ec4899' },
  { id: 'c-3', name: 'Lin Zhao', username: 'linzhao', email: 'lin@example.com', location: 'Beijing', bio: 'Distributed systems, Kubernetes contributor', followers: 6100, avatarColor: '#14b8a6' },
  { id: 'c-4', name: 'Sofia Andersen', username: 'sofiadev', email: 'sofia@example.com', location: 'Copenhagen', bio: 'Frontend architect, React core team', followers: 12400, avatarColor: '#f59e0b' },
  { id: 'c-5', name: 'James Okafor', username: 'jamesokafor', email: 'james@example.com', location: 'Lagos', bio: 'DevOps and platform engineering', followers: 3700, avatarColor: '#22c55e' },
  { id: 'c-6', name: 'Priya Nair', username: 'priyanair', email: 'priya@example.com', location: 'Bangalore', bio: 'ML infrastructure, Python core', followers: 9200, avatarColor: '#a855f7' },
  { id: 'c-7', name: 'Tobias Klein', username: 'tobiask', email: 'tobias@example.com', location: 'Berlin', bio: 'Security researcher, cryptography', followers: 5500, avatarColor: '#ef4444' },
  { id: 'c-8', name: 'Yuki Tanaka', username: 'yukitanaka', email: 'yuki@example.com', location: 'Tokyo', bio: 'Edge computing, Cloudflare Workers', followers: 7800, avatarColor: '#0ea5e9' },
  { id: 'c-9', name: 'Elena Morozova', username: 'elenamo', email: 'elena@example.com', location: 'Moscow', bio: 'Infrastructure tooling, Terraform maintainer', followers: 4600, avatarColor: '#f97316' },
  { id: 'c-10', name: 'Carlos Rivera', username: 'carlosdev', email: 'carlos@example.com', location: 'Mexico City', bio: 'Full-stack engineer, GraphQL evangelist', followers: 3200, avatarColor: '#84cc16' },
  { id: 'c-11', name: 'Fatima Al-Hassan', username: 'fatimah', email: 'fatima@example.com', location: 'Dubai', bio: 'Cloud-native, gRPC and protobuf', followers: 5900, avatarColor: '#06b6d4' },
  { id: 'c-12', name: 'Noah Bergmann', username: 'noahberg', email: 'noah@example.com', location: 'Zurich', bio: 'Database internals, query optimization', followers: 6800, avatarColor: '#8b5cf6' },
  { id: 'c-13', name: 'Amara Diallo', username: 'amarad', email: 'amara@example.com', location: 'Dakar', bio: 'TypeScript tooling, language server protocol', followers: 4100, avatarColor: '#d946ef' },
  { id: 'c-14', name: 'Hiroshi Kimura', username: 'hiroshik', email: 'hiroshi@example.com', location: 'Osaka', bio: 'Networking stack, low-level systems', followers: 7200, avatarColor: '#10b981' },
  { id: 'c-15', name: 'Valentina Cruz', username: 'valcruz', email: 'valentina@example.com', location: 'Buenos Aires', bio: 'Open source sustainability and governance', followers: 5100, avatarColor: '#f43f5e' },
];

const agents = [
  {
    id: 'agent-fin-auditor',
    name: 'Finance & Invoice Auditor Agent',
    type: 'Autonomous Worker',
    framework: 'LangChain',
    department: 'Finance',
    maxHops: 2,
    permittedScopes: ['Internal', 'Restricted:Finance'],
    status: 'ONLINE'
  },
  {
    id: 'agent-code-sentinel',
    name: 'PR Code Security Sentinel',
    type: 'Copilot',
    framework: 'LlamaIndex',
    department: 'Engineering',
    maxHops: 3,
    permittedScopes: ['Internal', 'Confidential:Code'],
    status: 'ONLINE'
  },
  {
    id: 'agent-hr-onboarding',
    name: 'Talent & HR Assistant',
    type: 'Autonomous Worker',
    framework: 'CrewAI',
    department: 'Human Resources',
    maxHops: 1,
    permittedScopes: ['Internal', 'Confidential:HR'],
    status: 'ONLINE'
  },
  {
    id: 'agent-devops-sentinel',
    name: 'Infrastructure & SRE Bot',
    type: 'Autonomous Worker',
    framework: 'AutoGen',
    department: 'Platform Engineering',
    maxHops: 2,
    permittedScopes: ['Internal', 'Restricted:Infrastructure'],
    status: 'ONLINE'
  }
];

const projects = [
  { id: 'p-1', name: 'Nexus Core', description: 'High-performance distributed message broker written in Rust', stars: 18400, forks: 2100, language: 'Rust', license: 'Apache-2.0', createdYear: 2019 },
  { id: 'p-2', name: 'FlowKit', description: 'React-based workflow builder with GraphQL API', stars: 9200, forks: 1400, language: 'TypeScript', license: 'MIT', createdYear: 2020 },
  { id: 'p-3', name: 'KubeFlux', description: 'Kubernetes operator framework for ML workloads', stars: 14700, forks: 1900, language: 'Go', license: 'Apache-2.0', createdYear: 2021 },
  { id: 'p-4', name: 'TerraForge', description: 'Terraform plugin SDK with enhanced testing tools', stars: 7800, forks: 980, language: 'Go', license: 'MPL-2.0', createdYear: 2020 },
  { id: 'p-5', name: 'EdgeRuntime', description: 'Lightweight WebAssembly runtime for edge compute', stars: 22100, forks: 3200, language: 'Rust', license: 'MIT', createdYear: 2022 },
  { id: 'p-6', name: 'PyMLOps', description: 'MLOps pipeline orchestration for Python ML teams', stars: 11600, forks: 1500, language: 'Python', license: 'Apache-2.0', createdYear: 2021 },
  { id: 'p-7', name: 'SecureVault', description: 'Zero-trust secret management service', stars: 8900, forks: 1100, language: 'Go', license: 'BUSL-1.1', createdYear: 2022 },
  { id: 'p-8', name: 'DataStream', description: 'Real-time data streaming pipeline with gRPC transport', stars: 6700, forks: 890, language: 'TypeScript', license: 'MIT', createdYear: 2021 },
  { id: 'p-9', name: 'CloudMesh', description: 'Service mesh for hybrid cloud environments', stars: 15200, forks: 2400, language: 'Go', license: 'Apache-2.0', createdYear: 2020 },
  { id: 'p-10', name: 'LangTool', description: 'Language server and static analysis toolkit', stars: 5400, forks: 620, language: 'TypeScript', license: 'MIT', createdYear: 2023 },
  { id: 'p-11', name: 'GraphSync', description: 'Distributed graph computation engine', stars: 9800, forks: 1200, language: 'Rust', license: 'Apache-2.0', createdYear: 2022 },
  { id: 'p-12', name: 'WasmEdge', description: 'WebAssembly sandbox for untrusted code execution', stars: 17300, forks: 2700, language: 'Rust', license: 'Apache-2.0', createdYear: 2021 },
];

const issues = [
  { id: 'i-1', title: 'Memory leak under high concurrency', type: 'Bug', severity: 'Critical', status: 'Open', createdAt: '2024-01-15' },
  { id: 'i-2', title: 'Add WASM streaming compilation', type: 'Feature', severity: 'High', status: 'In Progress', createdAt: '2024-02-20' },
  { id: 'i-3', title: 'GraphQL subscription performance degradation', type: 'Bug', severity: 'High', status: 'Resolved', createdAt: '2024-03-10' },
  { id: 'i-4', title: 'Kubernetes node affinity not respected', type: 'Bug', severity: 'Medium', status: 'Open', createdAt: '2024-03-22' },
  { id: 'i-5', title: 'Terraform provider validation timeout', type: 'Bug', severity: 'Medium', status: 'Resolved', createdAt: '2024-04-05' },
  { id: 'i-6', title: 'Add secret rotation API', type: 'Feature', severity: 'High', status: 'In Progress', createdAt: '2024-04-18' },
  { id: 'i-7', title: 'gRPC backpressure handling', type: 'Feature', severity: 'Medium', status: 'Open', createdAt: '2024-05-02' },
  { id: 'i-8', title: 'Edge cold-start latency spike', type: 'Bug', severity: 'Critical', status: 'In Progress', createdAt: '2024-05-14' },
  { id: 'i-9', title: 'Python async support for pipeline steps', type: 'Feature', severity: 'High', status: 'Open', createdAt: '2024-06-01' },
  { id: 'i-10', title: 'TypeScript strict mode errors in generated code', type: 'Bug', severity: 'Low', status: 'Resolved', createdAt: '2024-06-20' },
];

const dataAssets = [
  { id: 'da-1', name: 'Production DB Credentials', classification: 'Restricted', sensitivity: 'High', description: 'Master database passwords' },
  { id: 'da-2', name: 'AWS Root Keys', classification: 'Restricted', sensitivity: 'Critical', description: 'Root AWS access keys' },
  { id: 'da-3', name: 'Staging API Keys', classification: 'Internal', sensitivity: 'Medium', description: 'API keys for staging environments' },
  { id: 'da-4', name: 'Customer PII & Salary Ledger', classification: 'Confidential', sensitivity: 'High', description: 'Anonymized customer data and executive salary bands' },
  { id: 'da-5', name: 'Code Signing Certificates', classification: 'Restricted', sensitivity: 'Critical', description: 'Certificates for releasing production binaries' },
  { id: 'da-6', name: 'M&A Acquisition Deck 2026', classification: 'Confidential', sensitivity: 'Critical', description: 'Board confidential merger and valuation deck' },
];

// ─── Relationships ────────────────────────────────────────────────────────────

const contributesTo = [
  { contributor: 'c-1', project: 'p-1', commits: 342, role: 'Maintainer' },
  { contributor: 'c-1', project: 'p-11', commits: 187, role: 'Contributor' },
  { contributor: 'c-2', project: 'p-5', commits: 891, role: 'Core Maintainer' },
  { contributor: 'c-2', project: 'p-12', commits: 412, role: 'Maintainer' },
  { contributor: 'c-2', project: 'p-1', commits: 95, role: 'Contributor' },
  { contributor: 'c-3', project: 'p-3', commits: 654, role: 'Maintainer' },
  { contributor: 'c-3', project: 'p-9', commits: 203, role: 'Contributor' },
  { contributor: 'c-4', project: 'p-2', commits: 1203, role: 'Core Maintainer' },
  { contributor: 'c-4', project: 'p-10', commits: 89, role: 'Contributor' },
  { contributor: 'c-5', project: 'p-3', commits: 178, role: 'Contributor' },
  { contributor: 'c-5', project: 'p-4', commits: 320, role: 'Maintainer' },
  { contributor: 'c-5', project: 'p-9', commits: 145, role: 'Contributor' },
  { contributor: 'c-6', project: 'p-6', commits: 987, role: 'Core Maintainer' },
  { contributor: 'c-6', project: 'p-3', commits: 112, role: 'Contributor' },
  { contributor: 'c-7', project: 'p-7', commits: 543, role: 'Maintainer' },
  { contributor: 'c-7', project: 'p-1', commits: 67, role: 'Contributor' },
  { contributor: 'c-8', project: 'p-5', commits: 289, role: 'Contributor' },
  { contributor: 'c-8', project: 'p-12', commits: 765, role: 'Maintainer' },
  { contributor: 'c-9', project: 'p-4', commits: 421, role: 'Core Maintainer' },
  { contributor: 'c-9', project: 'p-7', commits: 134, role: 'Contributor' },
  { contributor: 'c-10', project: 'p-2', commits: 210, role: 'Contributor' },
  { contributor: 'c-10', project: 'p-8', commits: 389, role: 'Maintainer' },
  { contributor: 'c-11', project: 'p-8', commits: 267, role: 'Contributor' },
  { contributor: 'c-11', project: 'p-9', commits: 183, role: 'Contributor' },
  { contributor: 'c-12', project: 'p-11', commits: 512, role: 'Core Maintainer' },
  { contributor: 'c-12', project: 'p-1', commits: 178, role: 'Contributor' },
  { contributor: 'c-13', project: 'p-10', commits: 634, role: 'Core Maintainer' },
  { contributor: 'c-13', project: 'p-2', commits: 98, role: 'Contributor' },
  { contributor: 'c-14', project: 'p-9', commits: 445, role: 'Maintainer' },
  { contributor: 'c-14', project: 'p-5', commits: 156, role: 'Contributor' },
  { contributor: 'c-15', project: 'p-6', commits: 234, role: 'Contributor' },
  { contributor: 'c-15', project: 'p-3', commits: 89, role: 'Contributor' },
];

const worksAt = [
  { contributor: 'c-1', org: 'org-2', since: 2019, role: 'Staff Engineer' },
  { contributor: 'c-2', org: 'org-1', since: 2018, role: 'Principal Engineer' },
  { contributor: 'c-3', org: 'org-7', since: 2020, role: 'Senior Engineer' },
  { contributor: 'c-4', org: 'org-4', since: 2021, role: 'Staff Engineer' },
  { contributor: 'c-5', org: 'org-7', since: 2019, role: 'DevOps Lead' },
  { contributor: 'c-6', org: 'org-1', since: 2022, role: 'Research Engineer' },
  { contributor: 'c-7', org: 'org-5', since: 2020, role: 'Security Architect' },
  { contributor: 'c-8', org: 'org-8', since: 2021, role: 'Edge Engineer' },
  { contributor: 'c-9', org: 'org-5', since: 2018, role: 'Core Engineer' },
  { contributor: 'c-10', org: 'org-4', since: 2022, role: 'Senior Engineer' },
  { contributor: 'c-11', org: 'org-3', since: 2021, role: 'Cloud Architect' },
  { contributor: 'c-12', org: 'org-6', since: 2019, role: 'Database Engineer' },
  { contributor: 'c-13', org: 'org-3', since: 2022, role: 'TypeScript Engineer' },
  { contributor: 'c-14', org: 'org-8', since: 2020, role: 'Networking Engineer' },
  { contributor: 'c-15', org: 'org-6', since: 2021, role: 'Community Manager' },
];

const agentDelegations = [
  { user: 'c-1', agent: 'agent-fin-auditor', task: 'Audit Meta Cloud Invoices', maxHops: 2 },
  { user: 'c-4', agent: 'agent-code-sentinel', task: 'Scan FlowKit Pull Requests', maxHops: 3 },
  { user: 'c-6', agent: 'agent-hr-onboarding', task: 'Process Candidate Resumes', maxHops: 1 },
  { user: 'c-5', agent: 'agent-devops-sentinel', task: 'Rotate KubeFlux Secrets', maxHops: 2 },
];

const agentScopes = [
  { agent: 'agent-fin-auditor', asset: 'da-4' },
  { agent: 'agent-code-sentinel', asset: 'da-3' },
  { agent: 'agent-devops-sentinel', asset: 'da-1' },
];

const dependsOn = [
  { from: 'p-2', to: 'p-8', version: '2.1.0', type: 'runtime' },
  { from: 'p-3', to: 'p-9', version: '1.4.2', type: 'runtime' },
  { from: 'p-5', to: 'p-12', version: '0.9.1', type: 'runtime' },
  { from: 'p-6', to: 'p-3', version: '3.0.0', type: 'devDependency' },
  { from: 'p-7', to: 'p-1', version: '4.2.1', type: 'runtime' },
  { from: 'p-8', to: 'p-1', version: '4.0.0', type: 'runtime' },
  { from: 'p-9', to: 'p-7', version: '1.0.3', type: 'optional' },
  { from: 'p-10', to: 'p-2', version: '2.0.0', type: 'devDependency' },
  { from: 'p-11', to: 'p-1', version: '4.2.1', type: 'runtime' },
  { from: 'p-12', to: 'p-5', version: '1.2.0', type: 'runtime' },
  { from: 'p-3', to: 'p-4', version: '1.1.0', type: 'devDependency' },
];

const usesTechnology = [
  { project: 'p-1', tech: 'tech-2' },
  { project: 'p-1', tech: 'tech-9' },
  { project: 'p-2', tech: 'tech-1' },
  { project: 'p-2', tech: 'tech-5' },
  { project: 'p-2', tech: 'tech-8' },
  { project: 'p-3', tech: 'tech-3' },
  { project: 'p-3', tech: 'tech-6' },
  { project: 'p-4', tech: 'tech-3' },
  { project: 'p-4', tech: 'tech-10' },
  { project: 'p-5', tech: 'tech-2' },
  { project: 'p-5', tech: 'tech-7' },
  { project: 'p-6', tech: 'tech-4' },
  { project: 'p-6', tech: 'tech-6' },
  { project: 'p-7', tech: 'tech-3' },
  { project: 'p-7', tech: 'tech-11' },
  { project: 'p-8', tech: 'tech-1' },
  { project: 'p-8', tech: 'tech-9' },
  { project: 'p-8', tech: 'tech-12' },
  { project: 'p-9', tech: 'tech-3' },
  { project: 'p-9', tech: 'tech-6' },
  { project: 'p-9', tech: 'tech-11' },
  { project: 'p-10', tech: 'tech-1' },
  { project: 'p-10', tech: 'tech-12' },
  { project: 'p-11', tech: 'tech-2' },
  { project: 'p-11', tech: 'tech-9' },
  { project: 'p-12', tech: 'tech-2' },
  { project: 'p-12', tech: 'tech-7' },
];

const sponsors = [
  { org: 'org-1', project: 'p-3', amount: 250000, since: 2021 },
  { org: 'org-1', project: 'p-6', amount: 180000, since: 2022 },
  { org: 'org-2', project: 'p-5', amount: 300000, since: 2022 },
  { org: 'org-3', project: 'p-2', amount: 150000, since: 2020 },
  { org: 'org-4', project: 'p-10', amount: 80000, since: 2023 },
  { org: 'org-5', project: 'p-7', amount: 200000, since: 2022 },
  { org: 'org-7', project: 'p-9', amount: 400000, since: 2020 },
  { org: 'org-8', project: 'p-5', amount: 220000, since: 2022 },
  { org: 'org-6', project: 'p-11', amount: 120000, since: 2022 },
];

const partOf = [
  { project: 'p-1', org: 'org-2' },
  { project: 'p-2', org: 'org-4' },
  { project: 'p-3', org: 'org-7' },
  { project: 'p-4', org: 'org-5' },
  { project: 'p-5', org: 'org-8' },
  { project: 'p-6', org: 'org-1' },
  { project: 'p-7', org: 'org-5' },
  { project: 'p-8', org: 'org-4' },
  { project: 'p-9', org: 'org-7' },
  { project: 'p-10', org: 'org-3' },
  { project: 'p-11', org: 'org-6' },
  { project: 'p-12', org: 'org-8' },
];

const follows = [
  { from: 'c-1', to: 'c-2' }, { from: 'c-1', to: 'c-7' },
  { from: 'c-2', to: 'c-8' }, { from: 'c-2', to: 'c-14' },
  { from: 'c-3', to: 'c-5' }, { from: 'c-3', to: 'c-11' },
  { from: 'c-4', to: 'c-13' }, { from: 'c-4', to: 'c-10' },
  { from: 'c-5', to: 'c-3' }, { from: 'c-5', to: 'c-14' },
  { from: 'c-6', to: 'c-15' }, { from: 'c-6', to: 'c-12' },
  { from: 'c-7', to: 'c-9' }, { from: 'c-7', to: 'c-1' },
  { from: 'c-8', to: 'c-14' }, { from: 'c-8', to: 'c-2' },
  { from: 'c-9', to: 'c-7' }, { from: 'c-9', to: 'c-5' },
  { from: 'c-10', to: 'c-4' }, { from: 'c-10', to: 'c-13' },
  { from: 'c-11', to: 'c-3' }, { from: 'c-11', to: 'c-14' },
  { from: 'c-12', to: 'c-1' }, { from: 'c-12', to: 'c-6' },
  { from: 'c-13', to: 'c-4' }, { from: 'c-14', to: 'c-8' },
  { from: 'c-15', to: 'c-6' }, { from: 'c-15', to: 'c-3' },
];

const authored = [
  { contributor: 'c-2', issue: 'i-2' },
  { contributor: 'c-3', issue: 'i-4' },
  { contributor: 'c-4', issue: 'i-3' },
  { contributor: 'c-5', issue: 'i-5' },
  { contributor: 'c-6', issue: 'i-9' },
  { contributor: 'c-7', issue: 'i-6' },
  { contributor: 'c-8', issue: 'i-8' },
  { contributor: 'c-9', issue: 'i-5' },
  { contributor: 'c-10', issue: 'i-7' },
  { contributor: 'c-11', issue: 'i-7' },
  { contributor: 'c-12', issue: 'i-1' },
  { contributor: 'c-13', issue: 'i-10' },
  { contributor: 'c-1', issue: 'i-1' },
];

const ownsAsset = [
  { org: 'org-1', asset: 'da-1' }, // Google owns Prod DB Creds
  { org: 'org-2', asset: 'da-4' }, // Meta owns Customer PII & Salary Ledger
  { org: 'org-2', asset: 'da-6' }, // Meta owns M&A Acquisition Deck
  { org: 'org-4', asset: 'da-2' }, // Vercel owns AWS Root Keys
  { org: 'org-5', asset: 'da-5' }, // HashiCorp owns Code Signing Certs
  { org: 'org-7', asset: 'da-3' }, // Linux Foundation owns Staging API Keys
];

const hasAccessTo = [
  { project: 'p-1', asset: 'da-1' }, // Nexus Core has access to Prod DB Creds
  { project: 'p-6', asset: 'da-4' }, // PyMLOps has access to Customer PII
  { project: 'p-2', asset: 'da-2' }, // FlowKit has access to AWS Root Keys
  { project: 'p-4', asset: 'da-5' }, // TerraForge has access to Code Signing Certs
  { project: 'p-9', asset: 'da-3' }, // CloudMesh has access to Staging API Keys
];

// ─── Seeding Functions ────────────────────────────────────────────────────────

async function clearDatabase(session) {
  console.log('[Seed] Clearing existing data...');
  await session.run('MATCH (n) DETACH DELETE n');
  console.log('[Seed] Database cleared.');
}

async function createConstraints(session) {
  console.log('[Seed] Creating constraints and indexes...');
  const constraints = [
    'CREATE CONSTRAINT IF NOT EXISTS FOR (c:Contributor) REQUIRE c.id IS UNIQUE',
    'CREATE CONSTRAINT IF NOT EXISTS FOR (a:Agent) REQUIRE a.id IS UNIQUE',
    'CREATE CONSTRAINT IF NOT EXISTS FOR (p:Project) REQUIRE p.id IS UNIQUE',
    'CREATE CONSTRAINT IF NOT EXISTS FOR (o:Organization) REQUIRE o.id IS UNIQUE',
    'CREATE CONSTRAINT IF NOT EXISTS FOR (t:Technology) REQUIRE t.id IS UNIQUE',
    'CREATE CONSTRAINT IF NOT EXISTS FOR (i:Issue) REQUIRE i.id IS UNIQUE',
    'CREATE CONSTRAINT IF NOT EXISTS FOR (d:DataAsset) REQUIRE d.id IS UNIQUE',
  ];
  for (const query of constraints) {
    await session.run(query);
  }
  console.log('[Seed] Constraints created.');
}

async function seedNodes(session) {
  console.log('[Seed] Seeding nodes...');

  for (const org of organizations) {
    await session.run(
      `CREATE (o:Organization {id: $id, name: $name, type: $type, country: $country, founded: $founded, description: $description})`,
      org
    );
  }
  console.log(`  ✓ ${organizations.length} organizations`);

  for (const tech of technologies) {
    await session.run(
      `CREATE (t:Technology {id: $id, name: $name, category: $category, description: $description})`,
      tech
    );
  }
  console.log(`  ✓ ${technologies.length} technologies`);

  for (const c of contributors) {
    await session.run(
      `CREATE (c:Contributor {id: $id, name: $name, username: $username, email: $email, location: $location, bio: $bio, followers: $followers, avatarColor: $avatarColor})`,
      c
    );
  }
  console.log(`  ✓ ${contributors.length} contributors`);

  for (const a of agents) {
    await session.run(
      `CREATE (a:Agent {id: $id, name: $name, type: $type, framework: $framework, department: $department, maxHops: $maxHops, permittedScopes: $permittedScopes, status: $status})`,
      a
    );
  }
  console.log(`  ✓ ${agents.length} autonomous AI agents`);

  for (const p of projects) {
    await session.run(
      `CREATE (p:Project {id: $id, name: $name, description: $description, stars: $stars, forks: $forks, language: $language, license: $license, createdYear: $createdYear})`,
      p
    );
  }
  console.log(`  ✓ ${projects.length} projects`);

  for (const issue of issues) {
    await session.run(
      `CREATE (i:Issue {id: $id, title: $title, type: $type, severity: $severity, status: $status, createdAt: $createdAt})`,
      issue
    );
  }
  console.log(`  ✓ ${issues.length} issues`);

  for (const asset of dataAssets) {
    await session.run(
      `CREATE (d:DataAsset {id: $id, name: $name, classification: $classification, sensitivity: $sensitivity, description: $description})`,
      asset
    );
  }
  console.log(`  ✓ ${dataAssets.length} data assets`);
}

async function seedRelationships(session) {
  console.log('[Seed] Seeding relationships...');

  for (const rel of contributesTo) {
    await session.run(
      `MATCH (c:Contributor {id: $contributor}), (p:Project {id: $project})
       CREATE (c)-[:CONTRIBUTED_TO {commits: $commits, role: $role}]->(p)`,
      rel
    );
  }
  console.log(`  ✓ ${contributesTo.length} CONTRIBUTED_TO`);

  for (const rel of worksAt) {
    await session.run(
      `MATCH (c:Contributor {id: $contributor}), (o:Organization {id: $org})
       CREATE (c)-[:WORKS_AT {since: $since, role: $role}]->(o)`,
      rel
    );
  }
  console.log(`  ✓ ${worksAt.length} WORKS_AT`);

  for (const rel of agentDelegations) {
    await session.run(
      `MATCH (u:Contributor {id: $user}), (a:Agent {id: $agent})
       CREATE (u)-[:DELEGATED_TASK {task: $task, maxHops: $maxHops}]->(a)`,
      rel
    );
  }
  console.log(`  ✓ ${agentDelegations.length} DELEGATED_TASK (User -> Agent)`);

  for (const rel of agentScopes) {
    await session.run(
      `MATCH (a:Agent {id: $agent}), (d:DataAsset {id: $asset})
       CREATE (a)-[:PERMITTED_SCOPE]->(d)`,
      rel
    );
  }
  console.log(`  ✓ ${agentScopes.length} PERMITTED_SCOPE (Agent -> DataAsset)`);

  for (const rel of dependsOn) {
    await session.run(
      `MATCH (a:Project {id: $from}), (b:Project {id: $to})
       CREATE (a)-[:DEPENDS_ON {version: $version, type: $type}]->(b)`,
      rel
    );
  }
  console.log(`  ✓ ${dependsOn.length} DEPENDS_ON`);

  for (const rel of usesTechnology) {
    await session.run(
      `MATCH (p:Project {id: $project}), (t:Technology {id: $tech})
       CREATE (p)-[:USES_TECHNOLOGY]->(t)`,
      rel
    );
  }
  console.log(`  ✓ ${usesTechnology.length} USES_TECHNOLOGY`);

  for (const rel of sponsors) {
    await session.run(
      `MATCH (o:Organization {id: $org}), (p:Project {id: $project})
       CREATE (o)-[:SPONSORS {amount: $amount, since: $since}]->(p)`,
      rel
    );
  }
  console.log(`  ✓ ${sponsors.length} SPONSORS`);

  for (const rel of partOf) {
    await session.run(
      `MATCH (p:Project {id: $project}), (o:Organization {id: $org})
       CREATE (p)-[:PART_OF]->(o)`,
      rel
    );
  }
  console.log(`  ✓ ${partOf.length} PART_OF`);

  for (const rel of follows) {
    await session.run(
      `MATCH (a:Contributor {id: $from}), (b:Contributor {id: $to})
       CREATE (a)-[:FOLLOWS]->(b)`,
      rel
    );
  }
  console.log(`  ✓ ${follows.length} FOLLOWS`);

  for (const rel of authored) {
    await session.run(
      `MATCH (c:Contributor {id: $contributor}), (i:Issue {id: $issue})
       CREATE (c)-[:AUTHORED]->(i)`,
      rel
    );
  }
  console.log(`  ✓ ${authored.length} AUTHORED`);

  for (const rel of ownsAsset) {
    await session.run(
      `MATCH (o:Organization {id: $org}), (d:DataAsset {id: $asset})
       CREATE (o)-[:OWNS_ASSET]->(d)`,
      rel
    );
  }
  console.log(`  ✓ ${ownsAsset.length} OWNS_ASSET`);

  for (const rel of hasAccessTo) {
    await session.run(
      `MATCH (p:Project {id: $project}), (d:DataAsset {id: $asset})
       CREATE (p)-[:HAS_ACCESS_TO]->(d)`,
      rel
    );
  }
  console.log(`  ✓ ${hasAccessTo.length} HAS_ACCESS_TO`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[Seed] Starting SentinelGraph AI enterprise database seed...');
  const session = driver.session({ database: 'neo4j' });
  try {
    await clearDatabase(session);
    await createConstraints(session);
    await seedNodes(session);
    await seedRelationships(session);
    console.log('\n[Seed] Seeding complete. SentinelGraph zero-trust graph is ready.');
    console.log('[Seed] Summary:');
    console.log(`  Nodes: ${organizations.length + technologies.length + contributors.length + agents.length + projects.length + issues.length + dataAssets.length}`);
    const totalRels = contributesTo.length + worksAt.length + agentDelegations.length + agentScopes.length + dependsOn.length + usesTechnology.length + sponsors.length + partOf.length + follows.length + authored.length + ownsAsset.length + hasAccessTo.length;
    console.log(`  Relationships: ${totalRels}`);
  } catch (err) {
    console.error('[Seed] ERROR:', err.message);
    process.exit(1);
  } finally {
    await session.close();
    await driver.close();
  }
}

main();
