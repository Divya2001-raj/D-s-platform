import express from 'express';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '4mb' }));

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function handleGeminiError(res: express.Response, err: unknown) {
  console.error('Gemini API error:', err);
  const message = err instanceof Error ? err.message : 'Unexpected Gemini API error';
  const status = message.includes('GEMINI_API_KEY') ? 500 : 502;
  res.status(status).json({ error: message });
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'data-engineer-360' });
});

// 1. Global Context-Aware Gemini AI Copilot (SSE Streaming + JSON fallback)
app.post('/api/ai/copilot', async (req, res) => {
  try {
    const ai = getGeminiClient();
    const {
      messages = [],
      context = {},
      stream = true,
      mode = 'coach',
    } = req.body as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
      context?: {
        view?: string;
        title?: string;
        domain?: string;
        experienceTier?: string;
        code?: string;
        errorOutput?: string;
        schema?: string;
        extra?: string;
      };
      stream?: boolean;
      mode?: 'coach' | 'hint' | 'debug' | 'explain_plan' | 'solution';
    };

    const systemInstruction = `You are the Senior Staff Data Engineer Copilot inside "D's platforms — DATA ENGINEER 360".
You coach experienced Data Engineers (3-6+ YOE) preparing for Tier 1 global and Indian product company interviews.

LIVE WORKSPACE CONTEXT:
- Active Screen: ${context.view || 'Dashboard'}
- Topic / Problem Title: ${context.title || 'General Data Engineering'}
- Domain: ${context.domain || 'Data Engineering'}
- Target Experience Tier: ${context.experienceTier || '4-6 yrs'}
- Setup Schema / Env: ${context.schema ? context.schema.slice(0, 3000) : 'None provided'}
- User Current Code / Query: ${context.code ? context.code.slice(0, 4000) : 'None provided'}
- Latest Execution / Test Error Output: ${context.errorOutput ? context.errorOutput.slice(0, 2000) : 'None'}
- Additional Context: ${context.extra ? context.extra.slice(0, 2000) : 'None'}

OPERATING RULES:
1. Mode is "${mode}". If the user is on a coding/SQL problem and asks for help without explicitly asking for the full answer, provide progressive Socratic hints first (identifying the pattern, edge case, or bottleneck) before spoiling the complete solution. If mode is "solution" or the user explicitly asks for the full solution, provide an optimal, production-grade solution with complexity and trade-off analysis.
2. For SQL EXPLAIN plans, highlight full table scans, sort/temp B-trees, missing composite indexes, join order, and window frame partitioning.
3. For PySpark/Distributed Systems, discuss shuffle partitions, skew salting, AQE, broadcast thresholds, memory spill, and Iceberg/Delta Lakehouse internals.
4. Format responses cleanly in Markdown with syntax-highlighted code blocks (\`\`\`sql, \`\`\`python, \`\`\`yaml). Be crisp, deeply technical, and practical.`;

    const formattedHistory = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-4-hydrogen',
        contents: formattedHistory,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        },
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ delta: chunk.text })}\n\n`);
        }
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      return;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: formattedHistory,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
      },
    });

    res.json({ text: response.text ?? '' });
  } catch (err) {
    if (!res.headersSent) {
      handleGeminiError(res, err);
    } else {
      res.write(`data: ${JSON.stringify({ error: err instanceof Error ? err.message : 'Stream failed' })}\n\n`);
      res.end();
    }
  }
});

// 2. One-Click "Generate Practice Batch" Engine (5 or 10 runnable questions)
app.post('/api/ai/generate-batch', async (req, res) => {
  try {
    const ai = getGeminiClient();
    const {
      count = 5,
      domain = 'Analytical SQL',
      topic = 'Window Functions',
      roadmapTrack = 'Analytical SQL Mastery',
      company = 'Tier 1 Product',
      experienceLevel = '4-6 yrs',
      roundType = 'SQL Coding',
    } = req.body as {
      count?: number;
      domain?: string;
      topic?: string;
      roadmapTrack?: string;
      company?: string;
      experienceLevel?: '3-4 yrs' | '4-6 yrs' | '6+ yrs';
      roundType?: string;
    };

    const safeCount = Math.min(Math.max(Number(count) || 5, 1), 10);
    const isSql = domain.toLowerCase().includes('sql') || roundType.toLowerCase().includes('sql');

    const prompt = `Generate exactly ${safeCount} original, realistic, high-signal Data Engineering interview practice problems.
Target Context:
- Domain: ${domain}
- Topic / Pattern: ${topic}
- Roadmap Track: ${roadmapTrack}
- Company Style Inspiration (do NOT claim verbatim leaked question): ${company}
- Experience Tier: ${experienceLevel}
- Round Type: ${roundType}

