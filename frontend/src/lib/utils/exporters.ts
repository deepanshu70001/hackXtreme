import { GenerationResult } from '../../types/ai.types';

const sanitizeFileName = (value: string) =>
  value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
    .toLowerCase();

export const downloadFile = (content: string, fileName: string, contentType: string) => {
  const anchor = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  const objectUrl = URL.createObjectURL(file);
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  // Revoke after click settles to avoid occasional browser race conditions.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};

export const exportToJSON = (data: GenerationResult, fileName: string) => {
  const safeBase = sanitizeFileName(fileName) || 'copilot-insights';
  downloadFile(JSON.stringify(data, null, 2), `${safeBase}.json`, 'application/json');
};

export const exportToText = (data: GenerationResult, fileName: string) => {
  const safeBase = sanitizeFileName(fileName) || 'copilot-insights';
  const actionLines =
    data.actionItems.length > 0
      ? data.actionItems
          .map((item) => `[${item.priority.toUpperCase()}] ${item.task}${item.deadline ? ` (${item.deadline})` : ''}`)
          .join('\n')
      : 'None';
  const deadlineLines =
    data.deadlines.length > 0 ? data.deadlines.map((deadline) => `${deadline.due} - ${deadline.label}`).join('\n') : 'None';
  const flashcardLines =
    data.flashcards.length > 0
      ? data.flashcards.map((card) => `Q: ${card.question}\nA: ${card.answer}`).join('\n\n')
      : 'None';
  const slideLines =
    data.slides.length > 0
      ? data.slides.map((slide) => `${slide.title}\n${slide.points.map((point) => `- ${point}`).join('\n')}`).join('\n\n')
      : 'None';
  const text = [
    `SUMMARY\n=======\n${data.summary}\n`,
    `KEY POINTS\n==========\n${data.keyPoints.length > 0 ? data.keyPoints.join('\n') : 'None'}\n`,
    `ACTION ITEMS\n============\n${actionLines}\n`,
    `DEADLINES\n=========\n${deadlineLines}\n`,
    `FLASHCARDS\n==========\n${flashcardLines}\n`,
    `SLIDES\n======\n${slideLines}`,
  ].join('\n');

  downloadFile(text, `${safeBase}.txt`, 'text/plain');
};
