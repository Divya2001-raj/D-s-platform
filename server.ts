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
  let message = err instanceof Error ? err.message : 'Unexpected Gemini API error';
  let status = message.includes('GEMINI_API_KEY') ? 500 : 502;
  try {
    const parsed = JSON.parse(message) as { error?: { code?: number; message?: string; status?: string } };
    if (parsed?.error?.message) {
      message = parsed.error.message;
      if (parsed.error.code === 429 || parsed.error.status === 'RESOURCE_EXHAUSTED') {
        status = 429;
        message = 'Gemini API quota/rate limit reached. Please wait a moment or check your API billing plan, or use the direct 24-hour ATS links.';
      }
    }
  } catch {
    if (message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
      status = 429;
      message = 'Gemini API quota/rate limit reached. Please wait a moment or use the direct 24-hour ATS links.';
    }
  }
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

// 2. One-Click "Generate Practice Batch" Engine (5 or 10 authentic questions with >=6 test cases)
app.post('/api/ai/generate-batch', async (req, res) => {
  try {
    const ai = getGeminiClient();
    const {
      count = 5,
      domain = 'Analytical SQL',
      topic = 'Window Functions',
      roadmapTrack = 'Analytical SQL Mastery',
      company = 'Uber',
      experienceLevel = '4-6 yrs',
      roundType = 'SQL Coding',
      excludeTitles = [],
    } = req.body as {
      count?: number;
      domain?: string;
      topic?: string;
      roadmapTrack?: string;
      company?: string;
      experienceLevel?: '3-4 yrs' | '4-6 yrs' | '6+ yrs';
      roundType?: string;
      excludeTitles?: string[];
    };

    const safeCount = Math.min(Math.max(Number(count) || 5, 1), 10);
    const isSql = domain.toLowerCase().includes('sql') || roundType.toLowerCase().includes('sql');

    const prompt = `Generate exactly ${safeCount} authentic, documented Tier-1 company Data Engineering interview questions matching real candidate loops (ZERO generic or toy textbook problems).
Target Context:
- Domain: ${domain}
- Topic / Pattern: ${topic}
- Roadmap Track: ${roadmapTrack}
- Target Company Loop: ${company}
- Experience Tier: ${experienceLevel}
- Round Type: ${roundType}
- Already In Catalog (DO NOT REPEAT): ${excludeTitles.slice(0, 60).join(' | ') || 'None'}

REQUIREMENTS:
1. Every question MUST be grounded in realistic production schemas and documented interview loops (specify "askedContext", e.g., "Asked in ${company} ${experienceLevel} Technical Screen").
2. Every question MUST include AT LEAST 6 executable test cases in "testCases" covering happy path, tie-breaking, NULL keys, duplicates, extreme values, and boundary cases.
3. If SQL (${isSql}): provide valid SQLite DDL + INSERT statements in "setupSchemaOrEnv" (2-3 realistic tables with 8-15 rows each including edge cases), a clean boilerplate "starterCode" SELECT skeleton (never containing the answer), a working SQLite query in "detailedSolution", and deterministic "expectedOutput".
4. If Python / DSA / PySpark / Engineering Lab: provide Python 3 setup in "setupSchemaOrEnv", clean "starterCode" signature, working Python 3 "detailedSolution", and >= 6 Python "assert ..." expressions in "testCases".
5. Include "executionPlanNotes" explaining index/join/complexity characteristics.
6. Return ONLY valid JSON matching the schema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction: 'You are a Principal Data Engineer curating authentic, documented Tier-1 Data Engineering interview loops with 6+ executable edge-case tests per question.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              askedContext: { type: Type.STRING },
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
              'askedContext',
              'problemStatement',
              'difficulty',
              'setupSchemaOrEnv',
              'starterCode',
              'detailedSolution',
              'explanation',
              'testCases',
            ],
          },
        },
      },
    });

    const excludeSet = new Set(
      (Array.isArray(excludeTitles) ? excludeTitles : []).map((t) =>
        String(t || '')
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, ' '),
      ),
    );

    const raw = JSON.parse((response.text ?? '[]').trim()) as Array<Record<string, unknown>>;
    const stamp = Date.now();
    const seenBatchTitles = new Set<string>();
    const normalized = raw
      .filter((item) => {
        const norm = String(item.title || '')
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, ' ');
        if (!norm || excludeSet.has(norm) || seenBatchTitles.has(norm)) return false;
        seenBatchTitles.add(norm);
        return true;
      })
      .map((item, idx) => ({
        uniqueId: `ai_batch_${stamp}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
        title: String(item.title || `${company} ${topic} #${idx + 1}`),
        problemStatement: String(item.problemStatement || ''),
        domain,
        topic,
        subtopic: String(item.subtopic || topic),
        roadmapTracks: [roadmapTrack],
        difficulty: item.difficulty === 'Easy' || item.difficulty === 'Hard' ? item.difficulty : 'Medium',
        experienceLevel,
        companyTags: company && company !== 'Tier 1 Product' ? [company] : ['Google', 'Databricks', 'Uber'],
        roundType,
        sourceType: 'verified_interview' as const,
        askedContext: String(item.askedContext || `Asked in ${company} ${experienceLevel} ${roundType} Loop`),
        sourceReference: String(item.askedContext || `Asked in ${company} ${experienceLevel} ${roundType} Loop`),
        setupSchemaOrEnv: String(item.setupSchemaOrEnv || ''),
        sampleInput: String(item.sampleInput || ''),
        expectedOutput: String(item.expectedOutput || ''),
        testCases: Array.isArray(item.testCases) ? item.testCases.slice(0, 12) : [],
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

// 2b. System Design Phase-1 Requirement Clarification ("Ask the Interviewer")
app.post('/api/ai/design-clarify', async (req, res) => {
  const {
    questionTitle = 'End-to-End Data System Design',
    questionPrompt = '',
    userQuestion = '',
    currentPhase = 'Requirement Clarification',
  } = req.body as {
    questionTitle?: string;
    questionPrompt?: string;
    userQuestion?: string;
    currentPhase?: string;
  };

  if (!userQuestion.trim()) {
    res.status(400).json({ error: 'Clarification question is required.' });
    return;
  }

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `You are the Staff Data Engineering interviewer for "${questionTitle}".
Problem brief: ${questionPrompt.slice(0, 1500)}
Current studio phase: ${currentPhase}
Candidate's clarification question: "${userQuestion.slice(0, 600)}"

Give crisp, realistic engineering numbers & constraints ONLY (throughput events/sec, peak multiplier, p99 latency SLA, late-arrival window, retention, deduplication rules, PII constraints, monthly budget target). DO NOT reveal the solution architecture.`,
      config: {
        systemInstruction:
          'Act as a realistic Tier-1 Staff Data Engineering interviewer answering Phase 1 requirement clarifications with concrete scale/SLA numbers and never spoiling the final architecture.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });
    res.json({ answer: (response.text ?? '').trim() });
  } catch (err) {
    handleGeminiError(res, err);
  }
});

// 3. Company-Wise Live AI Mock Interviewer + Hiring Committee Scorecard
app.post('/api/ai/mock-interview', async (req, res) => {
  try {
    const ai = getGeminiClient();
    const {
      company = 'Uber',
      role = 'Senior Data Engineer',
      experienceTier = '4-6 yrs',
      roundType = 'System Design & Lakehouse Architecture',
      currentPhase = 'Clarification',
      activeQuestionTitle = '',
      activeQuestionPrompt = '',
      liveCode = '',
      testPassSummary = '',
      transcript = [],
      userResponse = '',
      finishInterview = false,
    } = req.body as {
      company?: string;
      role?: string;
      experienceTier?: string;
      roundType?: string;
      currentPhase?: string;
      activeQuestionTitle?: string;
      activeQuestionPrompt?: string;
      liveCode?: string;
      testPassSummary?: string;
      transcript?: Array<{ role: 'interviewer' | 'candidate'; text: string }>;
      userResponse?: string;
      finishInterview?: boolean;
    };

    const prompt = finishInterview
      ? `You are the ${company} Hiring Committee Lead wrapping up a ${roundType} mock interview for a ${role} (${experienceTier}) candidate.
Active Interview Question: ${activeQuestionTitle || roundType}
Latest Candidate Workspace Code / Response:
${liveCode ? liveCode.slice(0, 3500) : 'No workspace code submitted.'}
Automated Test Suite Status: ${testPassSummary || 'Not run'}

Full Transcript:
${transcript.map((t) => `${t.role.toUpperCase()}: ${t.text}`).join('\n')}
Final candidate closing note: ${userResponse || 'Completed round.'}

Generate a strict, calibrated ${company} Hiring Committee Scorecard across all 5 rubric axes (scale 1 to 4 where 1=No Hire, 2=Lean No, 3=Hire, 4=Strong Hire) and an overall verdict ('Strong Hire' | 'Hire' | 'Lean Hire' | 'No Hire').`
      : `You are a Principal Data Engineer at ${company} conducting a live 45-minute ${roundType} interview for a ${role} (${experienceTier} YOE).
Current Interview Phase: ${currentPhase}
Active Question In Candidate Workspace: ${activeQuestionTitle || roundType}
Question Prompt Summary: ${activeQuestionPrompt ? activeQuestionPrompt.slice(0, 1200) : roundType}
Candidate's Live Editor Code / Notes:
${liveCode ? liveCode.slice(0, 3000) : '(empty workspace)'}
Latest Automated Test Suite Output: ${testPassSummary || 'No test run yet'}

Conversation so far:
${transcript.map((t) => `${t.role.toUpperCase()}: ${t.text}`).join('\n')}
Candidate just said: "${userResponse || 'Ready to begin the interview.'}"

Respond naturally as a sharp ${company} bar-raiser:
1. If opening turn (empty transcript), greet the candidate concisely in ${company}'s style, introduce the problem "${activeQuestionTitle || roundType}" currently loaded in their editor, and ask them to clarify grain/constraints before coding or designing.
2. Otherwise, reference specifics from their LIVE editor code / test results AND verbal explanation. Probe one targeted follow-up (e.g., tie-breaking, NULLs, shuffle skew, late watermarks, CDC tombstones, or FinOps scaling).
3. Give crisp live rubric coaching notes.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction: `Act as an authentic, bar-raising ${company} Staff Data Engineering interviewer. Reference candidate code directly when present. Be direct, demanding, and constructive.`,
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
            scorecard: {
              type: Type.OBJECT,
              properties: {
                verdict: { type: Type.STRING },
                overallScore: { type: Type.NUMBER },
                companyBarFeedback: { type: Type.STRING },
                weakAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
                recommendedRoundSlugs: { type: Type.ARRAY, items: { type: Type.STRING } },
                axes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      axis: { type: Type.STRING },
                      score: { type: Type.NUMBER },
                      feedback: { type: Type.STRING },
                    },
                  },
                },
              },
            },
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

// 3b. Broad Live Data Engineer Job Radar (3+ YOE) across ALL companies & DE role families
app.post('/api/jobs/radar', async (req, res) => {
  try {
    const ai = getGeminiClient();
    const {
      roleTrack = 'All Roles',
      companyTier = 'All Companies',
      workMode = 'All',
      techStack = [],
      postedRecency = 'Last 7 Days',
      yoe = '3+ YOE',
      focusCompanies = [],
    } = req.body as {
      roleTrack?: string;
      companyTier?: string;
      workMode?: string;
      techStack?: string[];
      postedRecency?: string;
      yoe?: string;
      focusCompanies?: string[];
    };

    const roleScope =
      roleTrack && roleTrack !== 'All Roles'
        ? roleTrack
        : 'Data Engineer, Data Engineer II, Senior Data Engineer, Staff Data Engineer, Analytics Engineer, dbt Engineer, BI Data Engineer, Data Platform Engineer, Lakehouse Engineer, Big Data Engineer, Spark/Streaming Engineer, Cloud Data Engineer (AWS/Azure/GCP), Snowflake Engineer, Databricks Engineer, ETL/ELT Engineer, AI/ML Data Engineer';

    const companyScope = focusCompanies.length
      ? focusCompanies.join(', ')
      : companyTier === 'Tier 1 Tech'
        ? 'Google, Amazon, Microsoft, Meta, Netflix, Uber, Databricks, Snowflake, Stripe, Atlassian, Airbnb, LinkedIn, Apple, Salesforce'
        : companyTier === 'Tier 2 & Unicorns'
          ? 'Flipkart, PhonePe, Swiggy, Zomato, Razorpay, CRED, Meesho, Zepto, Groww, Zerodha, Postman, Freshworks, Myntra, Nykaa, Dream11, Confluent, Fivetran'
          : companyTier === 'Startups & GCCs'
            ? 'Walmart Global Tech, Target India, Lowes India, Goldman Sachs, JPMorgan, Visa, Mastercard, PayPal, Intuit, Wells Fargo, Morgan Stanley, Tiger Analytics, Fractal, high-growth AI startups'
            : 'ALL active employers hiring 3+ YOE Data Engineers across Global Big Tech, Tier-1/2 Product companies, Unicorns, GCCs, Fintech/SaaS, AI Startups, and Enterprise Tech hubs';

    const techFilter = Array.isArray(techStack) && techStack.length > 0 ? `Required/matching stack focus: ${techStack.join(', ')}.` : '';

    const prompt = `Search the live web using Google Search right now (${postedRecency}) for ACTIVE Data Engineering openings (${workMode === 'All' ? 'India, Bengaluru, Remote, Hybrid & Global Remote' : workMode}) requiring ${yoe} experience.
Role Tracks to search broadly: ${roleScope}
Employer Scope (${companyTier}): ${companyScope}
${techFilter}

Scan official company career portals, Greenhouse, Lever, Ashby, Workday, SmartRecruiters, Wellfound, LinkedIn Jobs, and Naukri.

CRITICAL ANTI-FABRICATION RULES:
- Return ONLY real job postings you actually discovered in Google Search results right now.
- Every posting's "applyUrl" MUST be a real, clickable URL from the search results (never invent or guess a fake job ID or placeholder URL).
- Classify each company accurately as "Tier 1", "Tier 2", or "High-Growth / GCC".
- Set "roleCategory" to the best matching category ("Core Data Engineer", "Analytics / dbt Engineer", "Platform / Big Data", "Cloud / Snowflake / Databricks", or "AI/ML Data Engineer").
- Return your final answer as a single valid JSON object inside \`\`\`json ... \`\`\` with the shape:
{
  "postings": [
    {
      "id": "unique-slug",
      "company": "Company Name",
      "tier": "Tier 1" | "Tier 2" | "High-Growth / GCC",
      "roleCategory": "Core Data Engineer",
      "title": "Exact Role Title",
      "location": "Bengaluru / Remote / Hyderabad / Pune / Gurgaon",
      "workMode": "Remote" | "Hybrid" | "Onsite",
      "yoeRequired": "3-6 yrs",
      "postedLabel": "e.g. 24h ago or 3 days ago",
      "skills": ["SQL", "PySpark", "Snowflake", "AWS"],
      "applyUrl": "exact-verified-url-from-search",
      "sourceDomain": "greenhouse.io / careers.google.com / linkedin.com / lever.co",
      "salaryOrBand": "optional compensation or band",
      "practiceCompany": "matching company name for loop prep"
    }
  ]
}
Include 12 to 18 distinct verified active postings across diverse companies if available in search results.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          'You are a Live Data Engineering Career Radar agent using Google Search grounding across ALL product companies, GCCs, startups, and enterprises. Never fabricate URLs, job titles, or posting dates. Every applyUrl must come from actual retrieved web pages.',
        tools: [{ googleSearch: {} }],
      },
    });

    const rawText = (response.text ?? '').trim();
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const groundingSources = groundingChunks
      .filter((c) => c.web?.uri)
      .map((c) => ({
        title: String(c.web?.title || 'Verified Job Source'),
        uri: String(c.web?.uri || ''),
      }));

    let parsedPostings: Array<Record<string, unknown>> = [];
    const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/i) || rawText.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      try {
        const obj = JSON.parse(jsonMatch[1].trim()) as { postings?: Array<Record<string, unknown>> };
        if (Array.isArray(obj.postings)) {
          parsedPostings = obj.postings;
        }
      } catch {
        // Fallback if partial JSON
      }
    }

    const verifiedUris = new Set(groundingSources.map((g) => g.uri));
    const postings = parsedPostings
      .filter((p) => typeof p.applyUrl === 'string' && /^https?:\/\//i.test(String(p.applyUrl)))
      .map((p, idx) => {
        const rawUrl = String(p.applyUrl);
        const matchingChunk = groundingSources.find(
          (g) => g.uri === rawUrl || rawUrl.includes(g.uri) || g.uri.includes(rawUrl),
        );
        const safeUrl = verifiedUris.has(rawUrl)
          ? rawUrl
          : matchingChunk?.uri || rawUrl;
        let domain = String(p.sourceDomain || '');
        if (!domain) {
          try {
            domain = new URL(safeUrl).hostname.replace(/^www\./, '');
          } catch {
            domain = 'careers';
          }
        }
        const normalizedTier =
          p.tier === 'Tier 2'
            ? 'Tier 2'
            : p.tier === 'High-Growth / GCC'
              ? 'High-Growth / GCC'
              : 'Tier 1';
        return {
          id: String(p.id || `job_${Date.now()}_${idx}`),
          company: String(p.company || 'Tech Employer'),
          tier: normalizedTier,
          roleCategory: String(p.roleCategory || 'Core Data Engineer'),
          title: String(p.title || 'Senior Data Engineer'),
          location: String(p.location || 'Bengaluru, India'),
          workMode: p.workMode === 'Remote' || p.workMode === 'Onsite' ? p.workMode : 'Hybrid',
          yoeRequired: String(p.yoeRequired || yoe),
          postedLabel: String(p.postedLabel || 'Active Search Match'),
          skills: Array.isArray(p.skills) ? p.skills.slice(0, 6).map(String) : ['SQL', 'Spark', 'Snowflake'],
          applyUrl: safeUrl,
          sourceDomain: domain,
          salaryOrBand: p.salaryOrBand ? String(p.salaryOrBand) : '',
          practiceCompany: String(p.practiceCompany || p.company || 'Amazon'),
          verifiedGrounded: Boolean(matchingChunk || verifiedUris.has(rawUrl)),
        };
      });

    res.json({
      scannedAt: new Date().toISOString(),
      postings,
      groundingSources,
      rawSummary: postings.length === 0 ? rawText.slice(0, 800) : undefined,
    });
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

// 6. On-Demand Knowledge Hub Topic Deep-Dive Generator
app.post('/api/ai/generate-topic', async (req, res) => {
  try {
    const ai = getGeminiClient();
    const {
      topicSlug = 'window-functions',
      topicTitle = 'Window Functions',
      domain = 'Data Engineering',
    } = req.body as {
      topicSlug?: string;
      topicTitle?: string;
      domain?: string;
    };

    const cleanSlug = String(topicSlug || 'topic')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const prompt = `Generate a comprehensive, production-grade Staff Data Engineering technical reference module for the topic "${topicTitle}" (slug: "${cleanSlug}", domain: "${domain}").
Target audience: Experienced Data Engineers (3-6+ YOE) preparing for Tier 1 interviews (Databricks, Snowflake, Google, Meta, Uber, Netflix, Stripe, Flipkart, PhonePe).

REQUIREMENTS:
- Ground concepts accurately in official documentation and production realities.
- Include working code/config examples in "codeAndConfigExamples" (SQL, PySpark, Iceberg/Kafka/Terraform configs as applicable).
- Include 4-6 architecture diagram nodes (layer MUST be one of: Source, Ingest, Compute, Storage, Serving, Governance) and connecting edges.
- Include 5 high-signal active-recall flashcards and 8 rigorous 3+ YOE production-scenario multiple-choice quiz questions (with 4 options each, correctIndex 0..3, explanation, and optionRationales explaining why each of the 4 options is right or wrong).
- Return ONLY valid JSON matching the exact schema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          'You are a Principal Data Architect authoring deep-dive technical guides for D\'s platforms — DATA ENGINEER 360. Be crisp, accurate, and concrete with zero fluff.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            domain: { type: Type.STRING },
            summary: { type: Type.STRING },
            officialDocRefAndVersion: { type: Type.STRING },
            estimatedMinutes: { type: Type.NUMBER },
            sections: {
              type: Type.OBJECT,
              properties: {
                introAndDefinition: { type: Type.STRING },
                whyItExists: { type: Type.STRING },
                problemsSolved: { type: Type.STRING },
                underlyingPrinciples: { type: Type.STRING },
                architectureAndComponents: { type: Type.STRING },
                internalWorking: { type: Type.STRING },
                executionFlow: { type: Type.STRING },
                typesAndClassifications: { type: Type.STRING },
                variationsComparison: { type: Type.STRING },
                industryUseCases: { type: Type.STRING },
                productionImplementation: { type: Type.STRING },
                codeAndConfigExamples: { type: Type.STRING },
                architectureDiagramMermaid: { type: Type.STRING },
                stepByStepGuide: { type: Type.STRING },
                expectedOutputs: { type: Type.STRING },
                advantagesLimitations: { type: Type.STRING },
                performanceScalabilityCost: { type: Type.STRING },
                techComparisons: { type: Type.STRING },
                bestPractices: { type: Type.STRING },
                commonMistakes: { type: Type.STRING },
                troubleshooting: { type: Type.STRING },
                productionChallenges: { type: Type.STRING },
                advancedConcepts: { type: Type.STRING },
                interviewQaAndFollowups: { type: Type.STRING },
                companySpecificNotes: { type: Type.STRING },
                quickRevisionCheatSheet: { type: Type.STRING },
                terminology: { type: Type.STRING },
              },
              required: [
                'introAndDefinition',
                'whyItExists',
                'problemsSolved',
                'underlyingPrinciples',
                'architectureAndComponents',
                'internalWorking',
                'executionFlow',
                'productionImplementation',
                'codeAndConfigExamples',
                'stepByStepGuide',
                'expectedOutputs',
                'performanceScalabilityCost',
                'techComparisons',
                'bestPractices',
                'commonMistakes',
                'troubleshooting',
                'productionChallenges',
                'advancedConcepts',
                'interviewQaAndFollowups',
                'companySpecificNotes',
                'quickRevisionCheatSheet',
                'terminology',
              ],
            },
            diagramNodes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  layer: { type: Type.STRING },
                  detail: { type: Type.STRING },
                },
                required: ['id', 'label', 'layer', 'detail'],
              },
            },
            diagramEdges: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  from: { type: Type.STRING },
                  to: { type: Type.STRING },
                  label: { type: Type.STRING },
                },
                required: ['from', 'to', 'label'],
              },
            },
            flashcards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  front: { type: Type.STRING },
                  back: { type: Type.STRING },
                },
                required: ['front', 'back'],
              },
            },
            quiz: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctIndex: { type: Type.NUMBER },
                  explanation: { type: Type.STRING },
                  optionRationales: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['question', 'options', 'correctIndex', 'explanation'],
              },
            },
          },
          required: [
            'title',
            'domain',
            'summary',
            'officialDocRefAndVersion',
            'estimatedMinutes',
            'sections',
            'diagramNodes',
            'diagramEdges',
            'flashcards',
            'quiz',
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim()) as Record<string, unknown>;
    const validLayers = new Set(['Source', 'Ingest', 'Compute', 'Storage', 'Serving', 'Governance']);
    const rawNodes = Array.isArray(parsed.diagramNodes) ? parsed.diagramNodes : [];
    const diagramNodes = rawNodes.map((n: Record<string, unknown>, idx: number) => ({
      id: String(n.id || `n${idx + 1}`),
      label: String(n.label || `Stage ${idx + 1}`),
      layer: validLayers.has(String(n.layer)) ? String(n.layer) : 'Compute',
      detail: String(n.detail || ''),
    }));

    const topicPayload = {
      id: `topic_${cleanSlug.replace(/-/g, '_')}`,
      slug: cleanSlug,
      title: String(parsed.title || topicTitle),
      domain: String(parsed.domain || domain),
      summary: String(parsed.summary || ''),
      officialDocRefAndVersion: String(parsed.officialDocRefAndVersion || 'Production Data Engineering Reference'),
      estimatedMinutes: Number(parsed.estimatedMinutes) || 12,
      sections: {
        typesAndClassifications: '',
        variationsComparison: '',
        industryUseCases: '',
        architectureDiagramMermaid: '',
        advantagesLimitations: '',
        ...(typeof parsed.sections === 'object' && parsed.sections !== null ? parsed.sections : {}),
      },
      diagramNodes,
      diagramEdges: Array.isArray(parsed.diagramEdges) ? parsed.diagramEdges : [],
      flashcards: Array.isArray(parsed.flashcards) ? parsed.flashcards : [],
      quiz: Array.isArray(parsed.quiz) ? parsed.quiz : [],
      relatedQuestionIds: [],
    };

    res.json({ topic: topicPayload });
  } catch (err) {
    handleGeminiError(res, err);
  }
});

