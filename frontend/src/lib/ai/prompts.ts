import { Mode, SourceType } from '../../types/ai.types';

const MODE_GUIDANCE: Record<Mode, string> = {
  study: 'Bias toward concept clarity, definitions, recall-friendly flashcards, and learning checkpoints.',
  work: 'Bias toward executive clarity, deliverables, project momentum, and next-step ownership.',
  meeting: 'Bias toward decisions, follow-ups, owners, dependencies, and implied deadlines.',
};

const SOURCE_GUIDANCE: Record<SourceType, string> = {
  text: 'Treat the input as direct notes or copied content.',
  pdf: 'Treat the input as extracted PDF text and repair formatting when needed.',
  youtube: 'Treat the input as a transcript copied from captions or a browser extension.',
};

export const OUTPUT_JSON_SHAPE = `{
  "title": "A 3-5 word dynamic title reflecting the core topic",
  "summary": "2-3 short sentences",
  "key_points": ["max 4 items"],
  "action_items": [{"task": "...", "priority": "high|medium|low", "deadline": "optional"}],
  "deadlines": [{"label": "...", "due": "...", "confidence": "explicit|inferred"}],
  "follow_up_email": "A professional follow-up email draft based on the content",
  "flashcards": [{"question": "...", "answer": "..."}],
  "slides": [{"title": "...", "points": ["..."]}]
}`;

export const buildRunAnywherePrompt = ({
  content,
  mode,
  sourceType,
}: {
  content: string;
  mode: Mode;
  sourceType: SourceType;
}) => `You are Local AI Content Copilot.

Mode: ${mode.toUpperCase()} - ${MODE_GUIDANCE[mode]}
Source: ${sourceType.toUpperCase()} - ${SOURCE_GUIDANCE[sourceType]}

Output rules:
- Return JSON only.
- Keep the result compact and high-signal.
- title: A dynamic, 3 to 5 word title reflecting the specific content.
- summary: 2 to 3 short sentences.
- key_points: max 4 items.
- action_items: max 4 items.
- deadlines: max 3 items.
- follow_up_email: professional follow up email draft.
- flashcards: max 4 items.
- slides: max 4 items.
- If there are no deadlines, return [].

Return strictly valid JSON that matches:
${OUTPUT_JSON_SHAPE}

Content:
${content}`;
