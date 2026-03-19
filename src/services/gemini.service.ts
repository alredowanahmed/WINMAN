import { Injectable } from '@angular/core';
import { GoogleGenAI, GenerateContentResponse, Type } from '@google/genai';

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
  private ai: GoogleGenAI | null = null;

  constructor() {
    const apiKey = (import.meta as any).env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("API_KEY environment variable not set.");
    } else {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  private async ensureAiInitialized(): Promise<GoogleGenAI> {
    if (!this.ai) {
      throw new Error("Gemini API key is not set. Please configure the GEMINI_API_KEY environment variable.");
    }
    return this.ai;
  }

  private async fileToGenerativePart(file: File) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
      }
      const base64EncodedData = btoa(binary);
      
      return {
        inlineData: { data: base64EncodedData, mimeType: file.type },
      };
    } catch (error: any) {
      throw new Error(`Failed to process image file: ${error?.message || 'Unknown error'}`);
    }
  }

  private async checkForInappropriateContent(text: string): Promise<void> {
    if (!text || text.trim() === '') {
      return;
    }

    const ai = await this.ensureAiInitialized();
    const model = 'gemini-3-flash-preview';
    const safetyPrompt = `You are a content safety moderator. Analyze the following text to determine if it contains any explicit, harassing, hateful, threatening, or otherwise inappropriate content that violates community guidelines. Respond with only a JSON object. The object must have a key "inappropriate" (boolean) and, if true, a "reason" (string).

Text to analyze: "${text}"`;

    try {
      const response = await ai.models.generateContent({
        model,
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

      const jsonText = response.text.trim();
      const safetyResult = JSON.parse(jsonText);

      if (safetyResult.inappropriate) {
        console.warn(`Content flagged as inappropriate. Reason: ${safetyResult.reason}`);
        throw new Error('This content was flagged as inappropriate and cannot be processed. Please adhere to community guidelines.');
      }
    } catch (error: any) {
      if (error.message.includes('inappropriate')) {
          throw error;
      }
      console.error('Error during safety check:', error);
    }
  }

  async getTextFromImageData(base64Data: string, mimeType: string): Promise<string> {
    const ai = await this.ensureAiInitialized();
    const model = 'gemini-3-flash-preview';
    const imagePart = {
      inlineData: { data: base64Data, mimeType },
    };
    const prompt = "Extract all text from the provided image, which is a screenshot of a chat. Focus on transcribing the last message sent by the other person. Return only the transcribed text, without any additional comments, labels, or explanations.";

    try {
      const response = await ai.models.generateContent({
        model,
        contents: { parts: [imagePart, { text: prompt }] },
      });
      
      if (!response.text) {
        throw new Error('No text could be extracted from the image. It might be blocked by safety filters.');
      }
      
      const extractedText = response.text.trim();

      await this.checkForInappropriateContent(extractedText);
      
      return extractedText;
    } catch (error: any) {
      console.error('Error processing image:', error);
      if (error?.message?.includes('inappropriate') || error?.message?.includes('safety')) {
        throw error;
      }
      throw new Error(`Could not process the screenshot. Error: ${error?.message || 'Unknown error'}`);
    }
  }

  async generateReplies(userInput: string, imageData?: { base64Data: string, mimeType: string } | null, history?: any[]): Promise<ApiResponse> {
    await this.checkForInappropriateContent(userInput);

    const ai = await this.ensureAiInitialized();
    const model = 'gemini-3-flash-preview';

    const systemPrompt = `You are "Desi Wingman," an expert dating coach for the modern Bangladeshi dating scene. You are witty, culturally aware, and act as a supportive friend. Your goal is to help the user with replies for Tinder, Bumble, etc.

PRIME DIRECTIVE: LANGUAGE & SCRIPT MATCHING
Your reply MUST match the linguistic style of the "Girl's" message provided by the user.
1. Banglish (Bengali in English script): If she writes "Ki koro?", you reply in Banglish like "Chill kortesi, tumi?". Use BD slang (Pera, Joss, Chill).
2. Bengali (বাংলা script): If she writes "কি করো?", you reply in pure Bengali script.
3. English: If she writes "What's up?", you reply in casual, modern English.

VISION/SCREENSHOT ANALYSIS PROTOCOL:
If a screenshot is provided, you MUST perform a deep, nuanced analysis. This is critical.
1.  **Identify her Messages:** Focus on the messages from her (typically gray/white bubbles).
2.  **Analyze Timestamps for Pauses:** This is very important. Scrutinize the timestamps between messages. A long delay (hours) suggests lower interest or being busy, so your replies should be more casual. A quick reply suggests higher interest, allowing for more engaging or playful responses.
3.  **Analyze Message Length & Effort:** Does she write full sentences or just one-word answers? Match her effort. Low effort from her means you should suggest cooler, less invested replies.
4.  **Detect Engagement Cues (Crucial):**
    - **Typing Indicators:** Actively look for a "typing..." bubble or animation in the screenshot. This is a very strong signal of active engagement. If you see it, the user can be more forward or playful.
    - **Read Receipts:** Look for 'Seen', 'Read', or double-tick indicators. If the user's last message was seen a long time ago with no reply, this is a sign of disinterest. Your "Cool/Casual" option should reflect this by being detached or suggesting ending the conversation.
5.  **Understand the Context:** Read the last 3-4 messages to grasp the conversation's flow, topic, and emotional tone. Use all these visual cues to refine the tone and strategy of your 3 reply options.

RESPONSE STRATEGY:
For EVERY input, you MUST provide exactly 3 distinct options.
1. Option 1: The Playful/Funny ("Rizz" Option) - Tease her, be sarcastic, make her laugh.
2. Option 2: The Sweet/Charming ("Lover Boy" Option) - Show genuine interest, compliment, escalate slightly.
3. Option 3: The Cool/Casual ("Mystery" Option) - Match her energy, play it cool, be brief.

GUARDRAILS:
- NO harassment, creepy, or overly sexual replies.
- NO desperate replies. Suggest a dignified exit if she's ghosting.

The user has provided the following context. Analyze it and generate the 3 reply options.`;
    
    const contents: any[] = [{ text: systemPrompt }];
    
    // Add history context if available
    if (history && history.length > 0) {
      let historyText = "--- PAST CONVERSATION HISTORY (Context for you to remember) ---\n";
      // Take up to the last 4 interactions to give context without overloading
      const recentHistory = history.slice(0, 4).reverse();
      for (const item of recentHistory) {
        if (item.userInput) {
          historyText += `She previously said: "${item.userInput}"\n`;
        } else {
          historyText += `User previously uploaded a screenshot.\n`;
        }
        historyText += `You suggested: ${item.responses.options.map((o: any) => o.reply).join(' | ')}\n\n`;
      }
      historyText += "--- END OF HISTORY ---\nKeep this past context in mind to ensure continuity and avoid repeating the exact same jokes if this is the same conversation.\n\n";
      contents.push({ text: historyText });
    }

    if (imageData) {
      const imagePart = {
        inlineData: { data: imageData.base64Data, mimeType: imageData.mimeType },
      };
      contents.push(imagePart);
    }

    if (userInput) {
      contents.push({ text: `Her CURRENT message text: "${userInput}"`});
    }

    if (imageData && !userInput) {
        contents.push({ text: "Analyze the CURRENT screenshot and provide replies to the last message from her."});
    }

    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
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
      
      const jsonText = response.text.trim();
      const parsedResponse = JSON.parse(jsonText);

      if (!parsedResponse.options || parsedResponse.options.length < 1) {
        throw new Error('Wingman is speechless... Try rephrasing or a different screenshot.');
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