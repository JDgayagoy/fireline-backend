'use client';

import React, { useState, useRef, useEffect } from 'react';

export default function HoldToConfirmButton({ 
  onConfirm, 
  holdDurationMs = 1500, 
  children = 'Hold to Confirm Shut Off',
  disabled = false
}) {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const startTimeRef = useRef(null);
  const animFrameRef = useRef(null);

  const startHold = () => {
    if (disabled) return;
    setIsHolding(true);
    startTimeRef.current = Date.now();

    const update = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(100, (elapsed / holdDurationMs) * 100);
      setProgress(pct);

      if (elapsed >= holdDurationMs) {
        setIsHolding(false);
        setProgress(0);
        onConfirm();
      } else {
        animFrameRef.current = requestAnimationFrame(update);
      }
    };

    animFrameRef.current = requestAnimationFrame(update);
  };

  const endHold = () => {
    setIsHolding(false);
    setProgress(0);
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <button
      type="button"
      onMouseDown={startHold}
      onMouseUp={endHold}
      onMouseLeave={endHold}
      onTouchStart={startHold}
      onTouchEnd={endHold}
      disabled={disabled}
      className="relative overflow-hidden w-full h-12 rounded-md font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-[0.99] transition-all select-none shadow-md disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center"
    >
      {/* Progress fill bar */}
      <span 
        className="absolute left-0 top-0 bottom-0 bg-red-800 transition-all pointer-events-none opacity-80"
        style={{ width: `${progress}%` }}
      />
      <span className="relative z-10 flex items-center gap-2">
        {isHolding ? `Hold... ${Math.round(progress)}%` : children}
      </span>
    </button>
  );
}
