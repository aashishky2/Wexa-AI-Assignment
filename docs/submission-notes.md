# SentinelGraph AI Submission Notes

## Project Goal

SentinelGraph AI demonstrates how a graph database can govern enterprise AI context. The app models contributors, organizations, projects, technologies, autonomous agents, and sensitive data assets as connected nodes, then uses graph traversal to prove what context an agent is allowed to retrieve.

## Why CognoDB Fits

The core questions are relationship-first:

- Can a contributor or delegated agent reach a data asset?
- Which projects create cross-organization dependency risk?
- What path explains an authorization decision?
- How much context is saved by returning only authorized graph neighborhoods?

These questions are better expressed as openCypher path queries than as nested relational joins. CognoDB provides a Bolt endpoint compatible with the official Neo4j driver, so the backend can run parameterized Cypher while keeping credentials in environment variables.

## Implementation Highlights

- Express backend with route-level error handling and clear health responses.
- CognoDB integration through `neo4j-driver`.
- Parameterized Cypher for all user-supplied request values.
- Seed data covering contributors, organizations, projects, technologies, issues, agents, and data assets.
- Demo-focused dashboard with policy posture, authorized context route, risk hotspots, and prompt-context savings.
- Production health endpoint that confirms whether the CognoDB graph is connected.

## Demo Flow

1. Open `/dashboard`.
2. Confirm the health indicator shows live CognoDB.
3. Inspect the Policy Posture and Authorized Context Route sections.
4. Open the graph explorer to inspect relationships visually.
5. Use the API endpoints listed in the README to inspect graph-native queries directly.

## Deployment Notes

The project is prepared for Vercel. Configure these environment variables in the hosting provider:

```env
COGNODB_URI=bolt+s://YOUR_INSTANCE_ID.databases.cognodb.com
COGNODB_USER=cognodb
COGNODB_PASSWORD=your_generated_password
AGENT_SECRET_KEY=replace_with_a_long_random_secret
```

Then run `npm run seed` locally against the same CognoDB instance before recording the walkthrough.
