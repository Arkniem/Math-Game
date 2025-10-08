import React, { useState, useRef, useLayoutEffect } from 'react';
import { QuestionPart } from '../types';

// This is a purely recursive component responsible for rendering the visual structure.
const RecursiveRenderer: React.FC<{ parts: QuestionPart[] }> = ({ parts }) => (
  <div className="flex items-center justify-center flex-nowrap gap-x-3 gap-y-2">
    {(parts || []).map((part, index) => {
      switch (part.type) {
        case 'string':
          return <span key={index} className="font-kalam text-5xl md:text-6xl">{part.value}</span>;
        case 'fraction':
          return (
            <div key={index} className="inline-flex flex-col text-center leading-none mx-2">
              {/* Note the recursive call here */}
              <div className="py-2"><RecursiveRenderer parts={part.numerator || []} /></div>
              <span className="border-t-2 border-pencil w-full"></span>
              <div className="py-2"><RecursiveRenderer parts={part.denominator || []} /></div>
            </div>
          );
        case 'group':
          return (
            <React.Fragment key={index}>
              <span className="font-kalam text-5xl md:text-6xl">(</span>
              {/* And here */}
              <div className="mx-1"><RecursiveRenderer parts={part.content || []} /></div>
              <span className="font-kalam text-5xl md:text-6xl">)</span>
            </React.Fragment>
          );
        default:
          return null;
      }
    })}
  </div>
);

// This is the main exported component. It acts as a controller that handles the scaling logic.
const QuestionRenderer: React.FC<{ parts: QuestionPart[] }> = ({ parts }) => {
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    // A ResizeObserver is used to react to any size changes of the container or the content.
    const observer = new ResizeObserver(() => {
      const containerWidth = container.clientWidth;
      const contentWidth = content.scrollWidth;

      if (contentWidth > containerWidth) {
        // We calculate the scale and add a small buffer to prevent it from touching the edges.
        setScale((containerWidth / contentWidth) * 0.98);
      } else {
        setScale(1);
      }
    });

    observer.observe(container);
    observer.observe(content);

    // Cleanup by disconnecting the observer when the component unmounts or parts change.
    return () => observer.disconnect();
  }, [parts]);

  return (
    // This container defines the maximum available width.
    <div ref={containerRef} className="w-full flex justify-center items-center">
      {/* This wrapper holds the actual content and is the element that gets scaled. */}
      <div
        ref={contentRef}
        className="inline-block" // Ensures it fits its content's width.
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center',
          whiteSpace: 'nowrap', // This is crucial to prevent the content from wrapping on its own.
          transition: 'transform 0.1s ease-in-out', // Adds a smooth scaling effect.
        }}
      >
        <RecursiveRenderer parts={parts} />
      </div>
    </div>
  );
};

export default QuestionRenderer;