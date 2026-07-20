"use client";

import React, { useRef, useEffect, useImperativeHandle } from "react";

export interface CanvasRendererProps {
  onStrokeCompleted?: (points: { x: number; y: number }[]) => void;
}

export const CanvasRenderer = React.forwardRef<HTMLCanvasElement, CanvasRendererProps>(
  ({ onStrokeCompleted: _onStrokeCompleted }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useImperativeHandle(ref, () => canvasRef.current!);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Handle high DPI displays
      const resizeCanvas = () => {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      };

      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);

      return () => {
        window.removeEventListener("resize", resizeCanvas);
      };
    }, []);

    return (
      <div className="absolute inset-0 h-full w-full bg-transparent">
        <canvas
          ref={canvasRef}
          className="block h-full w-full touch-none"
        />
      </div>
    );
  }
);

CanvasRenderer.displayName = "CanvasRenderer";
