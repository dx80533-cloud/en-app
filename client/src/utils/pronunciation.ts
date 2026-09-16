import { logger } from '@lark-apaas/client-toolkit/logger';

export function isSpeechSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window
  );
}

export function speak(word: string, rate: number = 0.9): void {
  if (!isSpeechSupported()) {
    logger.warn('Speech synthesis is not supported in this browser');
    return;
  }

  try {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onerror = (event: SpeechSynthesisErrorEvent): void => {
      logger.error('Speech synthesis error', { error: event.error });
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    logger.error('speak failed', { word, err: JSON.stringify(err) });
  }
}
