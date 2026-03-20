
declare global {
  interface AIStudio {
    hasSelectedApiKey(): Promise<boolean>;
    openSelectKey(): Promise<void>;
  }

  interface Window {
    aistudio: AIStudio;
  }

  const process: {
    env: {
      API_KEY?: string;
      GEMINI_API_KEY?: string;
      [key: string]: string | undefined;
    };
  };
}

export {};
