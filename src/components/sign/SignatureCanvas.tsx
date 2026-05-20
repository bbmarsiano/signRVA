// SignatureCanvas — touch/mouse drawing pad exporting PNG base64
"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export type SignatureCanvasRef = {
  getBase64: () => string | null;
  isEmpty: () => boolean;
  clear: () => void;
};

const SignatureCanvas = forwardRef<SignatureCanvasRef>(function SignatureCanvas(
  _props,
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasStroke = useRef(false);
  const [showPlaceholder, setShowPlaceholder] = useState(true);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#171717";
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  const getPoint = (
    e: React.MouseEvent | React.TouchEvent,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0] ?? e.changedTouches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if ("touches" in e) e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    drawing.current = true;
    hasStroke.current = true;
    setShowPlaceholder(false);
    const { x, y } = getPoint(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    if ("touches" in e) e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { x, y } = getPoint(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => {
    drawing.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    resizeCanvas();
    hasStroke.current = false;
    setShowPlaceholder(true);
  };

  useImperativeHandle(ref, () => ({
    getBase64: () => {
      const canvas = canvasRef.current;
      if (!canvas || !hasStroke.current) return null;
      return canvas.toDataURL("image/png");
    },
    isEmpty: () => !hasStroke.current,
    clear,
  }));

  return (
    <div className="space-y-2">
      <div className="relative rounded-lg border border-zinc-300 bg-white">
        {showPlaceholder && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-zinc-400">
            Подпишете с пръст
          </p>
        )}
        <canvas
          ref={canvasRef}
          className="h-[130px] w-full touch-none"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
      <button
        type="button"
        onClick={clear}
        className="text-sm font-medium text-zinc-500 hover:text-zinc-800"
      >
        Изчисти
      </button>
    </div>
  );
});

export default SignatureCanvas;
