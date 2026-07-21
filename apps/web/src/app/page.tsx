"use client";

import React, { useRef, useEffect, useState } from "react";
import { CanvasRenderer } from "../components/CanvasRenderer";
import {
  Undo2,
  Redo2,
  Trash2,
  Download,
  Circle,
  Square,
  Minus,
  PenTool,
  Eraser,
  Type,
  Zap,
  Play,
  ChevronDown,
  ChevronUp,
  Settings,
  Info,
  Terminal,
  Activity
} from "lucide-react";
import {
  CameraManager,
  MediaPipeTracker,
  HandManager,
  GestureEngine,
  StrokeEngine,
  Renderer,
  isAirPenGesture,
  Stroke
} from "../services/DrawingPipeline";
import {
  GalaxyHero,
  LightningHero,
  FireHero,
  IceHero,
  WaterHero,
  WindHero,
  SolarHero,
  LunarHero,
  CrystalHero,
  ParticleEngine,
  ProjectileSystem,
  FingertipBridgeRenderer,
  Hero
} from "../services/HeroEngine";
import { VoxelBuildEngine, VoxelBlock } from "../services/VoxelBuildEngine";
import { EngineeringStudioEngine, EngineeringDomain, ParametricComponent } from "../services/EngineeringStudioEngine";
import { ModeManager, RenderManager, SceneManager, ResourceManager, DebugManager } from "../services/SpatialEngineCore";

const PRESET_COLORS = [
  "#ef4444", // Red
  "#3b82f6", // Blue
  "#6366f1", // Indigo
  "#10b981", // Green
  "#a855f7", // Purple
  "#f97316", // Orange
  "#eab308", // Yellow
  "#ffffff"  // White
];

