# Kimi K2 Setup Guide

Your app now supports Kimi K2! Here's how to configure it.

## Option 1: Direct Kimi API (Recommended)

1. **Get a Kimi API Key:**
   - Sign up at [Moonshot AI Platform](https://platform.moonshot.ai/)
   - Or use [OpenRouter](https://openrouter.ai/) for unified access

2. **Update `.env.local`:**
   ```bash
   KIMI_API_KEY=your-actual-kimi-api-key-here
   KIMI_BASE_URL=https://kimi-k2.ai/api/v1
   KIMI_MODEL=kimi-k2
   ```

3. **That's it!** The app will automatically use Kimi K2.

## Option 2: Using OpenRouter

If you prefer OpenRouter (gives access to multiple models):

1. **Get OpenRouter API Key:**
   - Sign up at [OpenRouter](https://openrouter.ai/)
   - Get your API key

2. **Update `.env.local`:**
   ```bash
   KIMI_API_KEY=your-openrouter-api-key
   KIMI_BASE_URL=https://openrouter.ai/api/v1
   KIMI_MODEL=moonshot/moonshot-v1-8k
   # Or use: moonshot/moonshot-v1-32k for longer context
   ```

## Environment Variables

The app checks for these in order:
- `KIMI_API_KEY` or `OPENAI_API_KEY` or `NEXT_PUBLIC_OPENAI_API_KEY`
- `KIMI_BASE_URL` or `OPENAI_BASE_URL` (optional, defaults to OpenAI)
- `KIMI_MODEL` or `OPENAI_MODEL` (defaults to `gpt-5`)

## For Vercel Deployment

When deploying to Vercel, add these environment variables in the Vercel dashboard:

1. Go to your project → Settings → Environment Variables
2. Add:
   - `KIMI_API_KEY` = your Kimi API key
   - `KIMI_BASE_URL` = `https://kimi-k2.ai/api/v1`
   - `KIMI_MODEL` = `kimi-k2`

## Switching Back to OpenAI

To switch back to OpenAI, just set:
```bash
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-5
```

And remove or comment out the Kimi variables.

## Testing

After setting up, restart your dev server:
```bash
npm run dev
```

The app will automatically use Kimi K2 for all text generation (partner responses, scenario generation, analysis).

