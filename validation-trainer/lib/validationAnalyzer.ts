import invalidatingPhrasesData from '@/data/invalidatingPhrases.json';
import microValidationsData from '@/data/microValidations.json';
import { ValidationFeedback } from '@/types/validation';

const invalidatingPhrases = invalidatingPhrasesData as { phrases: string[]; patterns: string[] };
const microValidations = microValidationsData as { phrases: string[] };

// Four-Step Method tracking
type FourStepStage = 'listening' | 'validating' | 'advising' | 'revalidating';

export function analyzeResponse(
  response: string,
  emotions: string[],
  conversationTurn: number = 1
): ValidationFeedback {
  const lowerResponse = response.toLowerCase();
  
  // Determine expected stage based on conversation turn
  const expectedStage: FourStepStage = conversationTurn === 1 ? 'listening' : 'validating';
  
  // Check for specific emotion identification
  const identifiedEmotion = emotions.some(emotion => 
    lowerResponse.includes(emotion.toLowerCase())
  ) || 
  // Check for common emotion words
  /\b(frustrated|worried|angry|sad|excited|proud|overwhelmed|exhausted|hurt|confused|anxious|trapped|lonely|guilty|embarrassed|relieved|conflicted|torn|inadequate|jealous|defensive|emotional|hopeful|isolated)\b/i.test(response);

  // Check for justification phrases (Step 2)
  const justificationPatterns = [
    /because/i,
    /especially/i,
    /given that/i,
    /it makes sense/i,
    /i don't blame you/i,
    /i can see why/i,
    /that would be/i,
    /i'd feel/i,
    /anyone would/i,
    /of course you/i,
    /no wonder/i,
    /i can hear/i,
    /i get why/i,
    /you have every right/i,
  ];
  const offeredJustification = justificationPatterns.some(pattern => 
    pattern.test(response)
  );
  
  // Check for curiosity/listening questions (Step 1)
  const listeningQuestions = [
    /what happened/i,
    /tell me more/i,
    /how are you feeling/i,
    /what's going on/i,
    /what's up/i,
    /what do you mean/i,
    /can you explain/i,
    /help me understand/i,
  ];
  const askedListeningQuestion = listeningQuestions.some(pattern => pattern.test(response));

  // Check for micro validations
  const usedMicroValidations = microValidations.phrases.some(phrase =>
    lowerResponse.includes(phrase.toLowerCase())
  );

  // Check for invalidating phrases
  const invalidatingPhraseFound = invalidatingPhrases.phrases.some(phrase =>
    lowerResponse.includes(phrase.toLowerCase())
  ) || invalidatingPhrases.patterns.some(pattern => {
    const regex = new RegExp(pattern, 'i');
    return regex.test(response);
  });

  // Check for premature fixing (advice before validation)
  const advicePhrases = [
    /you should/i,
    /why don't you/i,
    /have you tried/i,
    /here's what/i,
    /you need to/i,
    /try/i,
  ];
  const prematureFix = advicePhrases.some(pattern => pattern.test(response)) &&
    !offeredJustification;

  // Check for asking permission before advice
  const permissionPhrases = [
    /how can i help/i,
    /would you like/i,
    /may i/i,
    /can i/i,
    /what would/i,
  ];
  const askedPermission = permissionPhrases.some(pattern => 
    pattern.test(response)
  );

  // Check for "I" statements vs "You" statements (when giving feedback)
  const iStatements = /\b(i feel|i think|i notice|i see|i understand|i'm)/i.test(response);
  const youStatements = /\b(you always|you never|you should|you need|you're wrong)/i.test(response);
  const usedIStatements = iStatements && !youStatements;

  // Check for absolutes
  const absolutes = /\b(always|never|constantly)\b/i.test(response);
  const avoidedAbsolutes = !absolutes;
  
  // Check for "but" usage (negates validation)
  const usedBut = /\b(but|however)\b/i.test(response);
  const usedAndInstead = /\band\b/i.test(response) && !usedBut;
  
  // Check for empathy markers
  const empathyMarkers = [
    /i can imagine/i,
    /i can only imagine/i,
    /i can't imagine/i,
    /i understand/i,
    /i hear you/i,
    /i see/i,
    /i get it/i,
    /i feel/i,
  ];
  const showedEmpathy = empathyMarkers.some(pattern => pattern.test(response));
  
  // Check for relating to their experience
  const relatingPhrases = [
    /i've felt/i,
    /i've been there/i,
    /i remember/i,
    /i had a similar/i,
    /i can relate/i,
    /that reminds me/i,
  ];
  const relatedToExperience = relatingPhrases.some(pattern => pattern.test(response));

  // Simple energy matching based on punctuation and word choice
  const hasExclamation = /!/.test(response);
  const hasPositiveEnergy = /\b(amazing|great|fantastic|awesome|wonderful|exciting|proud)\b/i.test(response);
  const matchedEnergy = hasExclamation || hasPositiveEnergy || true; // Default to true for now

  // Calculate score - weight each element appropriately
  // Note: askedPermission and !prematureFix can both add points, but they measure different things
  let score = 0;
  if (identifiedEmotion) score += 20;
  if (offeredJustification) score += 20;
  if (usedMicroValidations) score += 12;
  if (!invalidatingPhraseFound) score += 15;
  if (!prematureFix) score += 10;
  if (askedPermission || !prematureFix) score += 8;
  if (askedListeningQuestion) score += 5;
  if (matchedEnergy) score += 3;
  if (usedIStatements) score += 3;
  if (avoidedAbsolutes) score += 2;
  if (!usedBut) score += 2;
  if (showedEmpathy) score += 3;
  if (relatedToExperience) score += 2;

  // Scale to 100 max - theoretical max is around 105 but we cap at 100
  score = Math.min(100, score);

  // Generate feedback lists
  const positives: string[] = [];
  const mistakes: string[] = [];
  const suggestions: string[] = [];

  if (identifiedEmotion) {
    positives.push('Identified specific emotion');
  } else {
    mistakes.push("Didn't identify a specific emotion");
    suggestions.push('Try naming the emotion: "That sounds frustrating" or "You seem worried"');
  }

  if (offeredJustification) {
    positives.push('Offered justification for the emotion');
  } else {
    mistakes.push("Didn't explain why the emotion makes sense");
    suggestions.push('Add justification: "That makes sense because..." or "I don\'t blame you, especially since..."');
  }

  if (usedMicroValidations) {
    positives.push('Used validating phrases');
  } else {
    suggestions.push('Add micro validations: "That makes sense", "I can see that", "Wow"');
  }

  if (invalidatingPhraseFound) {
    mistakes.push('Used invalidating phrases');
    suggestions.push('Avoid phrases like "don\'t worry", "it could be worse", "at least"');
  }

  if (prematureFix) {
    mistakes.push('Jumped to advice before validating');
    suggestions.push('Validate first, then ask "How can I help?" before offering solutions');
  }

  if (!askedPermission && prematureFix) {
    suggestions.push('Ask permission before giving advice: "Would you like my thoughts?"');
  }

  if (!usedIStatements && youStatements) {
    mistakes.push('Used "you" statements that may feel accusatory');
    suggestions.push('Use "I" statements: "I feel like..." instead of "You always..."');
  }

  if (!avoidedAbsolutes) {
    mistakes.push('Used absolutes like "always" or "never"');
    suggestions.push('Replace absolutes with softer terms: "often" or "sometimes"');
  }
  
  if (usedBut) {
    mistakes.push('Used "but" which can negate your validation');
    suggestions.push('Try "and" instead: "I understand AND here\'s what I\'m thinking..."');
  }
  
  if (showedEmpathy) {
    positives.push('Showed empathy and understanding');
  }
  
  if (relatedToExperience) {
    positives.push('Related to their experience');
  }
  
  if (askedListeningQuestion) {
    positives.push('Asked open-ended questions to understand more');
  } else if (conversationTurn === 1) {
    suggestions.push('Try asking: "What happened?" or "Tell me more"');
  }
  
  // Four-Step Method guidance
  if (conversationTurn === 1 && !prematureFix) {
    positives.push('Good - focused on listening first, not jumping to solutions');
  }

  return {
    identifiedEmotion,
    offeredJustification,
    usedMicroValidations,
    avoidedInvalidating: !invalidatingPhraseFound,
    avoidedPrematureFix: !prematureFix,
    askedPermission,
    matchedEnergy,
    usedIStatements,
    avoidedAbsolutes,
    overallScore: Math.min(score, 100),
    positives,
    mistakes,
    suggestions,
    modelResponse: '', // Will be filled by OpenAI analysis
  };
}