REQUIREMENTS:
1. Every question MUST be completely runnable in-browser:
   - If SQL (${isSql}): provide valid SQLite DDL + INSERT statements in "setupSchemaOrEnv" (2-3 realistic tables with 5-10 rows each, edge cases like NULLs, ties, duplicates), a helpful "starterCode" SELECT skeleton, a working SQLite solution in "detailedSolution", and deterministic "expectedOutput" JSON string or markdown preview + testCases array where each testCase has { name, inputSetup, expectedRowsJson }.
   - If Python / DSA / PySpark / Engineering Lab: provide Python 3 setup or PySpark/pipeline helper environment in "setupSchemaOrEnv", clean starterCode function signature, working Python 3 solution in "detailedSolution", and executable assertion testCases.
2. Include "executionPlanNotes" explaining index/join/complexity characteristics.
3. Return ONLY valid JSON matching the schema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction: 'You are a Principal Data Engineer creating rigorous, executable interview practice problems. Never fabricate leaked interview attribution; all generated items are original practice problems.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              problemStatement: { type: Type.STRING },
              subtopic: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              setupSchemaOrEnv: { type: Type.STRING },
              sampleInput: { type: Type.STRING },
              expectedOutput: { type: Type.STRING },
              starterCode: { type: Type.STRING },
              detailedSolution: { type: Type.STRING },
              alternativeApproaches: { type: Type.STRING },
              explanation: { type: Type.STRING },
              practicalRelevance: { type: Type.STRING },
              executionPlanNotes: { type: Type.STRING },
              testCases: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    input: { type: Type.STRING },
                    expected: { type: Type.STRING },
                  },
                },
              },
            },
            required: [
              'title',
              'problemStatement',
              'difficulty',
              'setupSchemaOrEnv',
              'starterCode',
              'detailedSolution',
              'explanation',
            ],
          },
        },
      },
    });

    const raw = JSON.parse((response.text ?? '[]').trim()) as Array<Record<string, unknown>>;
    const stamp = Date.now();
    const normalized = raw.map((item, idx) => ({
      uniqueId: `ai_batch_${stamp}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      title: String(item.title || `${topic} Practice #${idx + 1}`),
      problemStatement: String(item.problemStatement || ''),
      domain,
      topic,
      subtopic: String(item.subtopic || topic),
      roadmapTracks: [roadmapTrack],
      difficulty: item.difficulty === 'Easy' || item.difficulty === 'Hard' ? item.difficulty : 'Medium',
      experienceLevel,
      companyTags: company && company !== 'Tier 1 Product' ? [company] : ['Google', 'Databricks', 'Uber'],
      roundType,
      sourceType: 'ai_generated_practice' as const,
      sourceReference: `AI-Generated Practice · ${topic} (${experienceLevel})`,
      setupSchemaOrEnv: String(item.setupSchemaOrEnv || ''),
      sampleInput: String(item.sampleInput || ''),
      expectedOutput: String(item.expectedOutput || ''),
      testCases: Array.isArray(item.testCases) ? item.testCases.slice(0, 10) : [],
      starterCode: String(item.starterCode || ''),
      detailedSolution: String(item.detailedSolution || ''),
      alternativeApproaches: String(item.alternativeApproaches || ''),
      explanation: String(item.explanation || ''),
      practicalRelevance: String(item.practicalRelevance || ''),
      relatedLearningId: '',
      executionPlanNotes: String(item.executionPlanNotes || ''),
    }));

    res.json({ questions: normalized });
  } catch (err) {
    handleGeminiError(res, err);
  }
});