// 6b. On-Demand Scenario MCQ Batch Generator for any DE Concept Pillar
app.post('/api/ai/generate-mcqs', async (req, res) => {
  try {
    const ai = getGeminiClient();
    const {
      topicTitle = 'Distributed Data Engineering',
      domain = 'Data Engineering',
      existingQuestions = [],
      count = 5,
    } = req.body as {
      topicTitle?: string;
      domain?: string;
      existingQuestions?: string[];
      count?: number;
    };

    const safeCount = Math.min(Math.max(Number(count) || 5, 3), 10);
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Generate ${safeCount} realistic 3+ YOE production-scenario multiple-choice questions for "${topicTitle}" (${domain}).
Avoid repeating these existing questions: ${existingQuestions.slice(0, 20).join(' | ') || 'None'}.
Each MCQ must test real production debugging, architecture trade-offs, or execution internals (NOT trivial syntax definitions), with 4 distinct options, exact correctIndex (0..3), an overall explanation, and optionRationales array explaining why each of the 4 options is right or wrong.`,
      config: {
        systemInstruction: 'You are a Tier-1 Staff Data Engineering bar-raiser creating rigorous production-scenario MCQs.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctIndex: { type: Type.NUMBER },
              explanation: { type: Type.STRING },
              optionRationales: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['question', 'options', 'correctIndex', 'explanation', 'optionRationales'],
          },
        },
      },
    });

    const mcqs = JSON.parse((response.text ?? '[]').trim()) as Array<Record<string, unknown>>;
    res.json({ mcqs });
  } catch (err) {
    handleGeminiError(res, err);
  }
});

// 6c. Live Gemini API & Google Search Grounding Diagnostics Probe
app.post('/api/ai/diagnostics-ping', async (_req, res) => {
  const startedAt = Date.now();
  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: 'Respond with OK and cite one recent Apache Iceberg or Snowflake official documentation URL.',
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    res.json({
      ok: true,
      model: 'gemini-4-hydrogen',
      latencyMs: Date.now() - startedAt,
      groundedCount: groundingChunks.filter((c) => c.web?.uri).length,
      preview: (response.text ?? '').slice(0, 120),
    });
  } catch (err) {
    handleGeminiError(res, err);
  }
});

// 7. Staff Rubric Response Evaluator (Rounds 4, 5, 6, 8 Design / Modeling / RCA / STAR)
app.post('/api/ai/evaluate-response', async (req, res) => {
  try {
    const ai = getGeminiClient();
    const {
      questionTitle = '',
      questionPrompt = '',
      roundName = 'Data Engineering Round',
      experienceTier = '4-6 yrs',
      userResponse = '',
      referenceSolution = '',
    } = req.body as {
      questionTitle?: string;
      questionPrompt?: string;
      roundName?: string;
      experienceTier?: string;
      userResponse?: string;
      referenceSolution?: string;
    };

    if (!userResponse.trim()) {
      res.status(400).json({ error: 'Please write your architecture, modeling, or STAR response before evaluating.' });
      return;
    }

    const prompt = `Evaluate this ${experienceTier} Data Engineer candidate's response for ${roundName}.

QUESTION: ${questionTitle}
PROMPT:
${questionPrompt}

REFERENCE BENCHMARK (for grading calibration only):
${referenceSolution.slice(0, 3500)}

CANDIDATE RESPONSE:
${userResponse.slice(0, 8000)}

Score strictly from 0 to 100 based on technical accuracy, concrete metrics/sizing, edge-case & failure handling, and trade-off justification.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          'You are a Tier-1 Staff Data Engineering Bar-Raiser interviewer. Grade objectively: short/vague answers score <50; solid Senior answers score 70-84; comprehensive Staff-caliber answers with sizing, edge cases, and trade-offs score 85+.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            verdict: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
            staffUpgradeSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            followUpQuestion: { type: Type.STRING },
          },
          required: ['score', 'verdict', 'strengths', 'gaps', 'staffUpgradeSuggestions', 'followUpQuestion'],
        },
      },
    });

    res.json(JSON.parse((response.text ?? '{}').trim()));
  } catch (err) {
    handleGeminiError(res, err);
  }
});

