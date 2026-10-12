import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Support JSON bodies up to 25MB (to handle base64 image data for AI image tagging)
  app.use(express.json({ limit: '25mb' }));

  // AI Connection Status Check
  app.get('/api/ai/status', (_req, res) => {
    const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
    res.json({
      configured: hasKey,
      model: 'gemini-3.8-flash',
      message: hasKey
        ? 'Gemini AI service connected.'
        : 'AI service not configured: GEMINI_API_KEY is missing from environment secrets.',
    });
  });

  // Optional AI Natural-Language Query Interpretation Endpoint
  app.post('/api/ai/parse-query', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;

    // Strict requirement: Never pretend AI is configured when key is absent
    if (!apiKey || apiKey.trim().length === 0) {
      return res.status(503).json({
        success: false,
        configured: false,
        error:
          'AI service not configured: GEMINI_API_KEY is not set. Natural language search operates reliably via device offline parsing.',
      });
    }

    try {
      const { query = '' } = req.body;
      const cleanQuery = typeof query === 'string' ? query.trim() : '';
      if (!cleanQuery) {
        return res.status(400).json({ success: false, error: 'Empty search query.' });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Parse this natural-language search query for a personal save-for-later inbox app into structured criteria:\nQuery: "${cleanQuery}"`,
        config: {
          systemInstruction: `You are a query intent parser for Stash, a personal save-for-later inbox app.
Extract search criteria:
- itemType: 'note', 'link', 'image', or null
- isPinned: boolean or null
- isArchived: boolean or null
- tag: string or null
- relativeTime: string or null
- keywords: array of core search words (e.g. ["c", "programming"], ["internship"], ["design", "inspiration"])
- naturalExplanation: 1-sentence friendly summary of what was understood.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              itemType: { type: Type.STRING, enum: ['note', 'link', 'image'] },
              isPinned: { type: Type.BOOLEAN },
              isArchived: { type: Type.BOOLEAN },
              tag: { type: Type.STRING },
              relativeTime: { type: Type.STRING },
              keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              naturalExplanation: { type: Type.STRING },
            },
            required: ['keywords', 'naturalExplanation'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json({
        success: true,
        configured: true,
        parsed,
      });
    } catch (err: unknown) {
      console.error('Error in /api/ai/parse-query:', err);
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({
        success: false,
        error: `Failed to interpret query with AI: ${msg}`,
      });
    }
  });

  // AI Smart Tag Suggestion Endpoint
  app.post('/api/ai/suggest-tags', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;

    // Strict requirement: Never simulate or pretend the AI service is connected if no key exists
    if (!apiKey || apiKey.trim().length === 0) {
      return res.status(503).json({
        success: false,
        error:
          'AI service not configured: GEMINI_API_KEY environment variable is not set. Please add GEMINI_API_KEY to your environment secrets to enable AI Smart Tagging.',
        configured: false,
      });
    }

    try {
      const {
        type = 'note',
        title = '',
        contentOrUrl = '',
        imageUri,
        existingTags = [],
      } = req.body;

      const trimmedTitle = typeof title === 'string' ? title.trim() : '';
      const trimmedContent = typeof contentOrUrl === 'string' ? contentOrUrl.trim() : '';

      // Check for minimum input
      if (!trimmedTitle && !trimmedContent && !imageUri) {
        return res.status(400).json({
          success: false,
          error:
            'Please provide at least an item title or content before requesting AI tag suggestions.',
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      let imageAnalysisReliable = false;
      let limitationExplanation: string | undefined = undefined;
      let contentsPayload: Array<
        | { text: string }
        | { inlineData: { mimeType: string; data: string } }
      > = [];

      if (type === 'image') {
        if (typeof imageUri === 'string' && imageUri.startsWith('data:image/')) {
          const match = imageUri.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
          if (match) {
            imageAnalysisReliable = true;
            contentsPayload = [
              {
                inlineData: {
                  mimeType: match[1],
                  data: match[2],
                },
              },
              {
                text: `Item Type: image\nTitle: ${trimmedTitle || '(Untitled)'}\nCaption / Notes: ${trimmedContent || '(No caption)'}\nExisting Tags: ${existingTags.join(', ') || 'None'}\n\nAnalyze the image's visual elements, subjects, styles, and themes alongside the title and caption. Suggest 3 to 6 concise tags.`,
              },
            ];
          } else {
            imageAnalysisReliable = false;
            limitationExplanation =
              'Image data could not be parsed as base64 inline data. Suggestions were generated from the title and caption text only.';
            contentsPayload = [
              {
                text: `Item Type: image\nTitle: ${trimmedTitle || '(Untitled)'}\nCaption / Notes: ${trimmedContent || '(No caption)'}\nExisting Tags: ${existingTags.join(', ') || 'None'}\n\nNote: Image pixel data is unavailable. Suggest tags strictly based on the title and caption text.`,
              },
            ];
          }
        } else {
          imageAnalysisReliable = false;
          limitationExplanation =
            'Image file content is not loaded directly. Suggestions are generated strictly from the available title and caption text.';
          contentsPayload = [
            {
              text: `Item Type: image\nTitle: ${trimmedTitle || '(Untitled)'}\nCaption / Notes: ${trimmedContent || '(No caption)'}\nExisting Tags: ${existingTags.join(', ') || 'None'}\n\nNote: Image pixel data is not loaded. Suggest tags strictly based on the provided title and caption text.`,
            },
          ];
        }
      } else if (type === 'link') {
        // Explicit user requirement: For links, use only the title and content actually available to the app; do not pretend to have read a webpage just from its URL.
        contentsPayload = [
          {
            text: `Item Type: link\nTitle: ${trimmedTitle || '(Untitled)'}\nURL: ${trimmedContent || '(No URL)'}\nExisting Tags: ${existingTags.join(', ') || 'None'}\n\nCRITICAL INSTRUCTION FOR LINKS: Do NOT pretend to have fetched, crawled, or read the live external webpage. Generate relevant tags using ONLY the provided title text and the identifiable keywords/domain in the URL.`,
          },
        ];
      } else {
        // Note
        contentsPayload = [
          {
            text: `Item Type: note\nTitle: ${trimmedTitle || '(Untitled)'}\nNote Content:\n${trimmedContent || '(Empty note)'}\nExisting Tags: ${existingTags.join(', ') || 'None'}\n\nSuggest 3 to 6 concise, relevant tags based on this note's subject and context.`,
          },
        ];
      }

      // Generate with retry on temporary demand spikes
      let response: Awaited<ReturnType<typeof ai.models.generateContent>> | undefined;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: contentsPayload,
            config: {
              systemInstruction: `You are an expert tagging assistant for a personal save-for-later inbox app called Stash.
Your goal is to suggest 3 to 6 highly relevant, specific, and clean tags for saved items.

Guidelines:
1. Return lowercase words or short hyphenated phrases (e.g. "programming", "c", "college", "career", "internship", "design", "inspiration", "mobile-ui", "android").
2. Do NOT include '#' symbols, commas, or punctuation.
3. Capture the topic, context, action, or category.
Examples:
- "C pointers and memory management" -> ["programming", "c", "college", "computer-science"]
- "Internship application resource" -> ["career", "internship", "job-search", "application"]
- "Modern mobile UI inspiration" -> ["design", "inspiration", "mobile-ui", "ui-ux"]

CRITICAL LINK RULE:
For links, use ONLY the title and content actually available. Do NOT pretend to have read the live external webpage just from its URL.

CRITICAL IMAGE RULE:
If an image is attached, analyze the visible visual content alongside any title and caption. If no image data is attached, rely only on the available text.

Do NOT return tags that are already in the existing tags list.`,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  tags: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.STRING,
                    },
                    description: 'Array of 3 to 6 suggested lowercase tags without # symbols.',
                  },
                  analysisNotes: {
                    type: Type.STRING,
                    description: 'Brief 1-sentence explanation of what sources/content were analyzed.',
                  },
                },
                required: ['tags'],
              },
            },
          });
          break;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if ((msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE')) && attempt < 2) {
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
            continue;
          }
          throw err;
        }
      }

      if (!response) {
        throw new Error('No response received from Gemini model.');
      }

      let parsed: { tags?: string[]; analysisNotes?: string } = {};
      try {
        parsed = JSON.parse(response.text || '{}');
      } catch (e) {
        console.error('Failed to parse Gemini JSON output:', e);
      }

      const rawTags: string[] = Array.isArray(parsed.tags) ? parsed.tags : [];

      // Clean, trim, normalize and filter duplicates ignoring case and whitespace
      const existingNormalized = new Set(
        (existingTags as string[]).map((t) =>
          typeof t === 'string' ? t.trim().toLowerCase().replace(/^#+/, '') : ''
        )
      );

      const uniqueSuggested: string[] = [];
      const seen = new Set<string>();

      for (const raw of rawTags) {
        if (typeof raw !== 'string') continue;
        const clean = raw
          .trim()
          .toLowerCase()
          .replace(/^#+/, '')
          .replace(/[^\w\s-]/g, '')
          .trim();

        if (clean.length > 0 && !existingNormalized.has(clean) && !seen.has(clean)) {
          seen.add(clean);
          uniqueSuggested.push(clean);
        }
      }

      return res.json({
        success: true,
        tags: uniqueSuggested,
        analysisNotes: parsed.analysisNotes || '',
        imageAnalysisReliable: type === 'image' ? imageAnalysisReliable : undefined,
        limitationExplanation,
      });
    } catch (err: unknown) {
      console.error('Error in /api/ai/suggest-tags:', err);
      let errorMessage = 'Failed to generate tag suggestions.';
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed.error?.message) {
            errorMessage = parsed.error.message;
          } else {
            errorMessage = err.message;
          }
        } catch {
          errorMessage = err.message;
        }
      }
      return res.status(500).json({
        success: false,
        error: `AI suggestion notice: ${errorMessage}`,
      });
    }
  });

  // AI Quick Summaries Endpoint
  app.post('/api/ai/summarize', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;

    // Strict requirement: Never simulate or pretend the AI service is operational if no key exists
    if (!apiKey || apiKey.trim().length === 0) {
      return res.status(503).json({
        success: false,
        error:
          'AI service not configured: GEMINI_API_KEY environment variable is not set. Please add GEMINI_API_KEY to your environment secrets to enable AI Quick Summaries.',
        configured: false,
      });
    }

    try {
      const {
        type = 'note',
        title = '',
        contentOrUrl = '',
        imageUri,
      } = req.body;

      const trimmedTitle = typeof title === 'string' ? title.trim() : '';
      const trimmedContent = typeof contentOrUrl === 'string' ? contentOrUrl.trim() : '';

      // Handle item types with strict fidelity to requirements
      if (type === 'link') {
        // Explicit user requirement: For website links, summarize webpage content only if the app
        // can actually retrieve that content through a supported and permitted method.
        // Never claim to have read an article based on its URL alone.
        // If webpage content is inaccessible, explain that the user can provide the article text instead.
        const isUrlPattern = /^https?:\/\/[^\s]+$/i.test(trimmedContent);
        const hasSubstantialText = trimmedContent.length > 50 && trimmedContent.includes(' ');

        if (isUrlPattern || !hasSubstantialText) {
          return res.status(400).json({
            success: false,
            cannotFetchUrl: true,
            error:
              'External webpage content cannot be read from the URL alone. Stash does not silently crawl or fetch external websites without permissions. You can paste the article text into this item to generate an AI summary.',
          });
        }
      }

      if (type === 'image') {
        // Explicit user requirement: For images, do not invent a description or summary unless reliable image analysis is supported.
        const hasBase64Image = typeof imageUri === 'string' && imageUri.startsWith('data:image/');
        const hasCaption = trimmedContent.length > 0;

        if (!hasBase64Image && !hasCaption) {
          return res.status(400).json({
            success: false,
            error:
              'Image pixel data is not available and no caption text was provided. Stash will not invent a description or summary without reliable visual content.',
          });
        }
      }

      // Check minimum available text for notes
      const fullText = `${trimmedTitle ? `${trimmedTitle}. ` : ''}${trimmedContent}`.trim();
      if (type === 'note' && fullText.length < 25) {
        return res.status(400).json({
          success: false,
          error:
            'Note content is too short to generate a meaningful summary. Please add more details or text content to this note first.',
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      let sourceExplanation = '';
      let contentsPayload: Array<
        | { text: string }
        | { inlineData: { mimeType: string; data: string } }
      > = [];

      if (type === 'image') {
        const hasBase64Image = typeof imageUri === 'string' && imageUri.startsWith('data:image/');
        if (hasBase64Image) {
          const match = imageUri.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
          if (match) {
            sourceExplanation = 'Analyzed attached image visual elements and caption';
            contentsPayload = [
              {
                inlineData: {
                  mimeType: match[1],
                  data: match[2],
                },
              },
              {
                text: `Item Title: ${trimmedTitle || '(Untitled)'}\nCaption: ${trimmedContent || '(None)'}\n\nProvide a factual, concise summary of the visual elements and caption. Do not invent details not present in the image.`,
              },
            ];
          } else {
            sourceExplanation = 'Summarized from caption text only (image data could not be parsed)';
            contentsPayload = [
              {
                text: `Item Title: ${trimmedTitle || '(Untitled)'}\nCaption: ${trimmedContent}\n\nNote: Image data unparsed. Summarize strictly based on the available caption text.`,
              },
            ];
          }
        } else {
          sourceExplanation = 'Summarized from caption text only (image pixel analysis unavailable)';
          contentsPayload = [
            {
              text: `Item Title: ${trimmedTitle || '(Untitled)'}\nCaption: ${trimmedContent}\n\nNote: Image pixel data is not loaded. Summarize strictly based on the available caption text.`,
            },
          ];
        }
      } else if (type === 'link') {
        sourceExplanation = 'Summarized from provided article text notes (external URL was not scraped)';
        contentsPayload = [
          {
            text: `Item Title: ${trimmedTitle || '(Untitled)'}\nUser-Provided Article Text:\n${trimmedContent}\n\nSummarize the user-provided text. Do NOT pretend to have fetched the external web page.`,
          },
        ];
      } else {
        const wordCount = trimmedContent.split(/\s+/).filter(Boolean).length;
        sourceExplanation = `Summarized from available note text (${wordCount} words)`;
        contentsPayload = [
          {
            text: `Item Title: ${trimmedTitle || '(Untitled)'}\nNote Content:\n${trimmedContent}\n\nGenerate a concise summary of this note's available text and extract up to three key takeaways.`,
          },
        ];
      }

      // Generate with retry on temporary demand spikes
      let response: Awaited<ReturnType<typeof ai.models.generateContent>> | undefined;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: contentsPayload,
            config: {
              systemInstruction: `You are an executive summarization engine for Stash, a personal save-for-later inbox app.
Your goals:
1. Generate a concise, plain-language summary of the provided content.
2. The summary MUST be clearly shorter than the original content.
3. Keep the language simple, direct, clear, and easy to scan.
4. Include up to 3 key takeaways (bullet points) when useful. If the content is short or simple, 1 or 2 takeaways is fine.
5. NEVER fabricate, invent, or extrapolate facts that are not present in the provided text.
6. Return your output strictly formatted as JSON according to the schema.`,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  summary: {
                    type: Type.STRING,
                    description: 'A concise, easy-to-scan summary paragraph clearly shorter than the original text.',
                  },
                  keyTakeaways: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.STRING,
                    },
                    description: 'Up to 3 concise key takeaways highlighting the most important points.',
                  },
                  sourceExplanation: {
                    type: Type.STRING,
                    description: 'A 1-sentence note stating what content was summarized.',
                  },
                },
                required: ['summary'],
              },
            },
          });
          break;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if ((msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE')) && attempt < 2) {
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
            continue;
          }
          throw err;
        }
      }

      if (!response) {
        throw new Error('No response received from Gemini model.');
      }

      let parsed: { summary?: string; keyTakeaways?: string[]; sourceExplanation?: string } = {};
      try {
        parsed = JSON.parse(response.text || '{}');
      } catch (e) {
        console.error('Failed to parse Gemini JSON output for summary:', e);
      }

      const summaryText = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
      if (!summaryText) {
        throw new Error('Model did not produce a summary.');
      }

      const keyTakeaways = Array.isArray(parsed.keyTakeaways)
        ? parsed.keyTakeaways
            .filter((t) => typeof t === 'string' && t.trim().length > 0)
            .map((t) => t.trim())
            .slice(0, 3)
        : [];

      return res.json({
        success: true,
        summary: summaryText,
        keyTakeaways,
        sourceExplanation: parsed.sourceExplanation || sourceExplanation,
        generatedAt: Date.now(),
      });
    } catch (err: unknown) {
      console.error('Error in /api/ai/summarize:', err);
      let errorMessage = 'Failed to generate AI summary.';
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed.error?.message) {
            errorMessage = parsed.error.message;
          } else {
            errorMessage = err.message;
          }
        } catch {
          errorMessage = err.message;
        }
      }
      return res.status(500).json({
        success: false,
        error: `AI Summarizer notice: ${errorMessage}`,
      });
    }
  });

  // AI Collections Clustering Endpoint
  app.post('/api/ai/suggest-collections', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;

    // Strict security requirement: Never fake AI suggestions if API key is not present
    if (!apiKey || apiKey.trim().length === 0) {
      return res.status(503).json({
        success: false,
        error:
          'AI service not configured: GEMINI_API_KEY environment variable is not set. Please add GEMINI_API_KEY to your environment secrets to enable AI Collection Suggestions. Manual collection creation is fully functional.',
        configured: false,
      });
    }

    try {
      const { items = [], existingCollections = [] } = req.body;

      if (!Array.isArray(items) || items.length < 2) {
        return res.status(400).json({
          success: false,
          error:
            'Please save at least 2 items in Stash first so AI can identify meaningful patterns and clusters.',
        });
      }

      // Compact representation of items to feed into Gemini
      const itemsOverview = items.map((item) => ({
        id: String(item.id),
        type: item.type,
        title: item.title,
        tags: Array.isArray(item.tags) ? item.tags : [],
        snippet: typeof item.contentOrUrl === 'string'
          ? item.contentOrUrl.slice(0, 160).replace(/\s+/g, ' ').trim()
          : '',
      }));

      const existingNames = Array.isArray(existingCollections)
        ? existingCollections.map((c) => (typeof c.name === 'string' ? c.name.trim() : '')).filter(Boolean)
        : [];

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const promptText = `Saved Items to Analyze:
${JSON.stringify(itemsOverview, null, 2)}

Existing Collections (Do not create exact duplicates of these):
${existingNames.length > 0 ? existingNames.join(', ') : 'None'}

Instructions:
1. Examine the items, their titles, types, tags, and content snippets.
2. Group related items into 2 to 5 meaningful, cohesive collections.
3. Use natural, human-friendly names (examples: "C Programming", "Career Resources", "Android Development", "Design Inspiration", "College Notes", "Hackathon Ideas", "System Architecture", "Weekend Reading").
4. An item may belong to multiple collections if conceptually relevant.
5. Every suggested collection must include at least 1 valid item ID from the provided list.
6. Provide a concise 1-sentence description/rationale for why each collection was suggested.
7. Return strictly valid JSON matching the schema.`;

      let response: Awaited<ReturnType<typeof ai.models.generateContent>> | undefined;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: promptText,
            config: {
              systemInstruction: `You are an intelligent organizational assistant for Stash, a personal save-for-later inbox app.
Your task is to analyze user's saved items (notes, links, photos) and suggest meaningful collections that group related items together logically.
Guidelines:
- Never fabricate items that are not in the provided input.
- Use clean, title-case collection names (2 to 4 words).
- Avoid creating duplicate collections with identical names to existing ones.
- Only reference valid item IDs that exist in the input.`,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  suggestedCollections: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: {
                          type: Type.STRING,
                          description: 'Name of the suggested collection (e.g. "Career Resources", "Android & Kotlin").',
                        },
                        description: {
                          type: Type.STRING,
                          description: 'Short 1-sentence rationale or description for this collection.',
                        },
                        itemIds: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.STRING,
                          },
                          description: 'IDs of the existing items belonging in this collection.',
                        },
                      },
                      required: ['name', 'itemIds'],
                    },
                  },
                  analysisSummary: {
                    type: Type.STRING,
                    description: 'Brief summary of the clustering analysis.',
                  },
                },
                required: ['suggestedCollections'],
              },
            },
          });
          break;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if ((msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE')) && attempt < 2) {
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
            continue;
          }
          throw err;
        }
      }

      if (!response) {
        throw new Error('No response received from Gemini model.');
      }

      let parsed: {
        suggestedCollections?: Array<{ name: string; description?: string; itemIds: string[] }>;
        analysisSummary?: string;
      } = {};

      try {
        parsed = JSON.parse(response.text || '{}');
      } catch (e) {
        console.error('Failed to parse Gemini JSON output for collections:', e);
      }

      const validItemIds = new Set(items.map((i) => String(i.id)));
      const existingNormalized = new Set(existingNames.map((n) => n.toLowerCase().trim()));

      const sanitized: Array<{ name: string; description?: string; itemIds: string[] }> = [];
      const seenNames = new Set<string>();

      for (const col of parsed.suggestedCollections || []) {
        if (!col || typeof col.name !== 'string') continue;
        const name = col.name.trim();
        const normName = name.toLowerCase();

        // Skip exact duplicates of existing collections or previously added suggestions
        if (normName.length === 0 || existingNormalized.has(normName) || seenNames.has(normName)) {
          continue;
        }

        const filteredItemIds = Array.isArray(col.itemIds)
          ? col.itemIds.filter((id) => validItemIds.has(String(id)))
          : [];

        if (filteredItemIds.length > 0) {
          seenNames.add(normName);
          sanitized.push({
            name,
            description: col.description ? col.description.trim() : undefined,
            itemIds: filteredItemIds,
          });
        }
      }

      return res.json({
        success: true,
        suggestedCollections: sanitized,
        analysisSummary: parsed.analysisSummary || '',
      });
    } catch (err: unknown) {
      console.error('Error in /api/ai/suggest-collections:', err);
      let errorMessage = 'Failed to generate collection suggestions.';
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed.error?.message) {
            errorMessage = parsed.error.message;
          } else {
            errorMessage = err.message;
          }
        } catch {
          errorMessage = err.message;
        }
      }
      return res.status(500).json({
        success: false,
        error: `AI Collections notice: ${errorMessage}`,
      });
    }
  });

  // Serve Vite in development or static build in production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Stash server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
