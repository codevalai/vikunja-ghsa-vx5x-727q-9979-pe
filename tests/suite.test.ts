import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import { AutonomousOrchestrator, ValidatorAgent } from '../src/agents/orchestrator.js';
import { AnalyzeRequestSchema, ConsensusResponseSchema } from '../src/server.js';

test('Zod Schema strictly validates valid inputs', () => {
  const valid = { query: 'Build high-throughput agent mesh', priority: 'critical', parameters: { depth: 3 } };
  const parsed = AnalyzeRequestSchema.parse(valid);
  assert.equal(parsed.query, valid.query);
  assert.equal(parsed.priority, 'critical');
});

test('Zod Schema rejects invalid or empty payloads', () => {
  assert.throws(() => {
    AnalyzeRequestSchema.parse({ query: '', priority: 'invalid_level' });
  }, z.ZodError);
});

test('ValidatorAgent enforces invariant boundaries', async () => {
  const validator = new ValidatorAgent();
  const res = await validator.validate({ id: 't1', topic: 'Valid topic', priority: 'high', parameters: {} });
  assert.equal(res.passed, true);

  const failRes = await validator.validate({ id: 't2', topic: '', priority: 'high', parameters: {} });
  assert.equal(failRes.passed, false);
});

test('AutonomousOrchestrator dispatches task and preserves consensus receipt', async () => {
  const orchestrator = new AutonomousOrchestrator(null);
  const receipt = await orchestrator.dispatch({
    id: 'test-task-001',
    topic: 'Permissive cross-origin resource sharing in pkg/routes/router.go allowing unauthorized origins to read task lists and session secrets',
    priority: 'high',
    parameters: { depth: 2, verifyIntegrity: true },
  });

  assert.equal(receipt.status, 'verified');
  assert.equal(receipt.subAgentResults.validatorPassed, true);
  assert.ok(receipt.consensusScore >= 0.95);
  assert.match(receipt.fingerprintSha256, /^[a-f0-9]{64}$/);
  assert.equal(orchestrator.getAuditTrail().length, 1);

  const validated = ConsensusResponseSchema.parse(receipt);
  assert.equal(validated.taskId, 'test-task-001');
});
