import { Injectable } from '@angular/core';
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { environment } from '../environments/environment';

export interface ReplyOption {
  title: string;
  reply: string;
  vibe?: string;
}

export interface ApiResponse {
  options: ReplyOption[];
}

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private ai!: GoogleGenAI;
  private isUsingManualKey = false;

  // Modern, fast, multimodal models in order of priority
  private readonly preferredModels = [
    'gemini-3.1-flash-lite',
    'gemini-3-flash-preview',
    'gemini-flash-latest'
  ];

  constructor() {
    this.reinitialize();
  }

  reinitialize() {
    let manualKey = typeof window !== 'undefined' ? localStorage.getItem('MANUAL_API_KEY') : null;
    
    // Purge known invalid placeholder keys
    if (manualKey && (manualKey.includes('AIzaSyBzjMh8vmIGvlfAKd06813FWNPuAfej8YY') || manualKey === 'MY_GEMINI_API_KEY')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('MANUAL_API_KEY');
      }
      manualKey = null;
    }

    const defaultKey = environment.apiKey || (typeof process !== 'undefined' ? (process.env.GEMINI_API_KEY || process.env.API_KEY) : '');
    const apiKey = manualKey || defaultKey;
    this.isUsingManualKey = !!manualKey;

    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  private handleKeyError(error: any) {
    const errorStr = error instanceof Error ? error.message : JSON.stringify(error);
    const isPermissionOrKeyError = 
      errorStr.includes('PERMISSION_DENIED') || 
      errorStr.includes('403') || 
      errorStr.includes('API_KEY_INVALID') || 
      errorStr.includes('not valid');

    // If a manual key failed, clear it and fall back to the built-in verified key
    if (isPermissionOrKeyError && this.isUsingManualKey && typeof window !== 'undefined') {
      console.warn('Manual API key lacks permission or is invalid. Falling back to default app key.');
      localStorage.removeItem('MANUAL_API_KEY');
      this.reinitialize();
    }
  }

  private dataToGenerativePart(base64Data: string, mimeType: string) {
    return {
      inlineData: { data: base64Data, mimeType: mimeType },
    };
  }

  /**
   * Analyzes text for inappropriate content using a safety check.
   */
  private async checkForInappropriateContent(text: string): Promise<void> {
    if (!text || text.trim() === '') {
      return;
    }

    const safetyPrompt = `Analyze the following text for severe harassment, explicit threats, or hate speech. Respond with JSON: {"inappropriate": boolean, "reason": string}.
Text: "${text}"`;

    try {
      if (!this.ai) {
        this.reinitialize();
      }
      if (!this.ai) return;

      const response = await this.ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: { parts: [{ text: safetyPrompt }] },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              inappropriate: { type: Type.BOOLEAN },
              reason: { type: Type.STRING },
            },
            required: ['inappropriate'],
          },
        },
      });

      const jsonText = response.text?.trim() || '{}';
      const safetyResult = JSON.parse(jsonText);

      if (safetyResult.inappropriate) {
        throw new Error('This content was flagged as inappropriate and cannot be processed. Please adhere to community guidelines.');
      }
    } catch (error: any) {
      if (error.message && error.message.includes('inappropriate')) {
        throw error;
      }
      // Non-blocking for network or permission errors
      console.warn('Safety check skipped or passed:', error?.message || error);
    }
  }

  /**
   * Extracts text from an uploaded screenshot or chat image.
   * Uses robust model fallback to prevent 403 / 503 / 404 errors.
   */
  async getTextFromImage(base64Data: string, mimeType: string): Promise<string> {
    const imagePart = this.dataToGenerativePart(base64Data, mimeType);
    const prompt = "Extract all text from the provided image, which is a screenshot of a chat. Focus on transcribing the last message sent by the other person. Return only the transcribed text, without any additional comments, labels, or explanations. If no text exists, return empty.";

    let lastError: any = null;

    for (const model of this.preferredModels) {
      try {
        if (!this.ai) {
          this.reinitialize();
        }

        const response = await this.ai.models.generateContent({
          model,
          contents: { parts: [imagePart, { text: prompt }] },
        });

        const extractedText = response.text ? response.text.trim() : '';

        // Run safety check on extracted text if present
        if (extractedText) {
          await this.checkForInappropriateContent(extractedText);
        }

        return extractedText;
      } catch (error: any) {
        lastError = error;
        this.handleKeyError(error);

        const errorStr = error instanceof Error ? error.message : JSON.stringify(error);
        if (errorStr.includes('inappropriate')) {
          throw error;
        }

        console.warn(`Model ${model} failed for image extraction:`, errorStr);
        // Continue to next fallback model
      }
    }

    // If all models failed, provide clean, friendly explanation
    const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
    if (errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('403') || errorMessage.includes('API_KEY_INVALID')) {
      throw new Error('API key permission denied. Please verify your Gemini API key in Settings.');
    }
    throw new Error('Could not extract text from screenshot. Please try pasting the message directly.');
  }

  /**
   * Generates 3 calibrated dating replies based on user input, screenshot, and chosen vibe.
   */
  async generateReplies(
    userInput: string,
    base64Data?: string | null,
    mimeType?: string | null,
    history?: any[],
    vibe: string = 'Playful',
    mode: 'reply' | 'rewrite' | 'starter' = 'reply'
  ): Promise<ApiResponse> {
    if (!this.ai) {
      this.reinitialize();
    }

    if (userInput) {
      await this.checkForInappropriateContent(userInput);
    }

    let vibeSpecialization = '';
    const vLower = vibe.toLowerCase();
    if (vLower === 'rizz') {
      vibeSpecialization = `
SPECIAL VIBE GUIDANCE FOR "RIZZ":
- High charm, unspoken magnetism, effortless confidence, zero try-hard energy.
- Use smooth lines, playful confidence, and subtle tension that makes the recipient blush, laugh, or lean in.
- Never sound creepy, corny, or robotic. Keep it authentic and naturally charismatic.`;
    } else if (vLower === 'magnetic') {
      vibeSpecialization = `
SPECIAL VIBE GUIDANCE FOR "MAGNETIC":
- High intrigue, captivating allure, and tension-building mystery that pulls her into the conversation.
- Never over-explain or reveal everything at once. Leave an irresistible conversational hook.
- Calm, seductive self-possession and high status with zero desperation.`;
    } else if (vLower === 'smooth') {
      vibeSpecialization = `
SPECIAL VIBE GUIDANCE FOR "SMOOTH":
- Velvet cadence, calm composure, and effortless charm without any hesitation or awkward pauses.
- Seamlessly transitions conversation from casual banter into genuine romantic interest or date plans.
- Naturally poised, flattering without seeking validation, and suave.`;
    } else if (vLower === 'witty') {
      vibeSpecialization = `
SPECIAL VIBE GUIDANCE FOR "WITTY":
- Lightning-fast verbal agility, clever banter, intellectual playfulness, and sharp observational humor.
- Playful teasing and unexpected callbacks that keep her smiling and on her toes.
- Crisp, intelligent, and delightfully fun to text back.`;
    }

    let modeInstructions = `TASK: REPLY GENERATOR
The user needs a reply to a message they received in a dating app or DM.
The chosen primary vibe is: "${vibe}".${vibeSpecialization}
Provide 3 distinct, high-impact reply options reflecting this vibe:
Option 1: The "${vibe}" Core Option (Direct expression of the vibe)
Option 2: The Playful / Banter Angle (Tease, witty observation, or banter)
Option 3: The Smooth & Low-Pressure Angle (Effortless, casual escalation or intrigue)`;

    const systemPrompt = `You are "Wingman Bro," a world-class AI dating and conversation assistant. You help people stop overthinking and send witty, confident, and natural replies for Tinder, Bumble, Hinge, Instagram DMs, and social chats.

PRIMARY DIRECTIVES:
1. Tone & Style: Natural, confident, witty, and socially calibrated. Never sound needy, cheesy, or overly scripted.
2. Selected Vibe: "${vibe}". Ensure all options honor this vibe while providing distinct angles.
3. Language & Script Matching: Match the exact language, dialect, and script used in the incoming message (English, Bengali, Spanish, French, Banglish, Spanglish, etc.) including local modern slang.
4. Social Calibration:
   - Match the other person's effort and length.
   - If a screenshot is provided, analyze pauses, timestamps, and message flow.
   - Keep replies concise (1-2 sentences max), punchy, and easy to respond to.
5. Guardrails: Absolutely NO harassment, creepiness, desperation, or offensive content.

${modeInstructions}

Return exactly 3 options in JSON format.`;
    
    const contents: any[] = [{ text: systemPrompt }];
    
    if (history && history.length > 0) {
      let historyText = "--- RECENT CONVERSATION HISTORY (Context) ---\n";
      const recentHistory = history.slice(0, 3).reverse();
      for (const item of recentHistory) {
        if (item.userInput) {
          historyText += `Context: "${item.userInput}"\n`;
        }
        if (item.responses?.options) {
          historyText += `Suggested: ${item.responses.options.map((o: any) => o.reply).join(' | ')}\n\n`;
        }
      }
      historyText += "--- END OF HISTORY ---\n";
      contents.push({ text: historyText });
    }

    if (base64Data && mimeType) {
      const imagePart = this.dataToGenerativePart(base64Data, mimeType);
      contents.push(imagePart);
    }

    if (userInput) {
      contents.push({ text: `Current user input: "${userInput}"`});
    }

    if (base64Data && !userInput) {
      contents.push({ text: "Analyze the screenshot context and provide the best replies to the latest message."});
    }

    let lastError: any = null;

    for (const model of this.preferredModels) {
      try {
        if (!this.ai) {
          this.reinitialize();
        }

        const response: GenerateContentResponse = await this.ai.models.generateContent({
          model,
          contents: { parts: contents },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                options: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      reply: { type: Type.STRING }
                    },
                    required: ["title", "reply"]
                  }
                }
              },
              required: ["options"]
            }
          }
        });
        
        const jsonText = response.text ? response.text.trim() : '{}';
        const parsedResponse = JSON.parse(jsonText);

        if (!parsedResponse.options || parsedResponse.options.length < 1) {
          throw new Error('Wingman is thinking... Please try rephrasing or provide another screenshot.');
        }
        return parsedResponse as ApiResponse;

      } catch (error: any) {
        lastError = error;
        this.handleKeyError(error);

        const errorStr = error instanceof Error ? error.message : JSON.stringify(error);
        if (errorStr.includes('inappropriate')) {
          throw error;
        }

        console.warn(`Model ${model} failed for reply generation:`, errorStr);
      }
    }

    const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
    if (errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('403') || errorMessage.includes('API_KEY_INVALID')) {
      throw new Error('API key permission denied. Please verify your Gemini API key in Settings.');
    }
    throw new Error('Failed to get advice from Wingman Bro. Please check your connection or API key and try again.');
  }
}
