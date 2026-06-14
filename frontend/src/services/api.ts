// Centralized API service layer — connects to the HydroSentient Express backend,
// which in turn talks to the AI_Water FastAPI model service.
//
// VITE_API_URL must point at the backend's /api root, e.g.:
//   - Local dev:  http://localhost:3001/api
//   - Production: https://your-backend.example.com/api
//
// If VITE_API_URL is unset, we fall back to a same-origin "/api" path so the
// app still attempts a sensible request instead of calling "undefined/status".

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export interface SystemStatus {
  anomalyDetected: boolean;
  riskLevel: 'SAFE' | 'WARNING' | 'CRITICAL';
  globalZScore: number;
  confidenceScore: number;
}

export interface SensorParameter {
  name: string;
  value: number;
  baseline: number;
  deviation: number;
  zScore: number;
  status: 'NORMAL' | 'HIGH' | 'CRITICAL';
}

export interface Violation {
  parameter: string;
  deviation: number;
  zScore: number;
  severity: 'NORMAL' | 'HIGH' | 'CRITICAL';
}

export interface Prediction {
  remainingUsefulLife: number;
  stabilityPercent: number;
}

export interface LeakSegment {
  segment: string;
  probability: number;
  status: string;
}

export interface LeakLocation {
  probableSegment: string;
  anomalyDetected: boolean;
  confidence: number;
  segments: LeakSegment[];
}

export interface ImpactReport {
  analysis: string;
}

// Shape returned by POST /analyze. Note the backend returns sensor data
// under "sensorParameters", not "sensors".
export interface AnalysisResult {
  systemStatus: SystemStatus;
  violations: Violation[];
  sensorParameters: SensorParameter[];
  prediction: Prediction;
  leakLocation: LeakLocation;
  report: ImpactReport;
}

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${url}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new ApiError(
      `Could not reach the backend at "${API_BASE}${url}". ` +
      `Check that the server is running and VITE_API_URL is set correctly.`
    );
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(err.detail || err.error || `Request failed (${res.status})`, res.status);
  }

  try {
    return await res.json();
  } catch {
    throw new ApiError("Received an invalid response from the server.");
  }
}

export async function getSystemStatus(): Promise<SystemStatus> {
  return apiFetch<SystemStatus>('/status');
}

export async function getSensorData(): Promise<SensorParameter[]> {
  return apiFetch<SensorParameter[]>('/sensors');
}

export async function getViolations(): Promise<Violation[]> {
  return apiFetch<Violation[]>('/violations');
}

export async function getPredictions(): Promise<Prediction> {
  return apiFetch<Prediction>('/predictions');
}

export async function getLeakLocation(): Promise<LeakLocation> {
  return apiFetch<LeakLocation>('/leak-location');
}

export async function getImpactReport(): Promise<ImpactReport> {
  return apiFetch<ImpactReport>('/report');
}

export async function runAnalysis(params: Record<string, number>): Promise<AnalysisResult> {
  return apiFetch<AnalysisResult>('/analyze', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function checkHealth(): Promise<{ backend: string; ai_model: { status: string; error?: string } }> {
  return apiFetch('/health');
}

/**
 * Fetches the dashboard snapshot from the cached GET endpoints.
 * These return empty/zeroed data until at least one /analyze call has
 * been made on the backend (the backend caches the last result in memory).
 */
export async function getDashboardSnapshot(): Promise<AnalysisResult> {
  const [systemStatus, sensorParameters, violations, prediction, leakLocation, report] = await Promise.all([
    getSystemStatus(),
    getSensorData(),
    getViolations(),
    getPredictions(),
    getLeakLocation(),
    getImpactReport(),
  ]);
  return { systemStatus, sensorParameters, violations, prediction, leakLocation, report };
}

/** True if a snapshot represents "no analysis has run yet" placeholder data. */
export function isEmptySnapshot(snapshot: AnalysisResult | null): boolean {
  if (!snapshot) return true;
  return (
    snapshot.sensorParameters.length === 0 &&
    snapshot.violations.length === 0 &&
    snapshot.leakLocation.segments.length === 0
  );
}
