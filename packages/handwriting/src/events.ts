import { RecognitionResult, MathExpressionPrediction, SymbolPrediction } from "./types";

export type HandwritingBusEventType =
  | "RecognitionStarted"
  | "RecognitionUpdated"
  | "RecognitionCompleted"
  | "RecognitionFailed"
  | "TextCorrected"
  | "HandwritingRecognized"
  | "MathExpressionRecognized"
  | "SymbolRecognized"
  | "HandwritingRecognitionFailed";

export interface RecognitionStartedEvent {
  type: "RecognitionStarted";
  payload: { sessionId: string; strokeIds: string[] };
  timestamp: number;
}

export interface RecognitionUpdatedEvent {
  type: "RecognitionUpdated";
  payload: { sessionId: string; strokeIds: string[]; partialText: string };
  timestamp: number;
}

export interface RecognitionCompletedEvent {
  type: "RecognitionCompleted";
  payload: { sessionId: string; strokeIds: string[]; text: string; confidence: number };
  timestamp: number;
}

export interface RecognitionFailedEvent {
  type: "RecognitionFailed";
  payload: { sessionId: string; strokeIds: string[]; reason: string };
  timestamp: number;
}

export interface TextCorrectedEvent {
  type: "TextCorrected";
  payload: { sessionId: string; originalText: string; correctedText: string; confidence: number };
  timestamp: number;
}

export interface HandwritingRecognizedEvent {
  type: "HandwritingRecognized";
  payload: { strokeIds: string[]; result: RecognitionResult };
  timestamp: number;
}

export interface MathExpressionRecognizedEvent {
  type: "MathExpressionRecognized";
  payload: { strokeIds: string[]; result: MathExpressionPrediction };
  timestamp: number;
}

export interface SymbolRecognizedEvent {
  type: "SymbolRecognized";
  payload: { strokeIds: string[]; result: SymbolPrediction };
  timestamp: number;
}

export interface HandwritingRecognitionFailedEvent {
  type: "HandwritingRecognitionFailed";
  payload: { strokeIds: string[]; reason: string };
  timestamp: number;
}

export type HandwritingBusEvent =
  | RecognitionStartedEvent
  | RecognitionUpdatedEvent
  | RecognitionCompletedEvent
  | RecognitionFailedEvent
  | TextCorrectedEvent
  | HandwritingRecognizedEvent
  | MathExpressionRecognizedEvent
  | SymbolRecognizedEvent
  | HandwritingRecognitionFailedEvent;
