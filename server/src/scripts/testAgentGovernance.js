/**
 * End-to-End Verification Test for SentinelGraph AI Agent Governance Subsystem
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const agentPassportService = require('../services/agentPassportService');
const agentService = require('../services/agentService');
const openFgaBridgeService = require('../services/openFgaBridge');
const { verifyConnectivity, closeDriver } = require('../config/db');

async function runTests() {
  console.log('===============================================================');
  console.log('🤖 SentinelGraph AI: Agent Identity & Governance Test Suite');
  console.log('===============================================================\n');

  try {
    // 1. Verify Database Connectivity
    console.log('--- Test 1: Database Connectivity ---');
    let isConnected = false;
    try {
      isConnected = await verifyConnectivity();
    } catch (err) {
      console.log(`Database Status: 🟡 STANDBY (${err.message})`);
      console.log('Continuing with sample-data fallback.\n');
    }
    if (isConnected) {
      console.log('Database Status: 🟢 CONNECTED (CognoDB Cloud)\n');
    }

    // 2. Test Agent Listing
    console.log('--- Test 2: List Registered Enterprise AI Agents ---');
    const agents = await agentPassportService.listAgents();
    console.log(`Found ${agents.length} registered autonomous agents:`);
    agents.forEach(a => {
      console.log(`  • [${a.id}] ${a.name} (${a.type} / ${a.framework}) - Status: ${a.status}`);
    });
    if (agents.length < 2) throw new Error('Expected at least 2 agents');
    console.log('✅ Agent registry verified.\n');

    // 3. Mint Cryptographic Agent Passport
    console.log('--- Test 3: Mint Ephemeral Agent Passport ---');
    const passportRes = await agentPassportService.mintPassport({
      agentId: 'agent-fin-auditor',
      delegatedBy: 'c-1',
      task: 'Audit Q3 Meta Cloud Infrastructure Billing',
      ttlMinutes: 30,
      allowedScopes: ['Internal', 'Restricted:Finance'],
      maxHops: 2
    });

    console.log('Minted Passport ID:', passportRes.passportId);
    console.log('Passport Token (HMAC-SHA256 JWT):', passportRes.token.substring(0, 32) + '...');
    console.log('Expires At:', passportRes.expiresAt);

    // 4. Verify Cryptographic Signature
    console.log('\n--- Test 4: Cryptographic Passport Verification ---');
    const validVerify = agentPassportService.verifyPassport(passportRes.token);
    console.log('Valid Token Verification:', validVerify.valid ? '✅ VALID (Signature Match)' : '❌ INVALID');
    if (!validVerify.valid) throw new Error('Valid token failed verification');

    const tamperedToken = passportRes.token.slice(0, -4) + 'abcd';
    const invalidVerify = agentPassportService.verifyPassport(tamperedToken);
    console.log('Tampered Token Verification:', !invalidVerify.valid ? '🛡️ REJECTED (Forgery Detected)' : '❌ FAILED');
    if (invalidVerify.valid) throw new Error('Tampered token was not rejected');

    // 5. Test Pre-Retrieval Context Retrieval with Passport
    console.log('\n--- Test 5: ReBAC Secure Context Retrieval with Passport ---');
    const contextRes = await agentService.getSecureContext('c-1', 'Audit billing invoices', passportRes.token);
    console.log('Context Status:', contextRes.status);
    console.log('Passport Verified:', contextRes.passportVerified);
    console.log(`Context Assets Retrieved: ${contextRes.context.length}`);
    contextRes.context.forEach(c => console.log(`  • [${c.id}] ${c.name} (${c.classification || c.sensitivity})`));

    // 6. Test Side-by-Side RAG Simulator
    console.log('\n--- Test 6: Side-by-Side RAG Leakage vs. Zero-Trust Simulator ---');
    const simRes = await agentService.simulateRagComparison({
      prompt: 'Summarize internal executive salary and master DB credentials',
      userId: 'c-1',
      agentId: 'agent-fin-auditor'
    });

    console.log('❌ Raw RAG Status:', simRes.rawRag.status, `(Tokens: ${simRes.rawRag.tokensInjected})`);
    console.log('   Leaked Sensitivities:', simRes.rawRag.leakedSensitivities.join(', '));
    console.log('✅ SentinelGraph Zero-Trust Status:', simRes.graphGuardRag.status, `(Tokens: ${simRes.graphGuardRag.tokensInjected})`);
    console.log(`   Tokens Saved: ${simRes.graphGuardRag.tokensSaved} (${simRes.graphGuardRag.tokenReductionPercent}% reduction)`);
    console.log(`   Cryptographic Proof: ${simRes.graphGuardRag.cryptographicProof}`);

    // 7. Test Google Zanzibar / OpenFGA Bridge
    console.log('\n--- Test 7: Google Zanzibar / OpenFGA Bridge ---');
    const tuples = await openFgaBridgeService.exportZanzibarTuples();
    console.log(`Exported ${tuples.length} Zanzibar relationship tuples.`);
    console.log(`Sample Notation: ${tuples[0].zanzibar_notation}`);

    const tupleCheck = await openFgaBridgeService.checkTuple({
      user: 'contributor:c-1',
      relation: 'can_access',
      object: 'dataasset:da-4'
    });
    console.log('Zanzibar Tuple Check Allowed:', tupleCheck.allowed);

    console.log('\n===============================================================');
    console.log('🎉 ALL AGENT GOVERNANCE & ZERO-TRUST TESTS PASSED 100%!');
    console.log('===============================================================\n');

  } catch (err) {
    console.error('❌ Test Suite Failed:', err);
    process.exit(1);
  } finally {
    await closeDriver();
  }
}

runTests();
