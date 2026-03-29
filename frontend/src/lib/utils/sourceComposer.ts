import { SourceType } from '../../types/ai.types';

interface ComposeSourceContentOptions {
  input: string;
  sourceContent: string;
  sourceType: SourceType;
  sourceLabel: string;
}

const toTrimmed = (value: string) => value.trim();

export const hasManualAndAttachedSource = (input: string, sourceContent: string) =>
  toTrimmed(input).length > 0 && toTrimmed(sourceContent).length > 0;

export const getComposedSourceLabel = ({
  input,
  sourceContent,
  sourceLabel,
}: Pick<ComposeSourceContentOptions, 'input' | 'sourceContent' | 'sourceLabel'>) =>
  hasManualAndAttachedSource(input, sourceContent) ? `Manual + ${sourceLabel}` : sourceLabel;

export const composeSourceContent = ({
  input,
  sourceContent,
  sourceType,
  sourceLabel,
}: ComposeSourceContentOptions) => {
  const manualInput = toTrimmed(input);
  const attachedSource = toTrimmed(sourceContent);

  if (manualInput && attachedSource) {
    return [
      'Manual Notes:',
      manualInput,
      '',
      `Attached Source (${sourceType.toUpperCase()} - ${sourceLabel}):`,
      attachedSource,
    ].join('\n');
  }

  return manualInput || attachedSource;
};
