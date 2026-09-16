import { useEffect, useState } from 'react';
import { logger } from '@client/src/lib/logger';
import { quizApi } from '@/api';
import type { QuizQuestion, QuizResult } from '@shared/api.interface';
import QuizSetup from './QuizSetup';
import QuizInProgress from './QuizInProgress';
import QuizResultView from './QuizResultView';

type QuizPhase = 'setup' | 'inProgress' | 'result';

const QuizPage: React.FC = () => {
  const [phase, setPhase] = useState<QuizPhase>('setup');
  const [selectedBank, setSelectedBank] = useState<string>('all');
  const [selectedCount, setSelectedCount] = useState<number>(10);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['en2zh', 'zh2en']);
  const [selectedMode, setSelectedMode] = useState<string>('random');
  const [highScore, setHighScore] = useState<number>(0);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Array<{ userAnswer: string; correct: boolean }>>([]);
  const [elapsed, setElapsed] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [result, setResult] = useState<QuizResult | null>(null);

  // 計時器
  useEffect(() => {
    if (phase !== 'inProgress') return;
    const timer = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const startQuiz = async (): Promise<void> => {
    if (selectedTypes.length === 0) return;
    try {
      const bankOption = selectedBank;
      let bankVal: string | undefined;
      let levelVal: string | undefined;
      if (bankOption !== 'all') {
        const parts = bankOption.split('|');
        bankVal = parts[0];
        levelVal = parts[1] || undefined;
      }
      const qs = await quizApi.generateQuiz({
        count: selectedCount,
        bank: bankVal,
        level: levelVal,
        types: selectedTypes,
        mode: selectedMode,
      });
      setQuestions(qs);
      setAnswers([]);
      setCurrentIndex(0);
      setElapsed(0);
      setPhase('inProgress');
    } catch (err) {
      logger.error('start quiz failed', JSON.stringify(err));
    }
  };

  const handleAnswer = (answer: string): void => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;
    const correct = answer === currentQ.correctAnswer;
    setAnswers(prev => {
      const next = [...prev];
      next[currentIndex] = { userAnswer: answer, correct };
      return next;
    });
  };

  const handleNext = async (): Promise<void> => {
    if (currentIndex + 1 >= questions.length) {
      setIsSubmitting(true);
      try {
         const res = await quizApi.submitQuiz({
          quizType: selectedMode,
          bank: selectedBank,
          level: '',
          answers: questions.map((q: QuizQuestion, i: number) => ({
            wordId: q.word.id,
            userAnswer: answers[i]?.userAnswer ?? '',
            correct: answers[i]?.correct ?? false,
          })),
          durationSeconds: elapsed,
        });
        setResult(res);
        if (res.score > highScore) setHighScore(res.score);
        setPhase('result');
      } catch (err) {
        logger.error('submit quiz failed', JSON.stringify(err));
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const resetQuiz = (): void => {
    setPhase('setup');
    setQuestions([]);
    setAnswers([]);
    setResult(null);
    setCurrentIndex(0);
  };

  if (phase === 'setup') {
    return (
      <QuizSetup
        selectedBank={selectedBank}
        setSelectedBank={setSelectedBank}
        selectedCount={selectedCount}
        setSelectedCount={setSelectedCount}
        selectedTypes={selectedTypes}
        setSelectedTypes={setSelectedTypes}
        selectedMode={selectedMode}
        setSelectedMode={setSelectedMode}
        highScore={highScore}
        onStart={startQuiz}
      />
    );
  }

  if (phase === 'inProgress' && questions.length > 0) {
    return (
      <QuizInProgress
        questions={questions}
        currentIndex={currentIndex}
        elapsed={elapsed}
        answers={answers}
        onAnswer={handleAnswer}
        onNext={handleNext}
        isSubmitting={isSubmitting}
      />
    );
  }

  if (phase === 'result' && result) {
    return <QuizResultView result={result} onRetry={resetQuiz} />;
  }

  return null;
};

export default QuizPage;
