import React, { useReducer, useEffect, useCallback } from 'react';
import { GameState, GameMode, FeedbackType } from './types';
import { gameReducer, initialState } from './hooks/useGameReducer';
import { generateProblem } from './services/geminiService';
import { parseQuestionString } from './utils/mathProcessor';
import { generateStandardProblem } from './utils/fallbackGenerator';
import QuestionRenderer from './components/QuestionRenderer';
import Numpad from './components/Numpad';

const CORRECT_STREAK_TO_LEVEL_UP = 3;
const WRONG_STREAK_TO_LEVEL_DOWN = 2;

const StartScreen = ({ dispatch, gameMode }: { dispatch: React.Dispatch<any>, gameMode: GameMode }) => (
  <div className="text-center animate-fadeIn p-4">
    <h1 className="text-6xl md:text-8xl font-kalam font-bold mb-4 text-pencil">Mental Math</h1>
    <h2 className="text-3xl md:text-5xl font-kalam font-bold mb-8 text-pencil opacity-80">Pop Quiz!</h2>
    <p className="text-lg text-pencil/80 mb-10 max-w-lg mx-auto font-roboto-slab">
      {gameMode === GameMode.AI ? 'An adaptive quiz that gets harder or easier based on your speed and accuracy.' : 'A 10-level challenge. Get 3 in a row to level up!'}
    </p>
    <button
      onClick={() => dispatch({ type: 'START_GAME' })}
      className="font-bold font-roboto-slab text-xl bg-highlighter text-pencil py-4 px-12 rounded-lg transition-transform duration-200 transform hover:scale-105 border-2 border-pencil/20 shadow-lg"
    >
      Start Quiz
    </button>
  </div>
);

const LoadingScreen = () => (
    <div className="flex flex-col items-center justify-center space-y-4 animate-fadeIn">
         <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-pencil/50"></div>
         <p className="font-roboto-slab text-pencil/70">Crafting a new problem...</p>
    </div>
);

