import React from 'react';
import { BackspaceIcon, IncreaseDifficultyIcon, SkipIcon } from './Icons';

interface NumpadProps {
  onInput: (key: string) => void;
  disabled?: boolean;
  userAnswer: string;
}

const NumpadButton: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}> = ({ onClick, children, className = '', disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`font-roboto-slab text-3xl font-bold h-16 text-pencil rounded-lg shadow-md border-b-4 border-pencil/20 bg-white/70 hover:bg-white/90 active:border-b-2 active:translate-y-0.5 transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-highlighter/80 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </button>
);

const Numpad: React.FC<NumpadProps> = ({ onInput, disabled, userAnswer }) => {
  const isEnterDisabled = disabled || userAnswer === '' || userAnswer === '-';
  return (
    <div className="w-full max-w-xs mx-auto mt-6">
        <div className="grid grid-cols-3 gap-3">
            <NumpadButton onClick={() => onInput('7')} disabled={disabled}>7</NumpadButton>
            <NumpadButton onClick={() => onInput('8')} disabled={disabled}>8</NumpadButton>
            <NumpadButton onClick={() => onInput('9')} disabled={disabled}>9</NumpadButton>
            <NumpadButton onClick={() => onInput('4')} disabled={disabled}>4</NumpadButton>
            <NumpadButton onClick={() => onInput('5')} disabled={disabled}>5</NumpadButton>
            <NumpadButton onClick={() => onInput('6')} disabled={disabled}>6</NumpadButton>
            <NumpadButton onClick={() => onInput('1')} disabled={disabled}>1</NumpadButton>
            <NumpadButton onClick={() => onInput('2')} disabled={disabled}>2</NumpadButton>
            <NumpadButton onClick={() => onInput('3')} disabled={disabled}>3</NumpadButton>
            <NumpadButton onClick={() => onInput('-')} disabled={disabled}>-</NumpadButton>
            <NumpadButton onClick={() => onInput('0')} disabled={disabled}>0</NumpadButton>
            <NumpadButton onClick={() => onInput('.')} disabled={disabled}>.</NumpadButton>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
            <button
              type="button"
              onClick={() => onInput('increase_difficulty')}
              disabled={disabled}
              aria-label="Increase Difficulty"
              className="w-full font-roboto-slab text-xl font-bold h-16 text-pencil rounded-lg shadow-md border-b-4 border-blue-400/20 bg-blue-200/70 hover:bg-blue-200/90 active:border-b-2 active:translate-y-0.5 transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-blue-400/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <IncreaseDifficultyIcon className="w-8 h-8"/>
            </button>
             <button
              type="button"
              onClick={() => onInput('backspace')}
              disabled={disabled}
              aria-label="Backspace"
              className="w-full font-roboto-slab text-xl font-bold h-16 text-pencil rounded-lg shadow-md border-b-4 border-red-400/20 bg-red-200/70 hover:bg-red-200/90 active:border-b-2 active:translate-y-0.5 transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-red-400/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <BackspaceIcon className="w-8 h-8"/>
            </button>
            <button
              type="button"
              onClick={() => onInput('skip')}
              disabled={disabled}
              aria-label="Skip Question"
              className="w-full font-roboto-slab text-xl font-bold h-16 text-pencil rounded-lg shadow-md border-b-4 border-yellow-400/20 bg-yellow-200/70 hover:bg-yellow-200/90 active:border-b-2 active:translate-y-0.5 transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-yellow-400/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <SkipIcon className="w-8 h-8"/>
            </button>
      </div>
      <div className="mt-3">
        <button
          type="button"
          onClick={() => onInput('enter')}
          disabled={isEnterDisabled}
          aria-label="Submit Answer"
          className="font-roboto-slab text-3xl font-bold h-16 text-white rounded-lg shadow-md border-b-4 border-green-700/50 bg-correct/90 hover:bg-correct active:border-b-2 active:translate-y-0.5 transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-highlighter/80 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-pencil/20 disabled:border-pencil/10 w-full flex items-center justify-center"
        >
          Enter
        </button>
      </div>
    </div>
  );
};

export default Numpad;