// Helper utility: crops all strokes in the word buffer together to form a single vision canvas frame
function cropAndNormalizeStrokes(strokes: Stroke[]): string | null {
  if (strokes.length === 0) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  strokes.forEach((stroke) => {
    stroke.points.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });
  });

  const w = maxX - minX;
  const h = maxY - minY;
  if (w <= 0 || h <= 0) return null;

  const padding = 20;
  const cropW = w + padding * 2;
  const cropH = h + padding * 2;

  const canvas = document.createElement("canvas");
  canvas.width = cropW;
  canvas.height = cropH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Solid black background for vision contrast
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, cropW, cropH);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  strokes.forEach((stroke) => {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = stroke.size;

    const croppedPoints = stroke.points.map((p) => ({
      x: p.x - minX + padding,
      y: p.y - minY + padding,
    }));

    if (croppedPoints.length === 0) return;

    if (croppedPoints.length === 1) {
      const firstPt = croppedPoints[0];
      if (firstPt) {
        ctx.beginPath();
        ctx.arc(firstPt.x, firstPt.y, stroke.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }
    } else {
      const firstPt = croppedPoints[0];
      if (firstPt) {
        ctx.beginPath();
        ctx.moveTo(firstPt.x, firstPt.y);
        for (let i = 1; i < croppedPoints.length; i++) {
          const pt = croppedPoints[i];
          if (pt) ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      }
    }
  });

  return canvas.toDataURL("image/png");
}

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // High-performance DOM Refs for zero-rerender UI updates
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const pinchStatusRef = useRef<HTMLSpanElement | null>(null);
  const gestureRef = useRef<HTMLSpanElement | null>(null);
  const fpsRef = useRef<HTMLSpanElement | null>(null);
  const statusBarHandRef = useRef<HTMLSpanElement | null>(null);

  // Stillness timers
  const lastCoordRef = useRef<{ x: number; y: number } | null>(null);

  // Word Buffer storage references
  const wordBufferRef = useRef<Stroke[]>([]);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Telemetry Monitor Refs
  const profModelInitRef = useRef<HTMLSpanElement | null>(null);
  const profCamRef = useRef<HTMLSpanElement | null>(null);
  const profPrepRef = useRef<HTMLSpanElement | null>(null);
  const profDetectRef = useRef<HTMLSpanElement | null>(null);
  const profConvertRef = useRef<HTMLSpanElement | null>(null);
  const profGestureRef = useRef<HTMLSpanElement | null>(null);
  const profRenderRef = useRef<HTMLSpanElement | null>(null);
  const profDomRef = useRef<HTMLSpanElement | null>(null);
  const profAiRef = useRef<HTMLSpanElement | null>(null);

  // Realtime AR Drawing Debug Monitor Refs
  const profPinchDistRef = useRef<HTMLSpanElement | null>(null);
  const profDrawStateRef = useRef<HTMLSpanElement | null>(null);
  const profPointsCountRef = useRef<HTMLSpanElement | null>(null);
  const heroZRef = useRef<number | null>(null);

  // Modular pipeline instance stored in refs
  const pipelineRef = useRef<{
    camera: CameraManager | null;
    tracker: MediaPipeTracker;
    hand: HandManager;
    gesture: GestureEngine;
    stroke: StrokeEngine;
    renderer: Renderer | null;
  }>({
    camera: null,
    tracker: new MediaPipeTracker(),
    hand: new HandManager(),
    gesture: new GestureEngine(),
    stroke: new StrokeEngine(),
    renderer: null
  });

  // State caching to share between loops instead of recalculating
  const latestResultsRef = useRef<any>(null);
  const lastProcessedFrameTimeRef = useRef<number>(-1);
  const initTimeRef = useRef<number>(0);

  // Monotonically increasing tracking frame IDs for Loop A/B synchronization
  const latestTrackingFrameIdRef = useRef<number>(0);
  const processedTrackingFrameIdRef = useRef<number>(0);
  
  // Cache of last smoothed coordinate tip for rendering between ticks
  const lastSmoothIndexRef = useRef<{ x: number; y: number } | null>(null);

  // Ref for 60 FPS LERP coordinate interpolation to prevent straight segment polygons
  const activeInterpolatedCoordRef = useRef<{ x: number; y: number } | null>(null);
  const pinchLostTimeRef = useRef<number | null>(null);
  const consecutivePinchFramesRef = useRef<number>(0);
  const frameIdRef = useRef<number>(0);
  const trackingLostFramesRef = useRef<number>(0);
  const lastValidTargetTipRef = useRef<{ x: number; y: number } | null>(null);
  const lastValidPinchStateRef = useRef<boolean>(false);

  // Profile elapsed values across split loops
  const lastMPElapsedRef = useRef<number>(0);
  const lastConvertElapsedRef = useRef<number>(0);
  const lastGestureElapsedRef = useRef<number>(0);
  const lastRenderElapsedRef = useRef<number>(0);

  // UI state variables
  const [activeTool, setActiveTool] = useState<Stroke["tool"]>("pen");
  const [selectedColor, setSelectedColor] = useState("#6366f1");
  const [brushSize, setBrushSize] = useState(6);
  const [glowIntensity, setGlowIntensity] = useState(15);
  const [brushEffect, setBrushEffect] = useState<Stroke["effect"]>("neon");
  const [textValue, setTextValue] = useState("Air Draw");
  const [strokeSmoothing, setStrokeSmoothing] = useState(65); // Smoothing % slider
  
  // Hand configuration mode
  const [handMode, setHandMode] = useState<"right" | "left" | "auto">("right");

  // Drawing Modes: Free Draw, Smart Writing (AI), Sketch Recognition, Hero Mode, Spatial Build Mode, Engineering Studio
  const [drawMode, setDrawMode] = useState<"free" | "smart" | "sketch" | "hero" | "build" | "engineering">("free");

  // Voxel Build Mode engine and material selection
  const voxelEngineRef = useRef(new VoxelBuildEngine());
  const [selectedMaterial, setSelectedMaterial] = useState<VoxelBlock["material"]>("neon");

  // Engineering Studio workspace engine state
  const engineeringEngineRef = useRef(new EngineeringStudioEngine());
  const [activeCadType, setActiveCadType] = useState<ParametricComponent["type"] | null>("wall");
  const activeCadTypeRef = useRef<ParametricComponent["type"] | null>("wall");
  useEffect(() => { activeCadTypeRef.current = activeCadType; }, [activeCadType]);

  // 5 Core Managers (Spatial Engine Architecture)
  const sceneManagerRef = useRef(new SceneManager());
  const modeManagerRef = useRef(new ModeManager(sceneManagerRef.current));
  const renderManagerRef = useRef(new RenderManager());

  useEffect(() => {
    ResourceManager.disposeAll();
    particleEngineRef.current.clear();
    projectileSystemRef.current.clear();
    if (pipelineRef.current) {
      pipelineRef.current.stroke.clear();
    }
    if (modeManagerRef.current && renderManagerRef.current) {
      console.log(`[SpatialEngineCore] Mode Switched: ${drawMode} | Scene Objects Purged`);
    }
  }, [drawMode]);

  // Interaction Method: Auto, Air Pen (Index Finger), Pinch
  const [drawingMethod, setDrawingMethod] = useState<"auto" | "airpen" | "pinch">("auto");
  const drawingMethodRef = useRef<"auto" | "airpen" | "pinch">("auto");

  useEffect(() => {
    drawingMethodRef.current = drawingMethod;
  }, [drawingMethod]);

  // Spatial Landmark Filter Type
  const [filterType, setFilterType] = useState<"one_euro" | "kalman" | "ema">("one_euro");
  const filterTypeRef = useRef<"one_euro" | "kalman" | "ema">("one_euro");

  useEffect(() => {
    filterTypeRef.current = filterType;
  }, [filterType]);

  // Developer Mode toggle (persisted)
  const [devMode, setDevMode] = useState(false);
  useEffect(() => {
    DebugManager.setDevMode(devMode);
  }, [devMode]);
  const [latencyPrediction, setLatencyPrediction] = useState(true); // Prediction enabled checkbox

  // Collapsible Settings Accordion Sections
  const [brushExpanded, setBrushExpanded] = useState(true);
  const [aiExpanded, setAiExpanded] = useState(true);
  const [devExpanded, setDevExpanded] = useState(false);

  // AI handwriting settings variables
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiAutoCorrect, setAiAutoCorrect] = useState(true);
  const [aiShowSuggestions, setAiShowSuggestions] = useState(true);
  const [aiLanguage, setAiLanguage] = useState("English");
  const [aiConfidence, setAiConfidence] = useState(0.6);
  const [aiDelay, setAiDelay] = useState(700); // stillness delay

  // Interactive suggestions overlay
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [pendingStrokes, setPendingStrokes] = useState<Stroke[] | null>(null);
  const [pendingAiMode, setPendingAiMode] = useState<"smart" | "sketch">("smart");

  // AI recognition toast notification state
  const [notification, setNotification] = useState<{
    text: string;
    confidence: number;
  } | null>(null);

  // React-synced state to conditionally hide panels during drawing mode transitions
  const [isDrawingState, setIsDrawingState] = useState(false);

  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const [statusMsg, setStatusMsg] = useState("Initializing AR Engine...");

  // Undo/redo controls triggers
  const [undoDisabled, setUndoDisabled] = useState(true);
  const [redoDisabled, setRedoDisabled] = useState(true);

  // ----------------------------------------------------
  // ⭐ HERO MODE STATE & REFS
  // ----------------------------------------------------
  const HEROES_LIST = useRef<Hero[]>([
    new GalaxyHero(),
    new LightningHero(),
    new FireHero(),
    new IceHero(),
    new WaterHero(),
    new WindHero(),
    new SolarHero(),
    new LunarHero(),
    new CrystalHero()
  ]);
  const [activeHeroIdx, setActiveHeroIdx] = useState(0);
  const activeHero = HEROES_LIST.current[activeHeroIdx]!;

  const particleEngineRef = useRef(new ParticleEngine());
  const projectileSystemRef = useRef(new ProjectileSystem());
  const chargeLevelRef = useRef(0);

  // Ref settings synchronization to decouple closures from frame loops
  const activeToolRef = useRef(activeTool);
  const selectedColorRef = useRef(selectedColor);
  const brushSizeRef = useRef(brushSize);
  const glowIntensityRef = useRef(glowIntensity);
  const brushEffectRef = useRef(brushEffect);
  const textValueRef = useRef(textValue);
  const handModeRef = useRef(handMode);
  
  const drawModeRef = useRef(drawMode);
  const aiEnabledRef = useRef(aiEnabled);
  const aiAutoCorrectRef = useRef(aiAutoCorrect);
  const aiShowSuggestionsRef = useRef(aiShowSuggestions);
  const aiLanguageRef = useRef(aiLanguage);
  const aiConfidenceRef = useRef(aiConfidence);
  const aiDelayRef = useRef(aiDelay);

  const activeHeroRef = useRef(activeHero);
  const summonProgressRef = useRef(0.0);
  useEffect(() => { activeHeroRef.current = activeHero; }, [activeHero]);

  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
  useEffect(() => { selectedColorRef.current = selectedColor; }, [selectedColor]);
  useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);
  useEffect(() => { glowIntensityRef.current = glowIntensity; }, [glowIntensity]);
  useEffect(() => { brushEffectRef.current = brushEffect; }, [brushEffect]);
  useEffect(() => { textValueRef.current = textValue; }, [textValue]);
  useEffect(() => { handModeRef.current = handMode; }, [handMode]);

  useEffect(() => { drawModeRef.current = drawMode; }, [drawMode]);
  useEffect(() => { aiEnabledRef.current = aiEnabled; }, [aiEnabled]);
  useEffect(() => { aiAutoCorrectRef.current = aiAutoCorrect; }, [aiAutoCorrect]);
  useEffect(() => { aiShowSuggestionsRef.current = aiShowSuggestions; }, [aiShowSuggestions]);
  useEffect(() => { aiLanguageRef.current = aiLanguage; }, [aiLanguage]);
  useEffect(() => { aiConfidenceRef.current = aiConfidence; }, [aiConfidence]);
  useEffect(() => { aiDelayRef.current = aiDelay; }, [aiDelay]);

  // Load persisted configs on mount
  useEffect(() => {
    const savedHand = localStorage.getItem("visioncanvas_hand_mode");
    if (savedHand === "right" || savedHand === "left" || savedHand === "auto") {
      setHandMode(savedHand);
      handModeRef.current = savedHand;
    }
    const savedDev = localStorage.getItem("visioncanvas_dev_mode");
    if (savedDev === "true") {
      setDevMode(true);
      setDevExpanded(true);
    }
  }, []);

  // Sync initial smoothing parameter to pipeline manager on startup
  useEffect(() => {
    pipelineRef.current.hand.setSmoothing(strokeSmoothing);
    pipelineRef.current.hand.setPredictionEnabled(latencyPrediction);
  }, [strokeSmoothing, latencyPrediction]);

  // Handle Developer Mode Toggle Saves
  const toggleDevMode = (val: boolean) => {
    setDevMode(val);
    localStorage.setItem("visioncanvas_dev_mode", val ? "true" : "false");
    console.log(`[Config] Developer Mode: ${val ? "ON" : "OFF"}`);
  };

  const changeHandMode = (mode: "right" | "left" | "auto") => {
    setHandMode(mode);
    handModeRef.current = mode;
    localStorage.setItem("visioncanvas_hand_mode", mode);
    pipelineRef.current.hand.resetAutoLock();
    console.log(`[Config] Drawing Hand mode set to: ${mode}`);
  };

  const syncButtonsState = () => {
    const p = pipelineRef.current;
    setUndoDisabled(p.stroke.strokes.length === 0);
    setRedoDisabled(p.stroke.redoStack.length === 0);
  };

  // Replace raw drawing strokes buffer with AI result
  const replaceStrokesWithAIResult = (targetStrokes: Stroke[], resultText: string, mode: "smart" | "sketch") => {
    const p = pipelineRef.current;
    const firstIdx = p.stroke.strokes.indexOf(targetStrokes[0]!);
    if (firstIdx === -1) return;

    // Filter out all raw strokes of the word buffer
    p.stroke.strokes = p.stroke.strokes.filter((s) => !targetStrokes.includes(s));

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let totalSize = 0;

    targetStrokes.forEach((stroke) => {
      totalSize += stroke.size;
      stroke.points.forEach((pt) => {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      });
    });

    const w = maxX - minX;
    const h = maxY - minY;
    const cx = minX + w / 2;
    const cy = minY + h / 2;
    const avgSize = totalSize / targetStrokes.length;

    let newStroke: Stroke;

    if (mode === "sketch") {
      const shape = resultText.toLowerCase().trim();
      const radius = Math.max(w, h) / 2;

      if (shape.includes("circle")) {
        newStroke = {
          points: [{ x: cx, y: cy }, { x: cx + radius, y: cy }],
          color: targetStrokes[0]!.color,
          size: avgSize,
          glowIntensity: targetStrokes[0]!.glowIntensity,
          effect: targetStrokes[0]!.effect,
          tool: "circle"
        };
      } else if (shape.includes("square") || shape.includes("rectangle")) {
        newStroke = {
          points: [{ x: minX, y: minY }, { x: maxX, y: maxY }],
          color: targetStrokes[0]!.color,
          size: avgSize,
          glowIntensity: targetStrokes[0]!.glowIntensity,
          effect: targetStrokes[0]!.effect,
          tool: "rect"
        };
      } else if (shape.includes("triangle") || shape.includes("line") || shape.includes("arrow")) {
        newStroke = {
          points: [{ x: minX, y: minY }, { x: maxX, y: maxY }],
          color: targetStrokes[0]!.color,
          size: avgSize,
          glowIntensity: targetStrokes[0]!.glowIntensity,
          effect: targetStrokes[0]!.effect,
          tool: "line"
        };
      } else {
        // Fallback to emoji stamps
        let emoji = "⭐";
        if (shape.includes("heart")) emoji = "❤️";
        else if (shape.includes("house")) emoji = "🏠";
        else if (shape.includes("cat")) emoji = "🐱";
        else if (shape.includes("tree")) emoji = "🌲";
        else if (shape.includes("star")) emoji = "⭐";
        else if (shape.includes("sun")) emoji = "☀️";
        else if (shape.includes("moon")) emoji = "🌙";
        else if (shape.includes("car")) emoji = "🚗";
        else if (shape.includes("flower")) emoji = "🌸";
        else if (shape.includes("cloud")) emoji = "☁️";

        const textScale = Math.max(36, Math.min(120, Math.max(w, h) * 0.85));

        newStroke = {
          points: [{ x: cx, y: cy }],
          color: targetStrokes[0]!.color,
          size: textScale / 3,
          glowIntensity: targetStrokes[0]!.glowIntensity,
          effect: targetStrokes[0]!.effect,
          tool: "text",
          text: emoji,
          fadeStart: Date.now() // Smooth fade-in animation trigger
        };
      }
    } else {
      // Smart writing mode -> Trigger holographic 350ms morph animation (handwriting -> digital text)
      if (p.renderer?.morphAnimator && targetStrokes.length > 0) {
        p.renderer.morphAnimator.startMorph(
          targetStrokes[0]!.points as any,
          targetStrokes[0]!.color,
          targetStrokes[0]!.size,
          resultText,
          350
        );
      }

      const textScale = Math.max(36, Math.min(120, Math.max(w, h) * 0.85));
      
      newStroke = {
        points: [{ x: cx, y: cy }],
        color: targetStrokes[0]!.color,
        size: textScale / 3,
        glowIntensity: targetStrokes[0]!.glowIntensity,
        effect: targetStrokes[0]!.effect,
        tool: "text",
        text: resultText,
        fadeStart: Date.now() // Smooth fade-in animation trigger
      };
    }

    // Insert replacement at the index of the first raw stroke to preserve history sequence
    p.stroke.strokes.splice(firstIdx, 0, newStroke);
    p.renderer?.updateCache(p.stroke.strokes);
    syncButtonsState();
  };

  // Process word buffer using OpenRouter endpoint (Runs completely asynchronously)
  const processWordAI = (targetStrokes: Stroke[]) => {
    const currentMode = drawModeRef.current;
    if (currentMode === "free" || currentMode === "hero") return;
    if (!aiEnabledRef.current) return;

    // Crop all strokes in the buffer together
    const base64Crop = cropAndNormalizeStrokes(targetStrokes);
    if (!base64Crop) return;

    // Increment AI active call counter in Telemetry panel
    if (profAiRef.current) {
      profAiRef.current.innerText = "0.0ms (active)";
      profAiRef.current.className = "text-indigo-400 font-semibold animate-pulse";
    }
    const tAiStart = performance.now();

    fetch("http://localhost:4000/api/ai/handwriting", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        image: base64Crop,
        mode: currentMode === "sketch" ? "sketch" : "writing",
        language: aiLanguageRef.current
      })
    })
    .then((res) => {
      if (!res.ok) throw new Error("API Failure");
      return res.json();
    })
    .then((result) => {
      const dt = performance.now() - tAiStart;
      if (profAiRef.current) {
        profAiRef.current.innerText = `${dt.toFixed(1)}ms (idle)`;
        profAiRef.current.className = "text-emerald-500";
      }

      const confidence = result.confidence ?? 0.0;
      const text = result.text;
      const aiMode: "smart" | "sketch" = currentMode === "sketch" ? "sketch" : "smart";

      // Trigger AI recognition toast
      setNotification({ text, confidence });

      if (confidence >= 0.90) {
        // High confidence (>90%): Morph & Replace automatically
        replaceStrokesWithAIResult(targetStrokes, text, aiMode);
        setSuggestions(null);
      } else if (confidence >= 0.70) {
        // Moderate confidence (70-90%): Morph & Replace + show alternative suggestion chips
        replaceStrokesWithAIResult(targetStrokes, text, aiMode);
        if (result.suggestions && result.suggestions.length > 0) {
          setSuggestions(result.suggestions);
          setPendingStrokes(targetStrokes);
          setPendingAiMode(aiMode);
        }
      } else {
        // Low confidence (<70%): Keep handwritten stroke on canvas + show "Did you mean?" suggestions
        if (result.suggestions && result.suggestions.length > 0) {
          setSuggestions(result.suggestions);
          setPendingStrokes(targetStrokes);
          setPendingAiMode(aiMode);
        }
      }
    })
    .catch((err) => {
      console.error("[AI Processing] Error calling handwriting recognition:", err);
      const dt = performance.now() - tAiStart;
      if (profAiRef.current) {
        profAiRef.current.innerText = `${dt.toFixed(1)}ms (failed)`;
        profAiRef.current.className = "text-rose-500";
      }
    });
  };

  const selectSuggestion = (word: string) => {
    if (pendingStrokes) {
      replaceStrokesWithAIResult(pendingStrokes, word, pendingAiMode);
    }
    setSuggestions(null);
    setPendingStrokes(null);
  };

  const discardSuggestions = () => {
    setSuggestions(null);
    setPendingStrokes(null);
  };

  // Auto-hide recognition notification toast after 2.5s
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      setNotification(null);
    }, 2500);
    return () => clearTimeout(timer);
  }, [notification]);

  useEffect(() => {
    let active = true;

    async function initPipeline() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      const p = pipelineRef.current;

      try {
        console.log("[Pipeline] Camera Permission: Requesting getUserMedia...");
        setStatusMsg("Requesting camera access...");
        
        p.camera = new CameraManager(video);
        // Request 640x480 @ 30 FPS for optimal performance and low pixel-transfer overhead
        await p.camera.start(640, 480, 30);
        
        console.log("[Pipeline] MediaStream received successfully.");
        setStatusMsg("Camera stream initialized.");

        if (!active) return;

        console.log("[Pipeline] Loading MediaPipe models...");
        setStatusMsg("Loading hand landmarker model...");
        
        const t0 = performance.now();
        await p.tracker.init((msg) => setStatusMsg(msg));
        initTimeRef.current = performance.now() - t0;

        if (!active) return;

        // Initialize Layered Cache Renderer
        p.renderer = new Renderer(canvas);
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        p.renderer.resize(rect.width, rect.height, dpr);
        p.renderer.updateCache(p.stroke.strokes);

        console.log("[Pipeline] MediaPipe & Renderer initialized successfully.");
        setStatusMsg("AR Engine Active");

        setIsTrackingActive(true);
        console.log("[Pipeline] Split-loop loops started.");
        
        let frameCount = 0;
        let lastFpsUpdate = performance.now();
        const lastDrawingStateRef = { current: false };

        // ----------------------------------------------------
        // Gesture Classifier for Right Hand Elemental Powers
        // ----------------------------------------------------
        const classifyHeroGesture = (landmarks: any[], width: number, height: number): "pinch" | "fist" | "open" | "unknown" => {
          const wrist = landmarks[0];
          const thumbTip = landmarks[4];
          const indexTip = landmarks[8];
          const indexBase = landmarks[5];
          const middleTip = landmarks[12];
          const middleBase = landmarks[9];
          const ringTip = landmarks[16];
          const ringBase = landmarks[13];
          const pinkyTip = landmarks[20];
          const pinkyBase = landmarks[17];

          if (!wrist || !indexTip || !indexBase || !middleTip || !middleBase || !ringTip || !ringBase || !pinkyTip || !pinkyBase) {
            return "unknown";
          }

          const indexExtended = indexTip.y < indexBase.y;
          const middleExtended = middleTip.y < middleBase.y;
          const ringExtended = ringTip.y < ringBase.y;
          const pinkyExtended = pinkyTip.y < pinkyBase.y;

          // Fist: fingers not extended
          const isFist = !indexExtended && !middleExtended && !ringExtended && !pinkyExtended;
          if (isFist) return "fist";

          // Open palm: index, middle, ring, pinky extended
          const isOpen = indexExtended && middleExtended && ringExtended && pinkyExtended;
          
          // Pinch check: index tip and thumb tip distance
          const dx = (indexTip.x - thumbTip.x) * width;
          const dy = (indexTip.y - thumbTip.y) * height;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 28) return "pinch";

          if (isOpen) return "open";
          return "unknown";
        };

        // ----------------------------------------------------
        // LOOP A: Camera Capture & MediaPipe Detection Loop (Dedicated 30 FPS inference)
        // ----------------------------------------------------
        const runTrackingLoop = () => {
          if (!active) return;
          const tMPStart = performance.now();
          const readyState = video.readyState;
          const curFrameTime = video.currentTime;

          if (readyState >= 2 && curFrameTime !== lastProcessedFrameTimeRef.current) {
            const results = p.tracker.detect(video, performance.now());
            // Cache latest results to share between loops
            latestResultsRef.current = results;
            lastProcessedFrameTimeRef.current = curFrameTime;
            
            // Increment tracking frame ID to signal new data for Loop B
            latestTrackingFrameIdRef.current++;
            
            lastMPElapsedRef.current = performance.now() - tMPStart;
          }
          
          // Re-schedule immediately to process frames concurrently
          setTimeout(runTrackingLoop, 2);
        };

        // ----------------------------------------------------
        // LOOP B: Rendering Loop (Target strict 60 FPS repaint)
        // ----------------------------------------------------
        const runRenderLoop = () => {
          if (!active) return;

          const rect = canvas.getBoundingClientRect();
          const dpr = window.devicePixelRatio || 1;

          // Responsive canvas scaling
          const targetW = Math.floor(rect.width * dpr);
          const targetH = Math.floor(rect.height * dpr);
          if (canvas.width !== targetW || canvas.height !== targetH) {
            p.renderer?.resize(rect.width, rect.height, dpr);
            p.renderer?.updateCache(p.stroke.strokes);
          }

          // Check if a new tracking frame was resolved by MediaPipe (Loop A)
          const isNewFrame = latestTrackingFrameIdRef.current !== processedTrackingFrameIdRef.current;
          
          if (isNewFrame) {
            // Acknowledge processed frame ID
            processedTrackingFrameIdRef.current = latestTrackingFrameIdRef.current;

            // Decoupled coordinate parsing & smoothing
            const results = latestResultsRef.current;
            p.hand.update(results, handModeRef.current, rect.width, rect.height);
            
            // Check if hand is detected in this new frame
            if (p.hand.rightHandLandmarks) {
              trackingLostFramesRef.current = 0;
            } else {
              trackingLostFramesRef.current++;
            }

            // Since hand tracking operates at 30 FPS, the actual elapsed time between frames is 33ms
            const dt = 0.033;
            let targetTip = null;

            if (trackingLostFramesRef.current < 5) {
              if (p.hand.rightHandLandmarks) {
                targetTip = p.hand.getSmoothedIndexTip(rect.width, rect.height, dt);
                if (targetTip) {
                  lastValidTargetTipRef.current = targetTip;
                } else {
                  targetTip = lastValidTargetTipRef.current;
                }
              } else {
                targetTip = lastValidTargetTipRef.current;
              }
            } else {
              lastValidTargetTipRef.current = null;
            }
            
            // Update the cache reference for 60 FPS intermediate repaints
            lastSmoothIndexRef.current = targetTip;

            // Update status bar drawing hand text dynamically
            if (statusBarHandRef.current) {
              const currentMode = handModeRef.current;
              if (currentMode === "right") {
                statusBarHandRef.current.innerText = "Right";
              } else if (currentMode === "left") {
                statusBarHandRef.current.innerText = "Left";
              } else {
                const autoLock = p.hand.getAutoLockedHand();
                if (autoLock === "physical_right") {
                  statusBarHandRef.current.innerText = "Auto (Right Locked)";
                } else if (autoLock === "physical_left") {
                  statusBarHandRef.current.innerText = "Auto (Left Locked)";
                } else {
                  statusBarHandRef.current.innerText = "Auto (Detecting)";
                }
              }
            }

            if (devMode) {
              const currentMode = handModeRef.current;
              const rightPinchDist = p.hand.getPinchDistanceInPixels(rect.width, rect.height);
              const isDrawing = p.stroke.getIsDrawing();
              const autoLock = p.hand.getAutoLockedHand();
              
              let detectedLabels: string[] = [];
              if (results && results.handednesses) {
                detectedLabels = results.handednesses.map((h: any) => h[0].categoryName);
              }
              
              console.log(
                `[AR Debug] DETECTED HANDS (Anatomical): [${detectedLabels.join(", ")}]\n` +
                `[AR Debug] SELECTED DRAWING MODE HAND: ${currentMode.toUpperCase()} | AutoLock: ${autoLock ? autoLock.toUpperCase() : "NONE"}\n` +
                `[AR Debug] Drawing Hand Active: ${p.hand.rightHandLandmarks ? "YES" : "NO"} | Gesture Hand Active: ${p.hand.leftHandLandmarks ? "YES" : "NO"}\n` +
                `[AR Debug] Pinch Dist: ${rightPinchDist !== null ? rightPinchDist.toFixed(1) + "px" : "N/A"} | Threshold: <25px (start) / <40px (draw)\n` +
                `[AR Debug] Gesture State: ${p.hand.leftHandLandmarks ? (gestureRef.current?.innerText || "None") : "N/A"}\n` +
                `[AR Debug] Stroke Drawing State: ${isDrawing ? "DRAWING" : "IDLE"}`
              );
            }
          }

          const targetTip = lastSmoothIndexRef.current;
          let smoothIndex = null;

          // 60 FPS Coordinate Linear Interpolation (Ease LERP) to prevent angular segments
          if (targetTip) {
            if (!activeInterpolatedCoordRef.current) {
              activeInterpolatedCoordRef.current = { ...targetTip };
            } else {
              // Smoothly LERP toward the latest target coordinate at 60 FPS display rate
              // 0.45 factor offers perfect trade-off: high point density and no noticeable lag
              activeInterpolatedCoordRef.current.x += (targetTip.x - activeInterpolatedCoordRef.current.x) * 0.45;
              activeInterpolatedCoordRef.current.y += (targetTip.y - activeInterpolatedCoordRef.current.y) * 0.45;
            }
            smoothIndex = activeInterpolatedCoordRef.current;
          } else {
            activeInterpolatedCoordRef.current = null;
          }

          const tDrawStart = performance.now();
          const ctx = canvas.getContext("2d")!;

          if (drawModeRef.current === "hero") {
            // ----------------------------------------------------
            // ⭐ ACTIVE ELEMENTAL HERO MODE LOOP
            // ----------------------------------------------------
            // Clear main canvas dynamic rendering layer
            ctx.clearRect(0, 0, rect.width, rect.height);

            // Draw completed drawing strokes in background so they are not lost
            p.renderer?.renderFrame(
              null,
              null,
              null,
              rect.width,
              rect.height,
              p.stroke.strokes
            );

            // ----------------------------------------------------
            // ⭐ ACTIVE ELEMENTAL HERO MODE LOOP (Dual Hands & Z-Axis Throw)
            // ----------------------------------------------------
            // Extract Left and Right Hand Palm centers
            let leftPalm: { x: number; y: number; z: number } | null = null;
            let rightPalm: { x: number; y: number; z: number } | null = null;

            if (p.hand.leftHandLandmarks) {
              const wrist = p.hand.leftHandLandmarks[0]!;
              const middleMcp = p.hand.leftHandLandmarks[9]!;
              leftPalm = {
                x: ((wrist.x + middleMcp.x) / 2) * rect.width,
                y: ((wrist.y + middleMcp.y) / 2) * rect.height,
                z: (wrist.z + middleMcp.z) / 2
              };
            }

            if (p.hand.rightHandLandmarks) {
              const wrist = p.hand.rightHandLandmarks[0]!;
              const middleMcp = p.hand.rightHandLandmarks[9]!;
              rightPalm = {
                x: ((wrist.x + middleMcp.x) / 2) * rect.width,
                y: ((wrist.y + middleMcp.y) / 2) * rect.height,
                z: (wrist.z + middleMcp.z) / 2
              };
            }

            let heroMidpoint: { x: number; y: number } | null = null;
            let heroHandDist = 120;
            let bothHandsVisible = false;

            if (leftPalm && rightPalm) {
              bothHandsVisible = true;
              heroMidpoint = {
                x: (leftPalm.x + rightPalm.x) / 2,
                y: (leftPalm.y + rightPalm.y) / 2
              };
              heroHandDist = Math.sqrt((leftPalm.x - rightPalm.x) ** 2 + (leftPalm.y - rightPalm.y) ** 2);
            } else if (rightPalm) {
              heroMidpoint = { x: rightPalm.x, y: rightPalm.y };
            } else if (leftPalm) {
              heroMidpoint = { x: leftPalm.x, y: leftPalm.y };
            } else if (smoothIndex) {
              heroMidpoint = smoothIndex;
            }

            // Process hand movements & Z-axis forward thrust gesture strictly on new tracking frames
            if (isNewFrame && heroMidpoint) {
              // Measure forward Z-axis velocity (moving toward camera causes landmark z coordinate drop)
              let isForwardZThrust = false;
              if (heroZRef.current !== null && (leftPalm || rightPalm)) {
                const currentAvgZ = ((leftPalm?.z || 0) + (rightPalm?.z || 0)) / (bothHandsVisible ? 2 : 1);
                const deltaZ = (currentAvgZ - heroZRef.current) / 0.033; // negative means forward depth movement
                
                // Rapid Z-axis forward thrust check (deltaZ < -0.35)
                if (deltaZ < -0.35) {
                  isForwardZThrust = true;
                }
              }
              heroZRef.current = ((leftPalm?.z || 0) + (rightPalm?.z || 0)) / (bothHandsVisible ? 2 : 1);

              let rightGesture: "pinch" | "fist" | "open" | "unknown" = "unknown";
              if (p.hand.rightHandLandmarks) {
                rightGesture = classifyHeroGesture(p.hand.rightHandLandmarks, rect.width, rect.height);
              }

              let leftGesture: "pinch" | "fist" | "open" | "unknown" = "unknown";
              if (p.hand.leftHandLandmarks) {
                leftGesture = classifyHeroGesture(p.hand.leftHandLandmarks, rect.width, rect.height);
              }

              const isChargingGesture = rightGesture === "pinch" || rightGesture === "fist" || leftGesture === "pinch" || leftGesture === "fist" || bothHandsVisible;

              if (isForwardZThrust && chargeLevelRef.current > 0.15) {
                // 🚀 Forward Z-axis thrust gesture: Launch elemental projectile toward camera screen!
                projectileSystemRef.current.launch(
                  heroMidpoint.x,
                  heroMidpoint.y,
                  0,
                  -8, // launch forward toward top/screen
                  activeHeroRef.current.baseColor,
                  activeHeroRef.current.name.toLowerCase()
                );
                chargeLevelRef.current = 0.0;
              } else if (isChargingGesture) {
                // Charge energy scaled by hand presence
                chargeLevelRef.current = Math.min(1.0, chargeLevelRef.current + 0.033 * 0.95);
              } else {
                // Disperse charge when hands open slowly
                if (chargeLevelRef.current > 0.05) {
                  chargeLevelRef.current = Math.max(0, chargeLevelRef.current - 0.033 * 2.0);
                  particleEngineRef.current.spawn(
                    heroMidpoint.x,
                    heroMidpoint.y,
                    (Math.random() - 0.5) * 5.0,
                    (Math.random() - 0.5) * 5.0,
                    activeHeroRef.current.baseColor,
                    2.0,
                    400 + Math.random() * 300
                  );
                }
              }
            } else if (isNewFrame) {
              chargeLevelRef.current = Math.max(0, chargeLevelRef.current - 0.033 * 1.5);
              heroZRef.current = null;
            }

            // Run particle physics and active projectiles updates on every single render frame (60 FPS)
            const particleDt = 0.016;
            particleEngineRef.current.update(particleDt);
            projectileSystemRef.current.update(particleDt, rect.width, rect.height, particleEngineRef.current, activeHeroRef.current);
            
            // Render active visual triggers in world space at heroMidpoint (2-State Movie-Quality Pipeline: SUMMON & UNLEASH)
            if (heroMidpoint) {
              if (bothHandsVisible) {
                summonProgressRef.current = Math.min(1.0, summonProgressRef.current + particleDt * 2.0); // 500ms sequential ignition
              } else {
                summonProgressRef.current = Math.max(0.0, summonProgressRef.current - particleDt * 3.0);
              }

              // STATE 1: SUMMON - Sequential Fingertip Energy Bridges & Core Formation
              if (bothHandsVisible && p.hand.leftHandLandmarks && p.hand.rightHandLandmarks) {
                FingertipBridgeRenderer.renderBridges(
                  ctx,
                  p.hand.leftHandLandmarks,
                  p.hand.rightHandLandmarks,
                  heroMidpoint,
                  particleEngineRef.current,
                  rect.width,
                  rect.height,
                  chargeLevelRef.current,
                  summonProgressRef.current
                );
              }

              // Play elemental core summoning VFX
              activeHeroRef.current.playSummon(ctx, heroMidpoint, particleEngineRef.current, chargeLevelRef.current, particleDt, heroHandDist);
            }

            particleEngineRef.current.draw(ctx);
            projectileSystemRef.current.draw(ctx);

            // Draw right and left hand skeletons for visual placement guidelines
            if (p.hand.leftHandLandmarks) {
              p.renderer?.drawSkeleton(ctx, p.hand.leftHandLandmarks, rect.width, rect.height, "rgba(244, 63, 94, 0.35)");
            }
            if (p.hand.rightHandLandmarks) {
              p.renderer?.drawSkeleton(ctx, p.hand.rightHandLandmarks, rect.width, rect.height, "rgba(16, 185, 129, 0.35)");
            }

            // Sync energy meter charging bar directly in zero-cost DOM selectors
            const energyBar = document.getElementById("hero-energy-bar");
            if (energyBar) {
              energyBar.style.width = `${chargeLevelRef.current * 100}%`;
              energyBar.style.backgroundColor = activeHeroRef.current.baseColor;
              energyBar.style.boxShadow = `0 0 10px ${activeHeroRef.current.baseColor}`;
            }
            const energyPercent = document.getElementById("hero-energy-percent");
            if (energyPercent) {
              energyPercent.innerText = `${Math.round(chargeLevelRef.current * 100)}%`;
            }

            const isPinchActive = smoothIndex && p.hand.rightHandLandmarks && 
              (["pinch", "fist"].includes(classifyHeroGesture(p.hand.rightHandLandmarks, rect.width, rect.height)));
            
            if (pinchStatusRef.current) {
              pinchStatusRef.current.innerText = isPinchActive ? "Summoning Powers..." : "Open Hand or Pinch to Charge";
              pinchStatusRef.current.className = isPinchActive ? "text-indigo-400 font-bold animate-pulse" : "";
            }

          } else if (drawModeRef.current === "build") {
            // ----------------------------------------------------
            // SPATIAL BUILD MODE LOOP (Voxel 3D Grid & Block Placement)
            // ----------------------------------------------------
            let cursorGrid: { gridX: number; gridY: number } | null = null;

            if (smoothIndex) {
              const originX = rect.width / 2;
              const originY = rect.height / 2;
              const snapped = voxelEngineRef.current.snapToGrid(smoothIndex.x, smoothIndex.y, originX, originY);
              cursorGrid = { gridX: snapped.gridX, gridY: snapped.gridY };

              const rawLandmarks = p.hand.rightHandLandmarks || p.hand.leftHandLandmarks;
              const isGestureActive = rawLandmarks ? isAirPenGesture(rawLandmarks) : false;

              if (isGestureActive && cursorGrid) {
                voxelEngineRef.current.addBlock(cursorGrid.gridX, cursorGrid.gridY);
              }
            }

            voxelEngineRef.current.render(ctx, rect.width, rect.height, cursorGrid);

            if (p.hand.rightHandLandmarks) {
              p.renderer?.drawSkeleton(ctx, p.hand.rightHandLandmarks, rect.width, rect.height, "rgba(56, 189, 248, 0.4)");
            }
          } else if (drawModeRef.current === "engineering") {
            // ----------------------------------------------------
            // ENGINEERING STUDIO WORKSPACE LOOP (Parametric Spatial CAD Engine)
            // ----------------------------------------------------
            if (smoothIndex) {
              const rawLandmarks = p.hand.rightHandLandmarks || p.hand.leftHandLandmarks;
              const isGestureActive = rawLandmarks ? isAirPenGesture(rawLandmarks) : false;

              if (isGestureActive && activeCadTypeRef.current) {
                engineeringEngineRef.current.addParametricComponent(activeCadTypeRef.current, smoothIndex.x, smoothIndex.y);
              }
            }

            engineeringEngineRef.current.update(0.016);
            // Render clean Spatial CAD view
            engineeringEngineRef.current.render(ctx, rect.width, rect.height, smoothIndex, activeCadTypeRef.current);
          } else {
            // ----------------------------------------------------
            // STANDARD AIR DRAWING MODES LOOP
            // ----------------------------------------------------
            let isPinchingNow = false;
            let pinchDistStr = "N/A";
            let pinchDist: number | null = null;
            let startStrokeCalled = false;
            let endStrokeCalled = false;

            const wasDrawing = p.stroke.getIsDrawing();
            const START_LIMIT = 0.020 * rect.width;
            const STOP_LIMIT = 0.035 * rect.width;

            // Determine effective interaction method
            const currentMethod = drawingMethodRef.current;
            const effectiveMethod = currentMethod === "auto"
              ? (drawModeRef.current === "smart" ? "airpen" : "pinch")
              : currentMethod;

            let isGestureActive = false;

            // 1. Calculate raw gesture active state on the current frame
            if (trackingLostFramesRef.current < 5) {
              const rawLandmarks = p.hand.rightHandLandmarks || p.hand.leftHandLandmarks;
              if (rawLandmarks) {
                pinchDist = p.hand.getPinchDistanceInPixels(rect.width, rect.height);
                if (pinchDist !== null) {
                  pinchDistStr = `${pinchDist.toFixed(1)}px`;
                }

                const airPenActive = isAirPenGesture(rawLandmarks);
                const pinchActive = pinchDist !== null ? (wasDrawing ? pinchDist < STOP_LIMIT : pinchDist < START_LIMIT) : false;

                if (drawModeRef.current === "smart") {
                  // Smart writing triggers on EITHER pointing index finger OR pinch gesture
                  isGestureActive = airPenActive || pinchActive;
                } else if (effectiveMethod === "airpen") {
                  isGestureActive = airPenActive;
                } else {
                  isGestureActive = pinchActive;
                }
                lastValidPinchStateRef.current = isGestureActive;
              } else {
                isGestureActive = lastValidPinchStateRef.current;
              }
            } else {
              isGestureActive = false;
              lastValidPinchStateRef.current = false;
            }

            let shouldDraw = wasDrawing;

            // 2. Apply Debounce and Hysteresis Filters
            if (!wasDrawing) {
              if (isGestureActive && trackingLostFramesRef.current < 5) {
                consecutivePinchFramesRef.current++;
              } else {
                consecutivePinchFramesRef.current = 0;
              }
              if (consecutivePinchFramesRef.current >= 1) {
                shouldDraw = true;
                pinchLostTimeRef.current = null;
              }
            } else {
              // We are currently drawing
              if (isGestureActive && trackingLostFramesRef.current < 5) {
                pinchLostTimeRef.current = null; // Reset loss timer
                shouldDraw = true;
              } else {
                // Gesture lost or tracking lost - check debounce timers
                if (trackingLostFramesRef.current >= 5) {
                  shouldDraw = false; // Decisively lost tracking - terminate stroke immediately
                } else if (pinchLostTimeRef.current === null) {
                  pinchLostTimeRef.current = performance.now();
                  shouldDraw = true; // Hold stroke active during debounce
                } else {
                  const elapsed = performance.now() - pinchLostTimeRef.current;
                  if (elapsed >= 150) {
                    shouldDraw = false; // Finally terminate stroke after 150ms release
                  } else {
                    shouldDraw = true; // Hold stroke active
                  }
                }
              }
            }

            // 3. Process drawing logic updates at 60 FPS using smooth LERP coordinates
            if (smoothIndex) {
              const dt = 0.016; // 60 FPS drawing loop delta

              // Stage 1: Live Stroke Capture & Preview ONLY (While user is pinching)
              if (shouldDraw) {
                // Calculate adaptive brush width size based on drawing speed (velocity)
                let activeBrushSize = brushSize;
                if (lastCoordRef.current) {
                  const dx = smoothIndex.x - lastCoordRef.current.x;
                  const dy = smoothIndex.y - lastCoordRef.current.y;
                  const dist = Math.sqrt(dx * dx + dy * dy);
                  const speed = dist / dt; // pixels per second
                  
                  const speedFactor = Math.max(0.65, Math.min(1.15, 1.15 - speed / 1200));
                  activeBrushSize = brushSize * speedFactor;
                }

                const activeSettings = {
                  color: selectedColorRef.current,
                  size: activeBrushSize,
                  glowIntensity: brushEffectRef.current === "neon" ? glowIntensityRef.current * 0.25 : 0,
                  effect: brushEffectRef.current,
                  tool: activeToolRef.current,
                  text: textValueRef.current,
                  isSmartWriting: drawModeRef.current === "smart",
                  dt: dt
                };

                if (!wasDrawing) {
                  p.hand.resetSmoothing();
                  activeInterpolatedCoordRef.current = { ...targetTip! };
                  smoothIndex = activeInterpolatedCoordRef.current;
                  
                  p.stroke.startStroke(smoothIndex, activeSettings);
                  startStrokeCalled = true;
                } else {
                  // Add points continuously to stroke buffer and update live preview
                  p.stroke.addPoint(smoothIndex, activeSettings);
                }
                lastCoordRef.current = smoothIndex;
              } else {
                // Stage 2: Post-Processing & AI Recognition ONLY AFTER stroke completes (pinch release)
                if (wasDrawing) {
                  p.stroke.endStroke({
                    effect: brushEffectRef.current,
                    glowIntensity: glowIntensityRef.current
                  });
                  endStrokeCalled = true;
                  const finishedStroke = p.stroke.strokes[p.stroke.strokes.length - 1];
                  if (finishedStroke) {
                    finishedStroke.glowIntensity = glowIntensityRef.current;

                    if (drawModeRef.current === "smart" || drawModeRef.current === "sketch") {
                      wordBufferRef.current.push(finishedStroke);
                      if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
                      inactivityTimeoutRef.current = setTimeout(() => {
                        const accumulated = [...wordBufferRef.current];
                        wordBufferRef.current = [];
                        if (accumulated.length > 0) {
                          processWordAI(accumulated);
                        }
                      }, aiDelayRef.current);
                    }
                  }
                  p.renderer?.updateCache(p.stroke.strokes);
                  syncButtonsState();
                  pinchLostTimeRef.current = null;
                  consecutivePinchFramesRef.current = 0;
                  lastCoordRef.current = null;
                }
              }
            } else {
              // smoothIndex is null (hand tracking lost completely after hysteresis threshold)
              if (wasDrawing && shouldDraw === false) {
                p.stroke.endStroke({
                  effect: brushEffectRef.current,
                  glowIntensity: glowIntensityRef.current
                });
                endStrokeCalled = true;
                const finishedStroke = p.stroke.strokes[p.stroke.strokes.length - 1];
                if (finishedStroke) {
                  finishedStroke.glowIntensity = glowIntensityRef.current;
                  if (drawModeRef.current === "smart" || drawModeRef.current === "sketch") {
                    wordBufferRef.current.push(finishedStroke);
                    if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
                    inactivityTimeoutRef.current = setTimeout(() => {
                      const accumulated = [...wordBufferRef.current];
                      wordBufferRef.current = [];
                      if (accumulated.length > 0) {
                        processWordAI(accumulated);
                      }
                    }, aiDelayRef.current);
                  }
                }
                p.renderer?.updateCache(p.stroke.strokes);
                syncButtonsState();
                pinchLostTimeRef.current = null;
                consecutivePinchFramesRef.current = 0;
                lastCoordRef.current = null;
              }
            }

            // Frame instrumentation logging
            frameIdRef.current++;
            const strokeActive = p.stroke.getIsDrawing();
            const leftGestureLabel = gestureRef.current?.innerText || "None";
            const cursorVisible = (smoothIndex !== null && trackingLostFramesRef.current < 5);
            
            if (devMode) {
              console.log(JSON.stringify({
                frameId: frameIdRef.current,
                handDetected: p.hand.rightHandLandmarks !== null,
                trackingConfidence: p.hand.rightHandLandmarks ? 1.0 : 0.0,
                pinchDistance: pinchDist !== null ? Number(pinchDist.toFixed(1)) : null,
                gestureState: leftGestureLabel,
                trackingLostFrames: trackingLostFramesRef.current,
                strokeActive: strokeActive,
                cursorVisible: cursorVisible,
                startStrokeCalled: startStrokeCalled,
                endStrokeCalled: endStrokeCalled
              }));
            }

            // Repaint components and cursors smoothly every single frame (60 FPS)
            if (cursorVisible && smoothIndex) {
              if (cursorRef.current) {
                cursorRef.current.style.transform = `translate(${smoothIndex.x}px, ${smoothIndex.y}px)`;
                cursorRef.current.style.display = "block";

                const activePinch = wasDrawing ? (pinchDist !== null && pinchDist < STOP_LIMIT) : (pinchDist !== null && pinchDist < START_LIMIT);
                if (activePinch) {
                  cursorRef.current.className = "absolute h-6 w-6 rounded-full border-2 border-white shadow-2xl pointer-events-none z-50 bg-indigo-500 scale-125 ring-4 ring-indigo-300/40";
                  isPinchingNow = true;
                } else {
                  cursorRef.current.className = "absolute h-6 w-6 rounded-full border-2 border-white shadow-2xl pointer-events-none z-50 bg-emerald-400 scale-100 ring-2 ring-white/50";
                }
              }
            } else {
              if (cursorRef.current) cursorRef.current.style.display = "none";
            }

            // Sync drawing state transitions to React (triggered strictly twice per stroke: start/stop)
            const drawingState = p.stroke.getIsDrawing();
            if (drawingState !== lastDrawingStateRef.current) {
              lastDrawingStateRef.current = drawingState;
              setIsDrawingState(drawingState);
            }

            if (pinchStatusRef.current) {
              pinchStatusRef.current.innerText = isPinchingNow ? "Pinch Drawing Active" : "Pinch Fingers to Draw";
              pinchStatusRef.current.className = isPinchingNow ? "text-indigo-400 font-bold animate-pulse" : "";
            }

            if (profPinchDistRef.current) profPinchDistRef.current.innerText = pinchDistStr;
            if (profDrawStateRef.current) {
              profDrawStateRef.current.innerText = drawingState ? "DRAWING" : "IDLE";
              profDrawStateRef.current.className = drawingState ? "text-indigo-400 font-bold" : "text-zinc-500";
            }
            if (profPointsCountRef.current) {
              const currentCount = p.stroke.currentStroke?.points.length || 0;
              const historicalCount = p.stroke.strokes.reduce((acc, s) => acc + s.points.length, 0);
              profPointsCountRef.current.innerText = `${historicalCount + currentCount} pts`;
            }

            // Call Renderer frame paint (Loop B rendering)
            p.renderer?.renderFrame(
              p.stroke.currentStroke,
              p.hand.rightHandLandmarks,
              p.hand.leftHandLandmarks,
              rect.width,
              rect.height,
              p.stroke.strokes
            );
          }
          lastRenderElapsedRef.current = performance.now() - tDrawStart;

          // Track total profiled end-to-end latency: Camera -> MediaPipe -> Gesture -> Renderer
          const totalLatency = lastMPElapsedRef.current + lastConvertElapsedRef.current + lastGestureElapsedRef.current + lastRenderElapsedRef.current;
          
          if (profModelInitRef.current) profModelInitRef.current.innerText = `${initTimeRef.current.toFixed(0)}ms`;
          if (profCamRef.current) profCamRef.current.innerText = "16.6ms";
          if (profPrepRef.current) profPrepRef.current.innerText = `${lastConvertElapsedRef.current.toFixed(1)}ms`;
          if (profDetectRef.current) profDetectRef.current.innerText = `${lastMPElapsedRef.current.toFixed(1)}ms`;
          if (profConvertRef.current) profConvertRef.current.innerText = `${lastConvertElapsedRef.current.toFixed(1)}ms`;
          if (profGestureRef.current) profGestureRef.current.innerText = `${lastGestureElapsedRef.current.toFixed(1)}ms`;
          if (profRenderRef.current) profRenderRef.current.innerText = `${lastRenderElapsedRef.current.toFixed(1)}ms`;
          if (profDomRef.current) profDomRef.current.innerText = `${totalLatency.toFixed(1)}ms (total)`;

          frameCount++;
          requestAnimationFrame(runRenderLoop);
        };

        // ----------------------------------------------------
        // LOOP C: Gesture Recognition Loop (Throttled 10 FPS)
        // ----------------------------------------------------
        const runGestureLoop = () => {
          if (!active) return;
          const tGestureStart = performance.now();

          // Only process drawing action gestures if we are not in Hero Mode
          let leftGestureLabel = "None";
          if (p.hand.leftHandLandmarks) {
            leftGestureLabel = p.gesture.processGesture(p.hand.leftHandLandmarks, (cmd) => {
              if (drawModeRef.current === "hero") return; // suppress actions during magic summoning

              if (cmd === "fist") {
                if (inactivityTimeoutRef.current) {
                  clearTimeout(inactivityTimeoutRef.current);
                  inactivityTimeoutRef.current = null;
                }
                wordBufferRef.current = [];
                p.stroke.clear();
                p.renderer?.updateCache([]);
                syncButtonsState();
              } else if (cmd === "peace") {
                if (inactivityTimeoutRef.current) {
                  clearTimeout(inactivityTimeoutRef.current);
                  inactivityTimeoutRef.current = null;
                }
                wordBufferRef.current = [];
                if (p.stroke.undo()) {
                  p.renderer?.updateCache(p.stroke.strokes);
                  syncButtonsState();
                }
              } else if (cmd === "thumbsup") {
                exportARSnapshot();
              }
            });
          }
          lastGestureElapsedRef.current = performance.now() - tGestureStart;
          
          if (gestureRef.current) {
            gestureRef.current.innerText = leftGestureLabel;
          }

          setTimeout(runGestureLoop, 100);
        };

        // ----------------------------------------------------
        // LOOP E: UI & FPS Indicators Loop (Periodic 1 FPS)
        // ----------------------------------------------------
        const runFpsLoop = () => {
          if (!active) return;
          const now = performance.now();
          const currentFps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
          if (fpsRef.current) {
            fpsRef.current.innerText = `${currentFps} FPS`;
          }
          frameCount = 0;
          lastFpsUpdate = now;
          setTimeout(runFpsLoop, 1000);
        };

        // Boot loops concurrently
        runTrackingLoop();
        runRenderLoop();
        runGestureLoop();
        runFpsLoop();

        setStatusMsg("AR Canvas Active");
      } catch (err: any) {
        console.error("[Pipeline] Pipeline error:", err);
        setStatusMsg(`Error: ${err.message || String(err)}`);
      }
    }

    initPipeline();

    return () => {
      active = false;
      console.log("[Pipeline] Stop and cleanup loop requested.");
      pipelineRef.current.camera?.stop();
      particleEngineRef.current.clear();
      projectileSystemRef.current.clear();
    };
  }, []); // Run pipeline initialization strictly ONCE on mount

  const handleUndo = () => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
    wordBufferRef.current = [];
    
    const p = pipelineRef.current;
    if (p.stroke.undo()) {
      p.renderer?.updateCache(p.stroke.strokes);
      syncButtonsState();
    }
  };

  const handleRedo = () => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
    wordBufferRef.current = [];

    const p = pipelineRef.current;
    if (p.stroke.redo()) {
      p.renderer?.updateCache(p.stroke.strokes);
      syncButtonsState();
    }
  };

  const clearCanvas = () => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
    wordBufferRef.current = [];

    const p = pipelineRef.current;
    p.stroke.clear();
    p.renderer?.updateCache([]);
    syncButtonsState();
  };

  const exportARSnapshot = () => {
    const video = videoRef.current;
    const p = pipelineRef.current;
    if (!video || !p.renderer) return;

    const base64 = p.renderer.getSnapshotBase64(video);
    if (!base64) return;

    const link = document.createElement("a");
    link.download = `visioncanvas-ar-${Date.now()}.png`;
    link.href = base64;
    link.click();
    console.log("[Export] AR snap exported successfully.");
  };

  return (
    <main className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-black font-sans">
      
      {/* 1. Full-screen Mirrored Camera Feed */}
      <video
        ref={videoRef}
        className="fixed inset-0 z-0 h-full w-full object-cover scale-x-[-1] pointer-events-none"
        playsInline
        muted
      />

      {/* Camera feed glass layer overlay to dim bright lights slightly for drawing clarity */}
      <div className="fixed inset-0 z-5 bg-gradient-to-t from-black/20 via-transparent to-black/30 pointer-events-none" />

      {/* 2. Drawing Canvas overlay */}
      <div className="absolute inset-0 z-10">
        <CanvasRenderer ref={canvasRef} />
      </div>

      {/* 3. Floating Pointer Cursor (GPU transform accelerated) */}
      <div
        ref={cursorRef}
        className="absolute h-6 w-6 rounded-full border-2 border-white shadow-2xl pointer-events-none z-50 bg-emerald-400 scale-100 ring-2 ring-white/50"
        style={{
          left: 0,
          top: 0,
          display: "none"
        }}
      />

      {/* 4. Top Utility Control Panel with Vision Pro Glassmorphism & Status Badges */}
      <header className="absolute top-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-5 px-5 py-2.5 bg-zinc-950/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-bold tracking-tight text-white select-none flex items-center gap-1.5">
            VisionCanvas <span className="text-indigo-400 font-extrabold font-mono">AR</span>
          </h1>
          <span className="px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Spatial
          </span>
        </div>

        <div className="h-5 w-[1px] bg-zinc-800/80" />

        {/* Group 1: Mode Selectors */}
        <div className="flex items-center gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800/80">
          <button
            onClick={() => setDrawMode("free")}
            className={`px-3 py-1 text-xs rounded-lg font-semibold transition-all ${
              drawMode === "free"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 scale-105"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Free Draw
          </button>
          <button
            onClick={() => setDrawMode("smart")}
            className={`px-3 py-1 text-xs rounded-lg font-semibold transition-all ${
              drawMode === "smart"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 scale-105"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Smart Writing ✍️
          </button>
          <button
            onClick={() => setDrawMode("sketch")}
            className={`px-3 py-1 text-xs rounded-lg font-semibold transition-all ${
              drawMode === "sketch"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 scale-105"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Sketch Recognition 📐
          </button>
          <button
            onClick={() => {
              setDrawMode("hero");
              particleEngineRef.current.clear();
              projectileSystemRef.current.clear();
              chargeLevelRef.current = 0;
            }}
            className={`px-3 py-1 text-xs rounded-lg font-semibold transition-all flex items-center gap-1 ${
              drawMode === "hero"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 scale-105"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            ⭐ Hero Mode
          </button>
          <button
            onClick={() => setDrawMode("build")}
            className={`px-3 py-1 text-xs rounded-lg font-semibold transition-all flex items-center gap-1 ${
              drawMode === "build"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 scale-105"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Spatial Build 🧱
          </button>
          <button
            onClick={() => setDrawMode("engineering")}
            className={`px-3 py-1 text-xs rounded-lg font-semibold transition-all flex items-center gap-1 ${
              drawMode === "engineering"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 scale-105"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Engineering Studio 🏗
          </button>
        </div>

        <div className="h-5 w-[1px] bg-zinc-800/80" />

        {/* Group 2: Hand Selectors */}
        <div className="flex items-center gap-1 bg-zinc-950/65 p-1 rounded-xl border border-zinc-850/80">
          <button
            onClick={() => changeHandMode("right")}
            className={`px-2 py-1 text-[11px] rounded-lg font-medium transition-all ${
              handMode === "right"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Right Hand
          </button>
          <button
            onClick={() => changeHandMode("left")}
            className={`px-2 py-1 text-[11px] rounded-lg font-medium transition-all ${
              handMode === "left"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Left Hand
          </button>
          <button
            onClick={() => changeHandMode("auto")}
            className={`px-2 py-1 text-[11px] rounded-lg font-medium transition-all ${
              handMode === "auto"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Auto Detect
          </button>
        </div>

        <div className="h-5 w-[1px] bg-zinc-800/80" />

        {/* Group 3: History Commands */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={undoDisabled}
            className="p-2 rounded-xl text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
            title="Undo"
          >
            <Undo2 size={15} />
          </button>

          <button
            onClick={handleRedo}
            disabled={redoDisabled}
            className="p-2 rounded-xl text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
            title="Redo"
          >
            <Redo2 size={15} />
          </button>

          <button
            onClick={clearCanvas}
            className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all"
            title="Clear Canvas"
          >
            <Trash2 size={15} />
          </button>
        </div>

        <div className="h-5 w-[1px] bg-zinc-800/80" />

        {/* Group 4: Export Options */}
        <button
          onClick={exportARSnapshot}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md active:scale-95"
          title="Export Snap"
        >
          <Download size={14} />
          <span>Export</span>
        </button>
      </header>

      {/* 5. Left Floating Panels: Drawing Tools */}
      {drawMode !== "hero" && (
        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2 p-2 bg-zinc-900/70 backdrop-blur-md border border-zinc-700/50 rounded-2xl shadow-2xl">
          <div className="text-[10px] text-center text-zinc-500 font-semibold uppercase tracking-wider mb-1">
            Tools
          </div>
          
          <button
            onClick={() => setActiveTool("pen")}
            className={`p-3 rounded-xl transition-all ${
              activeTool === "pen"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}
            title="Freehand Pen"
          >
            <PenTool size={18} />
          </button>

          <button
            onClick={() => setActiveTool("eraser")}
            className={`p-3 rounded-xl transition-all ${
              activeTool === "eraser"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}
            title="Eraser"
          >
            <Eraser size={18} />
          </button>

          <button
            onClick={() => setActiveTool("line")}
            className={`p-3 rounded-xl transition-all ${
              activeTool === "line"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}
            title="Straight Line"
          >
            <Minus size={18} className="rotate-45" />
          </button>

          <button
            onClick={() => setActiveTool("rect")}
            className={`p-3 rounded-xl transition-all ${
              activeTool === "rect"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}
            title="Rectangle Shape"
          >
            <Square size={18} />
          </button>

          <button
            onClick={() => setActiveTool("circle")}
            className={`p-3 rounded-xl transition-all ${
              activeTool === "circle"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}
            title="Circle Shape"
          >
            <Circle size={18} />
          </button>

          <button
            onClick={() => setActiveTool("text")}
            className={`p-3 rounded-xl transition-all ${
              activeTool === "text"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}
            title="Place Text"
          >
            <Type size={18} />
          </button>
        </div>
      )}

      {/* 6. Right Floating Panels: Collapsible Brush Settings, AI Configuration, and Developer Tools */}
      {drawMode !== "hero" && (
        <div className="absolute right-6 top-1/2 -translate-y-1/2 z-40 w-64 p-3 bg-zinc-900/70 backdrop-blur-md border border-zinc-700/50 rounded-2xl shadow-2xl text-white space-y-3.5 max-h-[85vh] overflow-y-auto custom-scrollbar">
          
          {/* SECTION 1: BRUSH SETTINGS */}
          <div className="border-b border-zinc-800/80 pb-2">
            <button
              onClick={() => setBrushExpanded(!brushExpanded)}
              className="flex items-center justify-between w-full text-[10px] text-zinc-500 font-bold uppercase tracking-wider text-left"
            >
              <div className="flex items-center gap-1.5">
                <Settings size={12} className="text-zinc-400" />
                <span>Brush Settings</span>
              </div>
              {brushExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {brushExpanded && (
              <div className="mt-3 space-y-3.5 animate-fade-in">
                {/* Color presets grid */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-zinc-400 font-semibold">Color Palette</label>
                  <div className="grid grid-cols-4 gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`h-7 rounded-lg border transition-all ${
                          selectedColor === color ? "border-white scale-110 shadow-lg" : "border-zinc-800 hover:scale-105"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Drawing Method Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-zinc-400 font-semibold">Drawing Method</label>
                  <div className="grid grid-cols-3 gap-1 bg-zinc-950/60 p-0.5 rounded-xl border border-zinc-800/80">
                    <button
                      onClick={() => setDrawingMethod("auto")}
                      className={`py-1 text-[11px] rounded-lg transition-all ${
                        drawingMethod === "auto" ? "bg-indigo-600 text-white font-bold" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Auto ✨
                    </button>
                    <button
                      onClick={() => setDrawingMethod("airpen")}
                      className={`py-1 text-[11px] rounded-lg transition-all ${
                        drawingMethod === "airpen" ? "bg-indigo-600 text-white font-bold" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Air Pen ☝️
                    </button>
                    <button
                      onClick={() => setDrawingMethod("pinch")}
                      className={`py-1 text-[11px] rounded-lg transition-all ${
                        drawingMethod === "pinch" ? "bg-indigo-600 text-white font-bold" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Pinch 🤏
                    </button>
                  </div>
                </div>

                {/* Spatial Filter Algorithm Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-zinc-400 font-semibold">Filter Algorithm</label>
                  <div className="grid grid-cols-3 gap-1 bg-zinc-950/60 p-0.5 rounded-xl border border-zinc-800/80">
                    <button
                      onClick={() => setFilterType("one_euro")}
                      className={`py-1 text-[11px] rounded-lg transition-all ${
                        filterType === "one_euro" ? "bg-indigo-600 text-white font-bold" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      1-Euro
                    </button>
                    <button
                      onClick={() => setFilterType("kalman")}
                      className={`py-1 text-[11px] rounded-lg transition-all ${
                        filterType === "kalman" ? "bg-indigo-600 text-white font-bold" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Kalman
                    </button>
                    <button
                      onClick={() => setFilterType("ema")}
                      className={`py-1 text-[11px] rounded-lg transition-all ${
                        filterType === "ema" ? "bg-indigo-600 text-white font-bold" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      EMA
                    </button>
                  </div>
                </div>

                {/* Size selection */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-zinc-400 font-semibold">
                    <span>Brush Size</span>
                    <span>{brushSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="30"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Stroke Smoothing selection */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-zinc-400 font-semibold">
                    <span>Stroke Smoothing</span>
                    <span>{strokeSmoothing}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={strokeSmoothing}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setStrokeSmoothing(val);
                      pipelineRef.current.hand.setSmoothing(val);
                    }}
                    className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Glow Intensity selection */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-zinc-400 font-semibold">
                    <span>Glow Intensity</span>
                    <span>{glowIntensity}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="35"
                    value={glowIntensity}
                    onChange={(e) => setGlowIntensity(Number(e.target.value))}
                    className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Effect toggler */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-zinc-400 font-semibold">Brush Effect</label>
                  <div className="flex bg-zinc-950/60 p-0.5 rounded-xl border border-zinc-800/80">
                    <button
                      onClick={() => setBrushEffect("neon")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-xs rounded-lg transition-all ${
                        brushEffect === "neon" ? "bg-indigo-600 text-white font-bold" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Zap size={12} />
                      Neon
                    </button>
                    <button
                      onClick={() => setBrushEffect("solid")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-xs rounded-lg transition-all ${
                        brushEffect === "solid" ? "bg-indigo-600 text-white font-bold" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Minus size={12} />
                      Solid
                    </button>
                  </div>
                </div>

                {/* Text stamp config */}
                {activeTool === "text" && (
                  <div className="space-y-1.5 pt-1.5 border-t border-zinc-800">
                    <label className="text-[11px] text-zinc-400 font-semibold">Stamp Text</label>
                    <input
                      type="text"
                      value={textValue}
                      onChange={(e) => setTextValue(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-zinc-950/60 text-xs rounded-lg border border-zinc-800 text-white placeholder-zinc-500 outline-none focus:border-indigo-500"
                      placeholder="Text to stamp..."
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 2: AI WRITING SETTINGS */}
          <div className="border-b border-zinc-800/80 pb-2">
            <button
              onClick={() => setAiExpanded(!aiExpanded)}
              className="flex items-center justify-between w-full text-[10px] text-zinc-500 font-bold uppercase tracking-wider text-left"
            >
              <div className="flex items-center gap-1.5">
                <Info size={12} className="text-zinc-400" />
                <span>AI Writing Settings</span>
              </div>
              {aiExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {aiExpanded && (
              <div className="mt-3 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-zinc-400 font-semibold">Enable Smart Recognition</span>
                  <input
                    type="checkbox"
                    checked={aiEnabled}
                    onChange={(e) => setAiEnabled(e.target.checked)}
                    className="w-4 h-4 accent-indigo-500 cursor-pointer rounded bg-zinc-950 border-zinc-800 focus:ring-0"
                  />
                </div>

                <div className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-zinc-400 font-semibold">Auto Correct</span>
                  <input
                    type="checkbox"
                    checked={aiAutoCorrect}
                    onChange={(e) => setAiAutoCorrect(e.target.checked)}
                    className="w-4 h-4 accent-indigo-500 cursor-pointer rounded bg-zinc-950 border-zinc-800 focus:ring-0"
                  />
                </div>

                <div className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-zinc-400 font-semibold">Show Suggestions</span>
                  <input
                    type="checkbox"
                    checked={aiShowSuggestions}
                    onChange={(e) => setAiShowSuggestions(e.target.checked)}
                    className="w-4 h-4 accent-indigo-500 cursor-pointer rounded bg-zinc-950 border-zinc-800 focus:ring-0"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-400 font-semibold">Recognition Language</label>
                  <select
                    value={aiLanguage}
                    onChange={(e) => setAiLanguage(e.target.value)}
                    className="w-full px-2 py-1.5 bg-zinc-950/80 text-xs rounded-lg border border-zinc-800 text-white outline-none focus:border-indigo-500"
                  >
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                    <option value="Chinese">Chinese</option>
                    <option value="Japanese">Japanese</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-zinc-400 font-semibold">
                    <span>Confidence Threshold</span>
                    <span>{aiConfidence.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={aiConfidence}
                    onChange={(e) => setAiConfidence(Number(e.target.value))}
                    className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-zinc-400 font-semibold">
                    <span>Recognition Delay</span>
                    <span>{aiDelay}ms</span>
                  </div>
                  <input
                    type="range"
                    min="300"
                    max="1800"
                    step="50"
                    value={aiDelay}
                    onChange={(e) => setAiDelay(Number(e.target.value))}
                    className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: DEVELOPER CONFIGURATIONS */}
          <div>
            <button
              onClick={() => setDevExpanded(!devExpanded)}
              className="flex items-center justify-between w-full text-[10px] text-zinc-500 font-bold uppercase tracking-wider text-left"
            >
              <div className="flex items-center gap-1.5">
                <Terminal size={12} className="text-zinc-400" />
                <span>Developer Options</span>
              </div>
              {devExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {devExpanded && (
              <div className="mt-3 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-zinc-400 font-semibold flex items-center gap-1">
                    <Activity size={12} className="text-indigo-400" />
                    Developer Mode
                  </span>
                  <input
                    type="checkbox"
                    checked={devMode}
                    onChange={(e) => toggleDevMode(e.target.checked)}
                    className="w-4 h-4 accent-indigo-500 cursor-pointer rounded bg-zinc-950 border-zinc-800 focus:ring-0"
                  />
                </div>

                <div className="flex items-center justify-between text-xs py-0.5 border-t border-zinc-800/80 pt-2.5 mt-1">
                  <span className="text-zinc-400 font-semibold">Latency Prediction</span>
                  <input
                    type="checkbox"
                    checked={latencyPrediction}
                    onChange={(e) => setLatencyPrediction(e.target.checked)}
                    className="w-4 h-4 accent-indigo-500 cursor-pointer rounded bg-zinc-950 border-zinc-800 focus:ring-0"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6b. Telemetry Monitor & Pipeline Debug Overlay (Exposed strictly in Developer Mode) */}
      {devMode && !isDrawingState && (
        <div className="absolute top-20 right-6 z-40 w-64 p-3.5 bg-zinc-950/80 border border-indigo-500/30 backdrop-blur-2xl rounded-2xl shadow-2xl text-zinc-300 text-xs font-mono space-y-1.5">
          <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider border-b border-zinc-800 pb-1.5 flex items-center justify-between">
            <span>Pipeline Debugger</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Current Mode:</span>
            <span className="font-bold text-white capitalize">{drawMode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Current Gesture:</span>
            <span className="font-bold text-indigo-300">{drawingMethod === "airpen" || drawMode === "smart" ? "Air Pen ☝️ / Pinch 🤏" : "Pinch 🤏"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Pinch Distance:</span>
            <span ref={profPinchDistRef} className="text-zinc-300 font-semibold">N/A</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Draw State:</span>
            <span ref={profDrawStateRef} className="font-bold text-emerald-400">IDLE</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Stroke Count:</span>
            <span className="font-bold text-zinc-200">{pipelineRef.current?.stroke.strokes.length || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Collected Points:</span>
            <span ref={profPointsCountRef} className="font-bold text-zinc-200">0 pts</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Canvas Ready:</span>
            <span className="font-bold text-emerald-400">READY (60Hz)</span>
          </div>
          <div className="flex justify-between border-t border-zinc-900 pt-1">
            <span className="text-zinc-400">OCR Queue:</span>
            <span className="font-bold text-purple-400">{wordBufferRef.current.length} strokes</span>
          </div>
        </div>
      )}

      {/* Floating interactive suggestions overlay panel (Hidden automatically during drawing) */}
      {suggestions && suggestions.length > 0 && !isDrawingState && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 p-3 bg-zinc-900/90 border border-zinc-700/50 rounded-2xl shadow-2xl backdrop-blur-md text-white animate-fade-in">
          <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider select-none font-mono">
            AI Suggestions (Click to Apply)
          </div>
          <div className="flex gap-2">
            {suggestions.map((word) => (
              <button
                key={word}
                onClick={() => selectSuggestion(word)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95"
              >
                {word}
              </button>
            ))}
            <button
              onClick={discardSuggestions}
              className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs rounded-xl transition-all active:scale-95"
            >
              Keep Original
            </button>
          </div>
        </div>
      )}

      {/* 6e. AI Recognition Notification Toast (Hidden automatically during drawing) */}
      {notification && !isDrawingState && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-0.5 px-4.5 py-2.5 bg-zinc-900/95 border border-emerald-500/40 rounded-2xl shadow-2xl backdrop-blur-md text-white font-sans animate-bounce-in select-none">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <span>✓ Recognized:</span>
            <span className="text-white normal-case font-semibold">"{notification.text}"</span>
          </div>
          <div className="text-[10px] text-zinc-500 font-medium">
            Confidence: {Math.round(notification.confidence * 100)}%
          </div>
        </div>
      )}

      {/* ⭐ HERO MODE SELECTOR PANELS */}
      {drawMode === "hero" && (
        <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-end items-center pb-20 select-none">
          
          {/* 1. Dynamic Energy Charge Bar */}
          <div className="w-80 p-1.5 bg-zinc-950/75 border border-zinc-800/80 rounded-full shadow-2xl backdrop-blur-md mb-4 flex items-center gap-3 px-4 pointer-events-auto">
            <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">Energy</span>
            <div className="flex-grow h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-850">
              <div
                id="hero-energy-bar"
                className="h-full rounded-full transition-all duration-75"
                style={{
                  width: "0%",
                  backgroundColor: activeHero.baseColor,
                  boxShadow: `0 0 10px ${activeHero.baseColor}`
                }}
              />
            </div>
            <span id="hero-energy-percent" className="text-[10px] font-mono text-zinc-300 font-bold w-8 text-right">
              0%
            </span>
          </div>

          {/* 2. Horizontal sliding Hero Selection cards */}
          <div className="flex gap-3 overflow-x-auto max-w-[90vw] p-2 pb-3 pointer-events-auto custom-scrollbar">
            {HEROES_LIST.current.map((hero, idx) => {
              const isActive = activeHeroIdx === idx;
              return (
                <button
                  key={hero.name}
                  onClick={() => {
                    setActiveHeroIdx(idx);
                    particleEngineRef.current.clear();
                    projectileSystemRef.current.clear();
                    chargeLevelRef.current = 0;
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all duration-300 shadow-lg border backdrop-blur-md active:scale-95 ${
                    isActive
                      ? "bg-zinc-900/90 text-white font-extrabold"
                      : "bg-zinc-950/50 text-zinc-400 border-zinc-900/40 hover:text-zinc-200"
                  }`}
                  style={{
                    borderColor: isActive ? hero.baseColor : "transparent",
                    boxShadow: isActive ? `0 0 14px ${hero.baseColor}30` : "none"
                  }}
                >
                  <span className="text-lg">{hero.icon}</span>
                  <span className="text-xs uppercase tracking-wider font-semibold">{hero.name}</span>
                </button>
              );
            })}
          </div>

        </div>
      )}

      {/* 6d. SPATIAL BUILD MODE CONTROL BAR */}
      {drawMode === "build" && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-3 pointer-events-auto">
          <div className="flex items-center gap-2 p-2 bg-zinc-950/80 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-2xl">
            {(["neon", "glass", "ice", "lava", "metal", "stone", "wood"] as VoxelBlock["material"][]).map((mat) => (
              <button
                key={mat}
                onClick={() => {
                  setSelectedMaterial(mat);
                  voxelEngineRef.current.setMaterial(mat);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all active:scale-95 ${
                  selectedMaterial === mat
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                {mat}
              </button>
            ))}
            <div className="h-5 w-[1px] bg-zinc-800 mx-1" />
            <button
              onClick={() => voxelEngineRef.current.clear()}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-all"
            >
              Clear Grid
            </button>
          </div>
        </div>
      )}

      {/* 6e. ENGINEERING STUDIO CONTROL BAR & PARAMETRIC COMPONENT PALETTE */}
      {drawMode === "engineering" && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2.5 pointer-events-auto max-w-[95vw]">
          {/* Domain & Controls Header */}
          <div className="flex items-center gap-2 p-1.5 bg-zinc-950/90 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-2xl">
            {(["architecture", "mechanical", "electrical", "robotics"] as EngineeringDomain[]).map((dom) => (
              <button
                key={dom}
                onClick={() => {
                  engineeringEngineRef.current.setDomain(dom);
                  const firstComp = EngineeringStudioEngine.CATALOG.find(c => c.domain === dom);
                  if (firstComp) setActiveCadType(firstComp.type);
                }}
                className={`px-3 py-1 text-xs font-bold capitalize rounded-xl transition-all ${
                  engineeringEngineRef.current.activeDomain === dom
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {dom}
              </button>
            ))}

            <div className="h-5 w-[1px] bg-zinc-800 mx-1" />

            <button
              onClick={() => engineeringEngineRef.current.rotateSelectedNode()}
              className="px-2.5 py-1 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-all"
            >
              🔄 Rotate
            </button>
            <button
              onClick={() => engineeringEngineRef.current.deleteSelectedNode()}
              className="px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 transition-all"
            >
              🗑️ Delete
            </button>
            <button
              onClick={() => engineeringEngineRef.current.clear()}
              className="px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all"
            >
              Clear
            </button>
          </div>

          {/* Component Catalog Pills filtered by active domain */}
          <div className="flex items-center gap-1.5 p-2 bg-zinc-950/80 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-2xl overflow-x-auto max-w-[90vw] custom-scrollbar">
            {EngineeringStudioEngine.CATALOG
              .filter(comp => comp.domain === engineeringEngineRef.current.activeDomain)
              .map((comp) => (
                <button
                  key={comp.id}
                  onClick={() => setActiveCadType(comp.type)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 active:scale-95 ${
                    activeCadType === comp.type
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: comp.material.fillColor }} />
                  <span>{comp.name}</span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Center setup placeholder indicator */}
      {!isTrackingActive && (
        <div className="relative z-30 flex items-center justify-center pointer-events-none">
          <div className="text-center space-y-4 max-w-sm p-6 bg-zinc-900/85 border border-zinc-700/40 rounded-2xl shadow-2xl backdrop-blur-md">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 animate-bounce">
                <Play size={20} fill="currentColor" className="translate-x-[1px]" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Loading AR Environment
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {statusMsg}
            </p>
          </div>
        </div>
      )}

      {/* 7. Bottom Status & Indicator Panels */}
      <footer className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 px-5 py-2 bg-zinc-900/75 backdrop-blur-md border border-zinc-700/50 rounded-2xl shadow-xl text-zinc-400 text-xs pointer-events-auto">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span ref={fpsRef} className="font-semibold text-zinc-200">
            Computing FPS...
          </span>
        </div>
        
        <div className="h-3 w-[1px] bg-zinc-700/60" />

        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className="text-zinc-500">Tool:</span>
          <span className="text-indigo-400 font-semibold uppercase tracking-wider">{activeTool}</span>
        </div>

        <div className="h-3 w-[1px] bg-zinc-700/60" />

        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className="text-zinc-500">Drawing Hand:</span>
          <span ref={statusBarHandRef} className="text-indigo-400 font-semibold uppercase tracking-wider">Right</span>
        </div>

        <div className="h-3 w-[1px] bg-zinc-700/60" />

        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className="text-zinc-500">Left Hand Gesture:</span>
          <span ref={gestureRef} className="text-rose-400 font-semibold uppercase tracking-wider">None</span>
        </div>

        <div className="h-3 w-[1px] bg-zinc-700/60" />

        <div className="text-[10px] text-zinc-300">
          <span ref={pinchStatusRef}>Pinch Fingers to Draw</span>
        </div>
      </footer>
    </main>
  );
}
