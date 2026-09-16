import { useState } from 'react';
import { logger } from '@client/src/lib/logger';
import { listeningApi } from '@/api';
import type {
  ListeningQuestionType, ListeningQuestion, ListeningResult } from '@shared/api.interface';
import ListeningSetup from './ListeningSetup';
import ListeningInProgress from './ListeningInProgress';
import ListeningResultView from './ListeningResultView';

type ListeningPhase = 'setup' | 'inProgress' | 'result';

const ListeningPage: React.FC = () => {
  const [phase, setPhase] = useState<ListeningPhase>('setup');
  const [selectedLevel, setSelectedLevel] = useState<string>('初級');
  const [selectedCount, setSelectedCount] = useState<number>(10);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['listen2zh', 'listenSentence', 'listenSpell']);
  const [selectedMode, setSelectedMode] = useState<string>('random');
  const [bestScore, setBestScore] = useState<number>(0);

  const [questions, setQuestions] = useState<ListeningQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Array<{ userAnswer: string; correct: boolean; type: string }>>([]);
  const [elapsed, setElapsed] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [result, setResult] = useState<ListeningResult | null>(null);

  const startListening = async (): Promise<void> => {
    if (selectedTypes.length === 0) return;
    try {
      const qs = await listeningApi.generateListening({
        count: selectedCount,
        bank: 'gept',
        level: selectedLevel,
        types: selectedTypes as ListeningQuestionType[],
        mode: selectedMode as 'random' | 'review' | 'weak',
      });
      setQuestions(qs);
      setAnswers([]);
      setCurrentIndex(0);
      setElapsed(0);
      setPhase('inProgress');
    } catch (err) {
      logger.error('start listening failed', JSON.stringify(err));
    }
  };

  const handleAnswer = (answer: string): void => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;
    const correct = answer === currentQ.correctAnswer;
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = { userAnswer: answer, correct, type: currentQ.type };
      return next;
    });
  };

  const handleNext = async (): Promise<void> => {
    if (currentIndex + 1 >= questions.length) {
      setIsSubmitting(true);
      try {
        const res = await listeningApi.submitListening({
          bank: 'gept',
          level: selectedLevel,
          answers: questions.map((q: ListeningQuestion, i: number) => ({
            wordId: q.word.id,
            userAnswer: answers[i]?.userAnswer ?? '',
            correct: answers[i]?.correct ?? false,
            type: q.type,
          })),
          durationSeconds: elapsed,
        });
        setResult(res);
        if (res.score > bestScore) setBestScore(res.score);
        setPhase('result');
      } catch (err) {
        logger.error('submit listening failed', JSON.stringify(err));
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const resetListening = (): void => {
    setPhase('setup');
    setQuestions([]);
    setAnswers([]);
    setResult(null);
    setCurrentIndex(0);
    setElapsed(0);
  };

  if (phase === 'setup') {
    return (
      <ListeningSetup
        selectedLevel={selectedLevel}
        setSelectedLevel={setSelectedLevel}
        selectedCount={selectedCount}
        setSelectedCount={setSelectedCount}
        selectedTypes={selectedTypes}
        setSelectedTypes={setSelectedTypes}
        selectedMode={selectedMode}
        setSelectedMode={setSelectedMode}
        bestScore={bestScore}
        onStart={startListening}
      />
    );
  }

  if (phase === 'inProgress') {
    return (
      <ListeningInProgress
        questions={questions}
        currentIndex={currentIndex}
        elapsed={elapsed}
        setElapsed={setElapsed}
        answers={answers}
        onAnswer={handleAnswer}
        onNext={handleNext}
        isSubmitting={isSubmitting}
      />
    );
  }

  return (
    <ListeningResultView
      result={result}
      onRetry={startListening}
      onBack={resetListening}
    />
  );
};

export default ListeningPage;