// 3. AI Mock & Voice Interviewer
app.post('/api/ai/mock-interview', async (req, res) => {
  try {
    const ai = getGeminiClient();
    const {
      company = 'Uber',
      role = 'Senior Data Engineer',
      experienceTier = '4-6 yrs',
      roundType = 'System Design & Lakehouse Architecture',
      transcript = [],
      userResponse = '',
      finishInterview = false,
    } = req.body as {
      company?: string;
      role?: string;
      experienceTier?: string;
      roundType?: string;
      transcript?: Array<{ role: 'interviewer' | 'candidate'; text: string }>;
      userResponse?: string;
      finishInterview?: boolean;
    };

    const prompt = finishInterview
      ? `You are wrapping up a ${roundType} mock interview for a ${role} (${experienceTier}) candidate targeting ${company}.
Review the full transcript below and produce a rigorous, constructive interview debrief:
${transcript.map((t) => `${t.role.toUpperCase()}: ${t.text}`).join('\n')}
Latest candidate response: ${userResponse}`
      : `You are a Principal Data Engineer conducting a realistic ${roundType} interview at ${company} for a ${role} (${experienceTier} YOE).
Conversation so far:
${transcript.map((t) => `${t.role.toUpperCase()}: ${t.text}`).join('\n')}
Candidate just said: "${userResponse || 'Ready to begin the interview.'}"

Respond as the interviewer:
1. If this is the opening turn (empty transcript), introduce the round concisely and ask one crisp, realistic Tier-1 opening question tailored to ${company} and ${roundType}.
2. Otherwise, probe deeper with a dynamic technical follow-up (e.g., ask about backpressure, skew, late-arriving data, SLAs, cost trade-offs, failure recovery, or schema evolution) based specifically on what the candidate said.
3. Provide concise live rubric feedback on their latest answer.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction: 'Act as a sharp, realistic Tier-1 Staff Data Engineering interviewer. Never claim readiness scores guarantee job offers; frame scores as practice feedback.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            interviewerMessage: { type: Type.STRING },
            followUpFocus: { type: Type.STRING },
            rubricScore: { type: Type.NUMBER },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            gapsToProbe: { type: Type.ARRAY, items: { type: Type.STRING } },
            modelAnswerOutline: { type: Type.STRING },
          },
          required: ['interviewerMessage', 'followUpFocus', 'rubricScore', 'strengths', 'gapsToProbe'],
        },
      },
    });

    const data = JSON.parse((response.text ?? '{}').trim());
    res.json(data);
  } catch (err) {
    handleGeminiError(res, err);
  }
});

// 4. Job Description (JD) Analyser
app.post('/api/ai/analyze-jd', async (req, res) => {
  try {
    const ai = getGeminiClient();
    const { jdText = '', experienceTier = '4-6 yrs', currentSkills = [] } = req.body as {
      jdText: string;
      experienceTier?: string;
      currentSkills?: string[];
    };

    if (!jdText.trim()) {
      res.status(400).json({ error: 'Job description text is required.' });
      return;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Analyze this Data Engineering Job Description for a candidate at ${experienceTier} experience.
Candidate's current known strengths: ${currentSkills.join(', ') || 'SQL, Python, Spark'}.

JOB DESCRIPTION:
${jdText.slice(0, 12000)}`,
      config: {
        systemInstruction: 'You are an expert Data Engineering Career & Technical Bar Analyst. Extract concrete technical requirements, map gaps against Tier-1 interview expectations, and create a prioritized study plan.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            targetRole: { type: Type.STRING },
            detectedCompany: { type: Type.STRING },
            seniorityAssessment: { type: Type.STRING },
            extractedSkills: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  skill: { type: Type.STRING },
                  category: { type: Type.STRING },
                  priority: { type: Type.STRING },
                },
              },
            },
            gapAnalysis: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  area: { type: Type.STRING },
                  gapSeverity: { type: Type.STRING },
                  actionableFix: { type: Type.STRING },
                },
              },
            },
            recommendedTracks: { type: Type.ARRAY, items: { type: Type.STRING } },
            weekByWeekPlan: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  week: { type: Type.STRING },
                  focus: { type: Type.STRING },
                  deliverables: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
              },
            },
          },
          required: ['targetRole', 'seniorityAssessment', 'extractedSkills', 'gapAnalysis', 'recommendedTracks', 'weekByWeekPlan'],
        },
      },
    });

    res.json(JSON.parse((response.text ?? '{}').trim()));
  } catch (err) {
    handleGeminiError(res, err);
  }
});

// 5. System Design Review & Project Deep Dive Generator
app.post('/api/ai/deep-dive', async (req, res) => {
  try {
    const ai = getGeminiClient();
    const {
      mode = 'system_design_review',
      title = '',
      summary = '',
      scaleMetrics = '',
      techStack = '',
      nodes = [],
    } = req.body as {
      mode?: 'system_design_review' | 'project_deep_dive';
      title?: string;
      summary?: string;
      scaleMetrics?: string;
      techStack?: string;
      nodes?: Array<{ label: string; category: string }>;
    };

    const prompt =
      mode === 'system_design_review'
        ? `Perform a Staff Data Engineer architecture review on this System Design:
Title: ${title}
Components on Canvas: ${nodes.map((n) => `${n.label} (${n.category})`).join(', ') || 'Not specified'}
Scale / SLAs: ${scaleMetrics}
Architecture Notes: ${summary}

Evaluate bottlenecks, single points of failure, backpressure, late-arriving data handling, idempotency, cost/FinOps optimizations, and 5 probing Staff-level follow-up questions.`
        : `Generate a comprehensive Tier-1 Interview "Project Deep Dive" defense brief for this candidate project:
Project Title: ${title}
Tech Stack: ${techStack}
Scale & Impact Metrics: ${scaleMetrics}
Architecture & Challenges Summary: ${summary}

Produce:
1. Executive 90-second pitch
2. End-to-end architecture walkthrough & trade-off justifications ("Why X over Y?")
3. Failure modes & production war stories to emphasize
4. 6 hard technical follow-up questions interviewers will ask + crisp model answers.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction: 'You are a Principal Data Architect. Provide crisp, deeply practical engineering analysis in clean Markdown.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      },
    });

    res.json({ markdown: response.text ?? '' });
  } catch (err) {
    handleGeminiError(res, err);
  }
});

async function startServer() {
  const port = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`D's platforms — DATA ENGINEER 360 listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
