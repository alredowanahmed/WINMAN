import { Injectable } from '@angular/core';
import { GoogleGenAI, GenerateContentResponse, Type, ThinkingLevel } from "@google/genai";
import { environment } from '../environments/environment';

export interface ReplyOption {
  title: string;
  reply: string;
}

export interface ApiResponse {
  options: ReplyOption[];
}

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.reinitialize();
  }

  reinitialize() {
    const manualKey = typeof window !== 'undefined' ? localStorage.getItem('MANUAL_API_KEY') : null;
    const apiKey = manualKey || environment.apiKey || (typeof process !== 'undefined' ? process.env.API_KEY : '');
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  /**
   * Analyzes text for inappropriate content using a separate Gemini call.
   * Throws an error if the content is flagged as inappropriate.
   */
  private async checkForInappropriateContent(text: string): Promise<void> {
    if (!text || text.trim() === '') {
      return; // No need to check empty strings
    }

    const model = 'gemini-3-flash-preview';
    const safetyPrompt = `You are a content safety moderator. Analyze the following text to determine if it contains any explicit, harassing, hateful, threatening, or otherwise inappropriate content that violates community guidelines. Respond with only a JSON object. The object must have a key "inappropriate" (boolean) and, if true, a "reason" (string).

Text to analyze: "${text}"`;

    try {
      const response = await this.ai.models.generateContent({
        model,
        contents: { parts: [{ text: safetyPrompt }] },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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

      const jsonText = response.text.trim();
      const safetyResult = JSON.parse(jsonText);

      if (safetyResult.inappropriate) {
        console.warn(`Content flagged as inappropriate. Reason: ${safetyResult.reason}`);
        throw new Error('This content was flagged as inappropriate and cannot be processed. Please adhere to community guidelines.');
      }
    } catch (error: any) {
      // If the error is the one we threw, re-throw it.
      if (error.message.includes('inappropriate')) {
          throw error;
      }
      console.error('Error during safety check:', error);
      // Let it pass if the safety check itself fails, to not block users due to transient API issues.
    }
  }

  /**
   * Converts image data to a generative part for the Gemini API.
   */
  private dataToGenerativePart(base64Data: string, mimeType: string) {
    return {
      inlineData: {
        data: base64Data,
        mimeType
      },
    };
  }

  /**
   * Extracts text from an image using the Gemini API.
   */
  async getTextFromImage(base64Data: string, mimeType: string): Promise<string> {
    const model = 'gemini-3-flash-preview';
    const prompt = "Extract only the text from this chat screenshot. If there are multiple messages, focus on the last message from the girl. Return only the text, no other commentary.";

    try {
      const response = await this.ai.models.generateContent({
        model,
        contents: {
          parts: [
            { text: prompt },
            this.dataToGenerativePart(base64Data, mimeType)
          ]
        },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
        }
      });

      return response.text.trim();
    } catch (error) {
      console.error('Error extracting text from image:', error);
      return '';
    }
  }

  async generateReplies(userInput: string, history?: any[], base64Data?: string, mimeType?: string): Promise<ApiResponse> {
    // Safety Check on user's direct text input
    await this.checkForInappropriateContent(userInput);

    const model = 'gemini-3-flash-preview';

    const systemPrompt = `You are "Desi Wingman," an expert dating coach for the modern Bangladeshi dating scene. You are witty, culturally aware, and act as a supportive friend. Your goal is to help the user with replies for Tinder, Bumble, etc.

PRIME DIRECTIVE: LANGUAGE & SCRIPT MATCHING
Your reply MUST match the linguistic style of the "Girl's" message provided by the user.
1. Banglish (Bengali in English script): If she writes "Ki koro?", you reply in Banglish like "Chill kortesi, tumi?". Use BD slang (Pera, Joss, Chill).
2. Bengali (বাংলা script): If she writes "কি করো?", you reply in pure Bengali script.
3. English: If she writes "What's up?", you reply in casual, modern English.

VISION/SCREENSHOT ANALYSIS PROTOCOL:
If a screenshot is provided, analyze the visual context (emojis, tone, previous messages in the image) to provide a more tailored response.

RESPONSE STRATEGY:
For EVERY input, you MUST provide exactly 5 distinct options.
1. Option 1: The Playful/Funny ("Rizz" Option) - Tease her, be sarcastic, make her laugh.
2. Option 2: The Sweet/Charming ("Lover Boy" Option) - Show genuine interest, compliment, escalate slightly.
3. Option 3: The Cool/Casual ("Mystery" Option) - Match her energy, play it cool, be brief.
4. Option 4: The Bold/Direct ("Alpha" Option) - Be confident, ask her out, or state your intentions clearly.
5. Option 5: The Intellectual/Deep ("Philosopher" Option) - Ask a deep question, share a thoughtful observation, or talk about a shared interest.

GUARDRAILS:
- NO harassment, creepy, or overly sexual replies.
- NO desperate replies. Suggest a dignified exit if she's ghosting.

The user has provided the following context. Analyze it and generate the 5 reply options.`;
    
    const contents: any[] = [{ text: systemPrompt }];
    
    // Add history context if available
    if (history && history.length > 0) {
      let historyText = "--- PAST CONVERSATION HISTORY (Context for you to remember) ---\n";
      // Take up to the last 4 interactions to give context without overloading
      const recentHistory = history.slice(0, 4).reverse();
      for (const item of recentHistory) {
        if (item.userInput) {
          historyText += `She previously said: "${item.userInput}"\n`;
        }
        historyText += `You suggested: ${item.responses.options.map((o: any) => o.reply).join(' | ')}\n\n`;
      }
      historyText += "--- END OF HISTORY ---\nKeep this past context in mind to ensure continuity and avoid repeating the exact same jokes if this is the same conversation.\n\n";
      contents.push({ text: historyText });
    }

    const parts: any[] = [];
    if (userInput) {
      parts.push({ text: `Her CURRENT message text: "${userInput}"`});
    }

    if (base64Data && mimeType) {
      parts.push({ text: "I have also attached a screenshot of the conversation for more visual context." });
      parts.push(this.dataToGenerativePart(base64Data, mimeType));
    }

    contents.push({ parts });

    try {
      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model,
        contents: contents,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
      
      const jsonText = response.text.trim();
      const parsedResponse = JSON.parse(jsonText);

      if (!parsedResponse.options || parsedResponse.options.length < 1) {
        throw new Error('Wingman is speechless... Try rephrasing.');
      }
      return parsedResponse as ApiResponse;

    } catch (error) {
      console.error('Error calling Gemini API:', error);
      // Check if it's our custom safety error
      if (error instanceof Error && error.message.includes('inappropriate')) {
          throw error;
      }
      throw new Error('Failed to get advice from Wingman. The model might be busy, please try again.');
    }
  }
}