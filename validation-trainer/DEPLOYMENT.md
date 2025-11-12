# Deployment Guide

This guide will help you deploy the Validation Trainer app online so anyone can use it.

## Quick Deploy Options

### Option 1: Vercel (Recommended - Easiest)

Vercel is made by the creators of Next.js and offers the simplest deployment process.

#### Steps:

1. **Push your code to GitHub** (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/validation-trainer.git
   git push -u origin main
   ```

2. **Sign up/Login to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Sign up with your GitHub account (free)

3. **Import your project**:
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js settings

4. **Set Environment Variables**:
   In the project settings, add these environment variables:
   - `OPENAI_API_KEY` = your OpenAI API key
   - `NEXT_PUBLIC_OPENAI_API_KEY` = your OpenAI API key (same value)
   - `OPENAI_MODEL` = `gpt-5` (optional, this is the default)

5. **Deploy**:
   - Click "Deploy"
   - Wait 2-3 minutes for build to complete
   - Your app will be live at `your-project-name.vercel.app`

6. **Custom Domain (Optional)**:
   - Go to Project Settings → Domains
   - Add your custom domain

#### Vercel CLI (Alternative):

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow the prompts, then set environment variables:
vercel env add OPENAI_API_KEY
vercel env add NEXT_PUBLIC_OPENAI_API_KEY
vercel env add OPENAI_MODEL
```

---

### Option 2: Netlify

1. **Push to GitHub** (same as above)

2. **Sign up at [netlify.com](https://netlify.com)**

3. **Import from GitHub**:
   - Click "Add new site" → "Import an existing project"
   - Connect GitHub and select your repo

4. **Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `.next`
   - **Important**: You'll need to create a `netlify.toml` file (see below)

5. **Set Environment Variables**:
   - Site settings → Environment variables
   - Add: `OPENAI_API_KEY`, `NEXT_PUBLIC_OPENAI_API_KEY`, `OPENAI_MODEL`

6. **Deploy**

Create `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

---

### Option 3: Railway

1. **Sign up at [railway.app](https://railway.app)**

2. **New Project** → "Deploy from GitHub repo"

3. **Add Environment Variables**:
   - `OPENAI_API_KEY`
   - `NEXT_PUBLIC_OPENAI_API_KEY`
   - `OPENAI_MODEL`

4. **Deploy**

---

## Important Notes

### Environment Variables

**Never commit your API keys to GitHub!** Always set them in your hosting platform's environment variable settings.

Required variables:
- `OPENAI_API_KEY` - Your OpenAI API key (server-side)
- `NEXT_PUBLIC_OPENAI_API_KEY` - Your OpenAI API key (client-side, if needed)
- `OPENAI_MODEL` - Optional, defaults to `gpt-5`

### API Key Security

⚠️ **Warning**: If you use `NEXT_PUBLIC_OPENAI_API_KEY`, it will be exposed in the browser. Consider:
- Using rate limiting
- Implementing API key rotation
- Using a proxy/backend to hide the key

For better security, you could:
1. Remove `NEXT_PUBLIC_OPENAI_API_KEY` usage
2. Only use `OPENAI_API_KEY` (server-side only)
3. Make all API calls go through your Next.js API routes (which they already do)

### Browser Compatibility

Remember: Speech recognition only works in Chrome and Edge. Safari and Firefox users won't be able to use voice features.

### Cost Considerations

- **Vercel**: Free tier includes 100GB bandwidth/month
- **Netlify**: Free tier includes 100GB bandwidth/month  
- **OpenAI API**: Pay per use (check [OpenAI pricing](https://openai.com/pricing))

Monitor your OpenAI usage to avoid unexpected costs!

---

## Post-Deployment Checklist

- [ ] Test the app on the live URL
- [ ] Verify environment variables are set correctly
- [ ] Test voice recording/transcription
- [ ] Test partner response generation
- [ ] Test scenario generation
- [ ] Check browser console for errors
- [ ] Set up custom domain (optional)
- [ ] Add analytics (optional)

---

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Ensure Node.js version is compatible (check `package.json` engines if specified)
- Review build logs for specific errors

### API Errors
- Verify environment variables are set correctly
- Check OpenAI API key is valid and has credits
- Review server logs for API errors

### Voice Features Not Working
- Ensure user is using Chrome or Edge
- Check browser console for errors
- Verify microphone permissions are granted

---

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment
- OpenAI API Docs: https://platform.openai.com/docs

