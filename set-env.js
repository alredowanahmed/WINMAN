import fs from 'fs';

const targetPath = './src/environments/environment.ts';

let activeApiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';

// If the environment contains the dummy test placeholder from compile tool, preserve real key if available
if (!activeApiKey || activeApiKey === 'MY_GEMINI_API_KEY' || activeApiKey.includes('AIzaSyBzjMh8vmIGvlfAKd06813FWNPuAfej8YY')) {
  if (fs.existsSync(targetPath)) {
    try {
      const existing = fs.readFileSync(targetPath, 'utf8');
      const match = existing.match(/apiKey:\s*["']([^"']+)["']/);
      if (match && match[1] && match[1] !== 'MY_GEMINI_API_KEY' && !match[1].includes('AIzaSyBzjMh8vmIGvlfAKd06813FWNPuAfej8YY')) {
        activeApiKey = match[1];
      }
    } catch (e) {
      // ignore
    }
  }
}

const envConfigFile = `
export const environment = {
  production: true,
  apiKey: ${JSON.stringify(activeApiKey)}
};
`;

fs.mkdirSync('./src/environments', { recursive: true });
fs.writeFileSync(targetPath, envConfigFile);
console.log('Environment file generated correctly.');
