import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { AutonomousOrchestrator } from './agents/orchestrator.js';

dotenv.config();

const app = express();
app.use(express.json());

// Strict Zod Schema for incoming request validation
export const AnalyzeRequestSchema = z.object({
  query: z.string().min(1, 'query is required and cannot be empty'),
  priority: z.enum(['critical', 'high', 'normal']).default('high'),
  parameters: z.record(z.unknown()).optional().default({}),
});

// Strict Zod Schema for outgoing response contract
export const ConsensusResponseSchema = z.object({
  taskId: z.string(),
  topic: z.string(),
  status: z.enum(['completed', 'verified']),
  consensusScore: z.number().min(0).max(1),
  summary: z.string(),
  subAgentResults: z.object({
    validatorPassed: z.boolean(),
    synthesizerSummary: z.string(),
  }),
  fingerprintSha256: z.string().length(64),
  executedAt: z.string(),
});

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    })
  : null;

const orchestrator = new AutonomousOrchestrator(ai);

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    project: 'vikunja-ghsa-vx5x-727q-9979-pe',
    model: 'gemini-3.8-flash',
    hasApiKey: !!apiKey,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/analyze', async (req: Request, res: Response) => {
  try {
    const parsedInput = AnalyzeRequestSchema.parse(req.body);

    const result = await orchestrator.dispatch({
      id: `task-${Date.now()}`,
      topic: parsedInput.query,
      priority: parsedInput.priority,
      parameters: parsedInput.parameters,
    });

    const validatedOutput = ConsensusResponseSchema.parse(result);
    res.json(validatedOutput);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation Error', details: err.errors });
    }
    res.status(500).json({ error: err.message || 'Execution failed' });
  }
});

const port = Number(process.env.PORT) || 8080;
app.listen(port, () => console.log(`Server active on port ${port}`));
