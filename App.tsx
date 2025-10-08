import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateProblem, stringifyQuestion } from './services/geminiService';
import { GameState, FeedbackType, PerformanceRecord, QuizItem, GameMode } from './types';
import { evaluateExpression } from './utils/evaluator';
import { generateStandardProblem } from './utils/fallbackGenerator';
import QuestionRenderer from './components/QuestionRenderer';
import Numpad from './components/Numpad';

const CORRECT_STREAK_TO_LEVEL_UP = 3;
const WRONG_STREAK_TO_LEVEL_DOWN = 2;

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.Start);
  const [problem, setProblem] = useState<QuizItem | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceRecord[]>([]);
  const [feedback, setFeedback] = useState<FeedbackType>(FeedbackType.None);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [notification, setNotification] = useState<string | null>(null);
  const [madeMistake, setMadeMistake] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  // Mode state
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.AI);
  const [apiLimitReached, setApiLimitReached] = useState<boolean>(false);
  
  // Standard mode state
  const [standardLevel, setStandardLevel] = useState(1);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [consecutiveWrongs, setConsecutiveWrongs] = useState(0);
  const [seenStandardProblems, setSeenStandardProblems] = useState<Record<number, Set<number>>>({});
  const [lastTimeTaken, setLastTimeTaken] = useState<number | null>(null);

  const startTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = () => {
    if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
    }
  };

  const fetchNewProblem = useCallback(async (
      levelOverride?: number,
      seenOverride?: Record<number, Set<number>>
    ) => {
    setGameState(GameState.Loading);
    setFeedback(FeedbackType.None);
    setUserAnswer('');
    setMadeMistake(false);
    clearTimers();

    if (gameMode === GameMode.Standard) {
      const currentLevel = levelOverride ?? standardLevel;
      const currentSeenProblems = seenOverride ?? seenStandardProblems;

      // Show decimal notification on first encounter with level 6+
      if (currentLevel >= 6 && !localStorage.getItem('seenDecimalNotification')) {
        setNotification("Heads up! Decimal answers are rounded to the hundredths place.");
        localStorage.setItem('seenDecimalNotification', 'true');
        setTimeout(() => setNotification(null), 4000);
      }

      const problemResult = generateStandardProblem(currentLevel, currentSeenProblems);

      if (problemResult.problem) {
        setProblem(problemResult.problem);
        setSeenStandardProblems(problemResult.updatedSeenProblems);
        setGameState(GameState.Playing);
      } else { // No problems left in this level
        const isLoopingBack = currentLevel >= 10;
        const nextLevel = isLoopingBack ? 7 : currentLevel + 1;
        const nextSeenProblems = isLoopingBack ? {} : problemResult.updatedSeenProblems;
        
        setStandardLevel(nextLevel);
        setConsecutiveCorrect(0);
        
        // This recursive call immediately fetches a problem for the new level
        return fetchNewProblem(nextLevel, nextSeenProblems);
      }
      return;
    }

    // AI Mode Logic
    try {
      const history = performanceHistory.slice(-10);
      const newProblemData = await generateProblem(history);
      const calculatedAnswer = evaluateExpression(newProblemData.question);
      
      const newQuizItem: QuizItem = {
          question: newProblemData.question,
          answer: calculatedAnswer,
          difficultyAdjustment: newProblemData.difficultyAdjustment,
          estimatedTime: newProblemData.estimatedTime,
      };

      setProblem(newQuizItem);
      setGameState(GameState.Playing);
    } catch (error) {
      console.error("Gemini API error, switching to standard mode.", error);
      setApiLimitReached(true);
      setGameMode(GameMode.Standard);
      setNotification("AI is resting. Switched to Standard Mode!");
      setTimeout(() => setNotification(null), 4000);
      // Fetch a standard problem instead of failing
      return fetchNewProblem();
    }
  }, [performanceHistory, gameMode, standardLevel, seenStandardProblems]);
  
  const handleAnswerSubmit = useCallback((timedOut = false) => {
    if (gameState !== GameState.Playing || !problem) return;
    
    clearTimers();
    const timeTaken = (Date.now() - startTimeRef.current) / 1000;
    setLastTimeTaken(parseFloat(timeTaken.toFixed(1)));
    
    const parsedUserAnswer = parseFloat(userAnswer);
    const isNumericallyCorrect = !isNaN(parsedUserAnswer) && Math.abs(parsedUserAnswer - problem.answer) < 0.01;
    const wasCorrect = !timedOut && isNumericallyCorrect;
    const performanceCorrect = wasCorrect && !madeMistake;

    let nextProblemDelay = 2500;

    if (wasCorrect) {
        setFeedback(FeedbackType.Correct);
        if (performanceCorrect) {
            if (gameMode === GameMode.Standard) {
                setConsecutiveWrongs(0);
                const newStreak = consecutiveCorrect + 1;
                if (newStreak >= CORRECT_STREAK_TO_LEVEL_UP) {
                    setStandardLevel(prev => Math.min(10, prev + 1));
                    setConsecutiveCorrect(0);
                } else {
                    setConsecutiveCorrect(newStreak);
                }
            }
            const timeBonus = Math.max(0, problem.estimatedTime - timeTaken);
            const points = 50 + Math.round(timeBonus * 5);
            setScore(prev => prev + Math.max(10, points));
        }
        nextProblemDelay = 750;
    } else {
        setFeedback(FeedbackType.Incorrect);
        setCorrectAnswer(problem.answer);
        if (gameMode === GameMode.Standard) {
           setConsecutiveCorrect(0);
           const newWrongs = consecutiveWrongs + 1;
           if (newWrongs >= WRONG_STREAK_TO_LEVEL_DOWN) {
              setStandardLevel(prev => Math.max(1, prev - 1));
              setConsecutiveWrongs(0);
           } else {
              setConsecutiveWrongs(newWrongs);
           }
        }
    }

    const record: PerformanceRecord = {
      question: stringifyQuestion(problem.question),
      correctAnswer: problem.answer,
      userAnswer: isNaN(parsedUserAnswer) ? null : parsedUserAnswer,
      timeTaken: parseFloat(timeTaken.toFixed(2)),
      estimatedTime: problem.estimatedTime,
      correct: performanceCorrect,
      difficultyAdjustment: problem.difficultyAdjustment,
    };
    setPerformanceHistory(prev => [...prev, record]);

    setGameState(GameState.Feedback);
    setTimeout(() => {
        fetchNewProblem();
    }, nextProblemDelay);
  }, [gameState, problem, userAnswer, fetchNewProblem, madeMistake, gameMode, consecutiveCorrect, consecutiveWrongs]);

  useEffect(() => {
    if (gameState === GameState.Playing && problem) {
      startTimeRef.current = Date.now();
      setTimeElapsed(0);
      timerIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setTimeElapsed(elapsed);

        if (gameMode === GameMode.Standard && elapsed >= problem.estimatedTime) {
            handleAnswerSubmit(true);
        }
      }, 100);
    }
    return () => clearTimers();
  }, [gameState, problem, gameMode, handleAnswerSubmit]);
  
  useEffect(() => {
    if (gameState !== GameState.Playing || !problem || userAnswer === '' || userAnswer === '-') {
      return;
    }

    const parsedUserAnswer = parseFloat(userAnswer);
    if (!isNaN(parsedUserAnswer) && Math.abs(parsedUserAnswer - problem.answer) < 0.01) {
      handleAnswerSubmit(false);
    }
  }, [userAnswer, gameState, problem, handleAnswerSubmit]);

  const startGame = () => {
    setScore(0);
    setPerformanceHistory([]);
    setNotification(null);
    setStandardLevel(1);
    setConsecutiveCorrect(0);
    setConsecutiveWrongs(0);
    setSeenStandardProblems({});
    localStorage.removeItem('seenDecimalNotification');
    clearTimers();
    fetchNewProblem();
  };

  const handleNumpadInput = (key: string) => {
    if (gameState === GameState.Feedback) return;

    if (key === 'backspace' && !madeMistake) {
        setMadeMistake(true);
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 400);
    }

    setUserAnswer(prev => {
        if (key === 'backspace') return prev.slice(0, -1);
        if (key === '-') return prev.startsWith('-') ? prev.substring(1) : '-' + prev;
        if (key === '.') {
            if (prev.includes('.')) return prev;
            return (prev === '' || prev === '-') ? prev + '0.' : prev + '.';
        }
        return prev + key;
    });
  };

  const renderContent = () => {
    switch (gameState) {
      case GameState.Start:
        return (
          <div className="text-center animate-fadeIn p-4">
            <h1 className="text-6xl md:text-8xl font-kalam font-bold mb-4 text-pencil">Mental Math</h1>
            <h2 className="text-3xl md:text-5xl font-kalam font-bold mb-8 text-pencil opacity-80">Pop Quiz!</h2>
            <p className="text-lg text-pencil/80 mb-10 max-w-lg mx-auto font-roboto-slab">
              {gameMode === GameMode.AI ? 'An adaptive quiz that gets harder or easier based on your speed and accuracy.' : 'A 10-level challenge. Get 3 in a row to level up!'}
            </p>
            <button
              onClick={startGame}
              className="font-bold font-roboto-slab text-xl bg-highlighter text-pencil py-4 px-12 rounded-lg transition-transform duration-200 transform hover:scale-105 border-2 border-pencil/20 shadow-lg"
            >
              Start Quiz
            </button>
          </div>
        );
      case GameState.Loading:
        return (
            <div className="flex flex-col items-center justify-center space-y-4 animate-fadeIn">
                 <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-pencil/50"></div>
                 <p className="font-roboto-slab text-pencil/70">Crafting a new problem...</p>
            </div>
        );
      case GameState.Playing:
      case GameState.Feedback:
        const isStandardMode = gameMode === GameMode.Standard;
        const animationClass = feedback === FeedbackType.Correct ? 'animate-pulseCorrect' : feedback === FeedbackType.Incorrect ? 'animate-pulseIncorrect' : '';
        
        const progressPercentage = problem 
            ? isStandardMode
                ? Math.max(0, ((problem.estimatedTime - timeElapsed) / problem.estimatedTime) * 100)
                : Math.min(100, (timeElapsed / problem.estimatedTime) * 100)
            : 0;

        let progressColorClass = 'bg-correct';
        if (isStandardMode) {
            if (progressPercentage < 50) progressColorClass = 'bg-yellow-400';
            if (progressPercentage < 25) progressColorClass = 'bg-incorrect';
        } else {
            if (progressPercentage > 60) progressColorClass = 'bg-yellow-400';
            if (progressPercentage > 85) progressColorClass = 'bg-incorrect';
        }

        return (
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center animate-fadeIn">
             <div className="absolute top-[-70px] sm:top-4 right-4 text-right font-roboto-slab">
              <p className="text-xl font-bold text-pencil">Score: {score}</p>
              {gameMode === GameMode.Standard && (
                <p className="text-md text-pencil/70">Level: {standardLevel} (Streak: {consecutiveCorrect}/{CORRECT_STREAK_TO_LEVEL_UP})</p>
              )}
            </div>

            <div className={`w-full text-center p-6 md:p-8 bg-white/60 rounded-xl shadow-lg border-2 border-pencil/20 ${animationClass}`}>
              
              {problem && (gameState === GameState.Playing || gameState === GameState.Feedback) && (
                <div className="w-full max-w-md mx-auto mb-6">
                  <div className="flex justify-between text-sm font-roboto-slab text-pencil/70 mb-1 px-1">
                    <span>{isStandardMode ? 'Time Left' : 'Time'}</span>
                    <span>Target: {problem.estimatedTime}s</span>
                  </div>
                  <div className="w-full bg-pencil/10 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full transition-all duration-100 ease-linear ${progressColorClass}`}
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="min-h-[80px] flex items-center justify-center mb-8 overflow-hidden">
                {problem && <QuestionRenderer parts={problem.question} />}
              </div>
              
              <div className={`w-full max-w-md mx-auto bg-paper/80 text-center text-4xl font-roboto-slab py-4 px-6 rounded-lg border-b-4 border-pencil/30 min-h-[76px] flex items-center justify-center ${isShaking ? 'animate-shake' : ''}`}>
                <span className={`truncate ${userAnswer ? 'text-pencil' : 'text-pencil/30'}`}>
                    {userAnswer || 'Answer'}
                </span>
                {gameState === GameState.Playing && (
                    <span className="animate-pulse text-pencil/50 ml-1 text-5xl font-thin select-none">|</span>
                )}
              </div>
              
              <Numpad
                onInput={handleNumpadInput}
                disabled={gameState === GameState.Feedback}
              />
            </div>
            
            <div className="h-16 mt-6 text-center">
              {feedback !== FeedbackType.None && problem && (
                <div className="animate-fadeIn">
                  {feedback === FeedbackType.Correct && <p className="text-correct text-2xl font-bold font-roboto-slab">Correct!</p>}
                  {feedback === FeedbackType.Incorrect && (
                    <div className="text-incorrect">
                      <span className="text-lg block">Correct answer:</span>
                      <span className="text-2xl font-bold font-roboto-slab">{correctAnswer}</span>
                    </div>
                  )}
                   <p className="text-pencil/70 font-roboto-slab mt-1">
                    Your time: <span className="font-bold">{lastTimeTaken}s</span> (Limit: {problem.estimatedTime}s)
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 bg-paper font-roboto-slab relative">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/lined-paper.png')] opacity-20"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-paper via-paper/50 to-transparent"></div>
      
      {notification && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-yellow-400 text-pencil font-bold font-roboto-slab px-6 py-3 rounded-lg shadow-lg animate-fadeIn z-50">
          {notification}
        </div>
      )}

      <div className="absolute top-4 left-4 z-20">
          <div className="flex items-center space-x-1 bg-white/80 p-1 rounded-full shadow border-2 border-pencil/10" role="radiogroup">
              <button
                  onClick={() => !apiLimitReached && setGameMode(GameMode.AI)}
                  disabled={apiLimitReached}
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full font-bold text-sm sm:text-base transition-all duration-300 ${gameMode === GameMode.AI ? 'bg-highlighter text-pencil shadow-inner' : 'text-pencil/60 hover:bg-paper'} ${apiLimitReached ? 'cursor-not-allowed opacity-50' : ''}`}
                  role="radio"
                  aria-checked={gameMode === GameMode.AI}
              >
                  AI Live
              </button>
              <button
                  onClick={() => setGameMode(GameMode.Standard)}
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full font-bold text-sm sm:text-base transition-all duration-300 ${gameMode === GameMode.Standard ? 'bg-highlighter text-pencil shadow-inner' : 'text-pencil/60 hover:bg-paper'}`}
                  role="radio"
                  aria-checked={gameMode === GameMode.Standard}
              >
                  Standard
              </button>
          </div>
      </div>

      <div className="relative z-10 w-full">
        {renderContent()}
      </div>
    </main>
  );
};

export default App;