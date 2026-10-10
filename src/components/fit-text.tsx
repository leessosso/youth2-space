"use client";

import { useLayoutEffect, useRef } from "react";

/** 부모 너비 안에서 한 줄을 유지하도록 글자 크기를 줄인다. */
export function FitText({
  text,
  className = "",
  maxPx = 18,
  minPx = 12,
}: {
  text: string;
  className?: string;
  maxPx?: number;
  minPx?: number;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const el = textRef.current;
    if (!box || !el) return;

    const fit = () => {
      const width = box.clientWidth;
      if (width <= 0) return;
      let size = maxPx;
      el.style.fontSize = `${size}px`;
      while (el.scrollWidth > width && size > minPx) {
        size -= 0.5;
        el.style.fontSize = `${size}px`;
      }
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, [text, maxPx, minPx]);

  return (
    <div ref={boxRef} className="min-w-0 overflow-hidden">
      <h1
        ref={textRef}
        className={`whitespace-nowrap font-semibold leading-tight text-foreground ${className}`}
        style={{ fontSize: maxPx }}
      >
        {text}
      </h1>
    </div>
  );
}
