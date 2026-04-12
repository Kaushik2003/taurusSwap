"use client";

import { useEffect, useState } from "react";

export default function MaggieCursor() {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  useEffect(() => {
    // Hide default cursor globally
    const style = document.createElement("style");
    style.innerHTML = `
      * {
        cursor: none !important;
      }
    `;
    document.head.appendChild(style);

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isClickable =
        target.tagName.toLowerCase() === "button" ||
        target.tagName.toLowerCase() === "a" ||
        target.closest("button") ||
        target.closest("a");
        
      setIsHovering(!!isClickable);
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseover", handleMouseOver);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.head.removeChild(style);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseover", handleMouseOver);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed top-0 left-0 z-[9999]"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
    >
      <div 
        className="transition-transform duration-150 ease-out origin-top-left -ml-[7px] -mt-[6px]"
        style={{
          transform: isClicking 
            ? "scale(0.9)" 
            : isHovering 
              ? "scale(1.15) rotate(-5deg)" 
              : "scale(1) rotate(0deg)"
        }}
      >
        <svg
          width="44"
          height="44"
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Shadow */}
          <path
            d="M8.5 7.5 C15.5 10 25.5 14 32.5 16.5 C34.5 17.5 34.5 20 32.5 21 C27.5 23.5 25.5 25.5 23.5 30.5 C22.5 32.5 19.5 32.5 18.5 30.5 C15.5 23.5 11.5 13.5 8.5 7.5 Z"
            fill="#084734"
            transform="translate(3, 4)"
            stroke="#084734"
            strokeWidth="3.5"
            strokeLinejoin="round" 
            strokeLinecap="round"
          />
          {/* Body */}
          <path
            d="M8.5 7.5 C15.5 10 25.5 14 32.5 16.5 C34.5 17.5 34.5 20 32.5 21 C27.5 23.5 25.5 25.5 23.5 30.5 C22.5 32.5 19.5 32.5 18.5 30.5 C15.5 23.5 11.5 13.5 8.5 7.5 Z"
            fill="#87E4A2"
            stroke="#084734"
            strokeWidth="3.5"
            strokeLinejoin="round" 
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}
