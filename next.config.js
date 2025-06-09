/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_DEPLOYMENT_NAME: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  },
};

console.log('Next.js Config Environment Variables:', nextConfig.env);

module.exports = nextConfig; 