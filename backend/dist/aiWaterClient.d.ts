/**
 * AI_Water API Client
 * Handles all communication with the AI_Water FastAPI service.
 * The API key is injected from the backend .env — never exposed to the frontend.
 */
export interface SensorPayload {
    timestamp?: string;
    ph: number;
    Hardness: number;
    Solids: number;
    Chloramines: number;
    Sulfate: number;
    Conductivity: number;
    Organic_carbon: number;
    Trihalomethanes: number;
    Turbidity: number;
    pressure: number;
}
export interface AnomalyMetric {
    value: number;
    baseline: number;
    deviation: number;
    z_score: number;
    status: string;
}
export interface AnomalyViolation {
    parameter: string;
    value: number;
    deviation: number;
    z_score: number;
    severity: string;
}
export interface AnomalyResponse {
    is_anomaly: boolean;
    risk_level: string;
    confidence_score: number;
    global_z_score: number;
    top_violations: AnomalyViolation[];
    metrics: Record<string, AnomalyMetric>;
    llm_analysis: string | null;
}
export interface TTFResponse {
    remaining_useful_life: number;
    unit: string;
}
export interface LeakSegment {
    id: string;
    name: string;
    metadata: string;
    probability_percent: number;
}
export interface LeakResponse {
    status: string;
    global_confidence: number;
    probable_leak_segment: string;
    segment_analysis: LeakSegment[];
    infrastructure_map: {
        nodes: Array<{
            id: string;
            name: string;
            metadata: string;
        }>;
        links: Array<{
            source: string;
            target: string;
        }>;
    };
}
declare class AIWaterClient {
    private client;
    constructor();
    healthCheck(): Promise<{
        status: string;
        service: string;
        version: string;
    }>;
    predictAnomaly(sensorData: SensorPayload): Promise<AnomalyResponse>;
    predictTTF(sensorData: SensorPayload): Promise<TTFResponse>;
    leakLocalization(sensorData: SensorPayload): Promise<LeakResponse>;
}
export declare const aiWaterClient: AIWaterClient;
export {};
//# sourceMappingURL=aiWaterClient.d.ts.map