// 8. AI Resume & ATS Matcher + LinkedIn Cold Outreach Generator
app.post('/api/ai/tailor-resume', async (req, res) => {
  try {
    const ai = getGeminiClient();
    const {
      resumeText = '',
      coreSkills = '',
      yoe = '4+ YOE',
      jobTitle = '',
      company = '',
      jobLocation = '',
      jobSkills = [],
      jobSummary = '',
    } = req.body as {
      resumeText?: string;
      coreSkills?: string;
      yoe?: string;
      jobTitle?: string;
      company?: string;
      jobLocation?: string;
      jobSkills?: string[];
      jobSummary?: string;
    };

    if (!resumeText.trim() || !jobTitle.trim()) {
      res.status(400).json({ error: 'Both a saved Master Resume and target job details are required.' });
      return;
    }

    const prompt = `Analyze how well this Data Engineer's Master Resume matches the target opening and produce an ATS optimization report + cold outreach note.

CANDIDATE YOE: ${yoe}
CANDIDATE CORE SKILLS: ${coreSkills}
MASTER RESUME:
${resumeText.slice(0, 6000)}

TARGET ROLE: ${jobTitle} at ${company} (${jobLocation})
TARGET SKILLS: ${Array.isArray(jobSkills) ? jobSkills.join(', ') : ''}
JOB CONTEXT: ${jobSummary.slice(0, 1500)}

RULES:
1. Score ATS alignment realistically from 0 to 100 based on overlapping core DE keywords, scale signals, and domain tools.
2. List matchedKeywords and missingKeywords (high-weight ATS terms from the target stack/role).
3. Rewrite 3-4 concise, metric-driven ATS bullet points that weave in relevant target framing WITHOUT fabricating fake employers, fake metrics, or skills absent from the candidate's history (use existing metrics or honest scope placeholders like [X% / Y TB] only where clearly marked).
4. Write a crisp 3-sentence personalized LinkedIn cold outreach message addressed to a Hiring Manager or Engineering Recruiter at ${company} referencing their stack and the candidate's relevant experience.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          'You are a Tier-1 Data Engineering Technical Recruiter and ATS Optimization Specialist. Never invent fake credentials or exaggerated metrics.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            atsScore: { type: Type.NUMBER },
            matchedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            tailoredBullets: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  originalFocus: { type: Type.STRING },
                  rewrittenBullet: { type: Type.STRING },
                  addedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['originalFocus', 'rewrittenBullet', 'addedKeywords'],
              },
            },
            outreachMessage: { type: Type.STRING },
          },
          required: ['atsScore', 'matchedKeywords', 'missingKeywords', 'tailoredBullets', 'outreachMessage'],
        },
      },
    });

    res.json(JSON.parse((response.text ?? '{}').trim()));
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
