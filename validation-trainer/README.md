# Validation Practice Trainer

A voice-interactive app to help you practice validation skills with your partner using the Four-Step Validation Method from "I Hear You" by Michael S. Sorensen.

## Features

- **Voice Recognition**: Practice speaking validation responses naturally
- **AI-Powered Scenarios**: Realistic conversations with your partner (GPT-4)
- **Real-Time Feedback**: Get instant analysis on your validation skills
- **Four-Step Method**: Learn and practice the complete validation framework
- **Progress Tracking**: Track improvement over time

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Add your OpenAI API key to `.env.local`:
```
NEXT_PUBLIC_OPENAI_API_KEY=sk-...
OPENAI_API_KEY=sk-...
# Optional: override the default model (defaults to gpt-5)
# OPENAI_MODEL=gpt-5
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Browser Requirements

Speech recognition requires Chrome or Edge browser. Safari and Firefox don't support the Web Speech API.

## Usage

1. **Select a Scenario**: A random scenario will be presented (you can choose a different one)
2. **Start Practice**: Click "Start Practice Session"
3. **Speak Your Response**: Click "Press to Speak" and respond to your partner
4. **Get Feedback**: See real-time feedback on your validation skills
5. **Continue Conversation**: Have a multi-turn conversation practicing all 4 steps
6. **Review**: End session to see complete analysis

## The Four-Step Method

1. **Listen Empathically** - Give full attention, match energy, use micro validations
2. **Validate the Emotion** - Identify specific emotion + offer justification
3. **Offer Advice/Help** - Only if appropriate, ask permission first
4. **Validate Again** - Re-validate at the end

## Project Structure

- `/app` - Next.js pages and routes
- `/components` - React components
- `/lib` - Utility functions (speech, OpenAI, validation analyzer)
- `/data` - Scenario data and reference materials
- `/types` - TypeScript type definitions

## Technologies

- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- OpenAI GPT-4
- Web Speech API
