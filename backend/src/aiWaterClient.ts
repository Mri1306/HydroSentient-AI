import axios, { AxiosInstance } from 'axios';
import { config } from './config';

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
        nodes: Array<{ id: string; name: string; metadata: string }>;
        links: Array<{ source: string; target: string }>;
    };
}

class AIWaterClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: config.aiApi.baseUrl,
            timeout: 30000, // 30s timeout for LLM inference
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': config.aiApi.apiKey, // <-- PASSWORD SET HERE, NOT IN FRONTEND
            },
        });
    }

    async healthCheck(): Promise<{ status: string; service: string; version: string }> {
        const { data } = await this.client.get('/health');
        return data;
    }

    async predictAnomaly(sensorData: SensorPayload): Promise<AnomalyResponse> {
        const { data } = await this.client.post<AnomalyResponse>('/predict-anomaly', sensorData);
        return data;
    }

    async predictTTF(sensorData: SensorPayload): Promise<TTFResponse> {
        const { data } = await this.client.post<TTFResponse>('/predict-ttf', sensorData);
        return data;
    }

    async leakLocalization(sensorData: SensorPayload): Promise<LeakResponse> {
        const { data } = await this.client.post<LeakResponse>('/leak-localization', sensorData);
        return data;
    }
}

// Singleton instance
export const aiWaterClient = new AIWaterClient();
