import fs from 'fs';

const targetPath = './src/environments/environment.ts';
const envConfigFile = `
export const environment = {
  production: true,
  apiKey: ${JSON.stringify(process.env.API_KEY || process.env.GEMINI_API_KEY || '')}
};
`;

fs.mkdirSync('./src/environments', { recursive: true });
fs.writeFileSync(targetPath, envConfigFile);
console.log('Environment file generated correctly.');