const GameScreen = ({ state, dispatch, handleNumpadInput }: { state: any, dispatch: React.Dispatch<any>, handleNumpadInput: (key: string) => void }) => {
    const { gameState, problem, userAnswer, feedback, score, standardLevel, consecutiveCorrect, isShaking, correctAnswer, lastTimeTaken, timeElapsed } = state;
    const isStandardMode = state.gameMode === GameMode.Standard;
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
              {isStandardMode && (
                <p className="text-md text-pencil/70">Level: {standardLevel} (Streak: {consecutiveCorrect}/{CORRECT_STREAK_TO_LEVEL_UP})</p>
              )}
            </div>

            <div className={`w-full text-center p-6 md:p-8 bg-white/60 rounded-xl shadow-lg border-2 border-pencil/20 ${animationClass}`}>
              
              {problem && (
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
                userAnswer={userAnswer}
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
};


const App: React.FC = () => {
    const [state, dispatch] = useReducer(gameReducer, initialState);
    const { gameState, gameMode, apiLimitReached, notification, problem, userAnswer } = state;

    const fetchStandardProblem = useCallback((level: number) => {
        dispatch({ type: 'FETCH_PROBLEM_START' });
        try {
            if (level >= 6 && !localStorage.getItem('seenDecimalNotification')) {
              dispatch({ type: 'SET_NOTIFICATION', payload: "Heads up! Decimal answers are rounded to the hundredths place." });
              localStorage.setItem('seenDecimalNotification', 'true');
            }
            const { problem } = generateStandardProblem(level);
            dispatch({ type: 'FETCH_PROBLEM_SUCCESS', payload: problem });
        } catch (error) {
            console.error("Failed to generate standard problem", error);
            dispatch({ type: 'FETCH_PROBLEM_FAILURE', payload: 'Failed to generate a standard problem.' });
        }
    }, []);

    const fetchAIProblem = useCallback(async (history: any[]) => {
        dispatch({ type: 'FETCH_PROBLEM_START' });
        let retries = 3;
        while (retries > 0) {
            try {
                const newProblemData = await generateProblem(history);
                
                // We no longer calculate the answer. We parse the string for rendering.
                const questionParts = parseQuestionString(newProblemData.questionString);
                
                const newQuizItem = {
                    ...newProblemData,
                    question: questionParts,
                };

                dispatch({ type: 'FETCH_PROBLEM_SUCCESS', payload: newQuizItem });
                return; 
            } catch (error: any) {
                console.warn(`Failed to fetch a valid AI problem. Retries left: ${retries - 1}`, error.message);
                retries--;
                if (retries === 0) {
                    console.error("Gemini API error after multiple retries, switching to standard mode.", error);
                    dispatch({ type: 'API_LIMIT_REACHED' });
                    fetchStandardProblem(state.standardLevel);
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, 250));
            }
        }
    }, [fetchStandardProblem, state.standardLevel]);

    const handleFetchNewProblem = useCallback(() => {
        if (state.gameMode === GameMode.Standard) {
            fetchStandardProblem(state.standardLevel);
        } else {
            fetchAIProblem(state.performanceHistory);
        }
    }, [state.gameMode, state.standardLevel, state.performanceHistory, fetchStandardProblem, fetchAIProblem]);
    
    // Effect for game state transitions
    useEffect(() => {
      if (state.needsNewProblem) {
          const delay = state.feedback === FeedbackType.Correct ? 750 : 2500;
          const timer = setTimeout(() => {
              handleFetchNewProblem();
          }, delay);
          return () => clearTimeout(timer);
      }
    }, [state.needsNewProblem, state.feedback, handleFetchNewProblem]);
    
    // Timer effect
    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;
        if (gameState === GameState.Playing && problem) {
            const startTime = Date.now();
            interval = setInterval(() => {
                const elapsed = (Date.now() - startTime) / 1000;
                dispatch({ type: 'UPDATE_TIMER', payload: elapsed });

                if (gameMode === GameMode.Standard && elapsed >= problem.estimatedTime) {
                    dispatch({ type: 'SUBMIT_ANSWER', payload: { timedOut: true } });
                }
            }, 100);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [gameState, problem, gameMode]);
    
    // Effect to start the game
    useEffect(() => {
        if(state.needsToStart) {
            handleFetchNewProblem();
        }
    }, [state.needsToStart, handleFetchNewProblem]);

    // Effect to clear notifications
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                dispatch({ type: 'SET_NOTIFICATION', payload: null });
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const handleNumpadInput = (key: string) => {
        if (gameState === GameState.Feedback) return;

        if (key === 'enter') {
            dispatch({ type: 'SUBMIT_ANSWER', payload: { timedOut: false } });
            return;
        }
        if (key === 'increase_difficulty') {
            dispatch({ type: 'INCREASE_DIFFICULTY' });
            return;
        }
        if (key === 'skip') {
            dispatch({ type: 'SKIP_QUESTION' });
            return;
        }
        dispatch({ type: 'UPDATE_USER_ANSWER', payload: key });
    };

    const renderContent = () => {
        switch (gameState) {
            case GameState.Start:
                return <StartScreen dispatch={dispatch} gameMode={gameMode} />;
            case GameState.Loading:
                return <LoadingScreen />;
            case GameState.Playing:
            case GameState.Feedback:
                return <GameScreen state={state} dispatch={dispatch} handleNumpadInput={handleNumpadInput} />;
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
                        onClick={() => !apiLimitReached && dispatch({ type: 'SET_GAME_MODE', payload: GameMode.AI })}
                        disabled={apiLimitReached}
                        className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full font-bold text-sm sm:text-base transition-all duration-300 ${gameMode === GameMode.AI ? 'bg-highlighter text-pencil shadow-inner' : 'text-pencil/60 hover:bg-paper'} ${apiLimitReached ? 'cursor-not-allowed opacity-50' : ''}`}
                        role="radio"
                        aria-checked={gameMode === GameMode.AI}
                    >
                        AI Live
                    </button>
                    <button
                        onClick={() => dispatch({ type: 'SET_GAME_MODE', payload: GameMode.Standard })}
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