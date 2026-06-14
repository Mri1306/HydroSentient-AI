import { Router, Request, Response } from 'express';
import {
    aiWaterClient,
    SensorPayload,
    AnomalyResponse,
    LeakResponse,
} from '../aiWaterClient';

const router = Router();

// ─── Default sensor values (baseline "normal" readings) ────────────────────
const DEFAULT_SENSORS: SensorPayload = {
    timestamp: new Date().toISOString(),
    ph: 7.0,
    Hardness: 200,
    Solids: 20000,
    Chloramines: 7.0,
    Sulfate: 330,
    Conductivity: 420,
    Organic_carbon: 14,
    Trihalomethanes: 66,
    Turbidity: 3.5,
    pressure: 55.0,
};

// Store the last analysis result in‐memory for GET endpoints (Dashboard)
let lastSensorData: SensorPayload = { ...DEFAULT_SENSORS };
let lastAnomalyResult: AnomalyResponse | null = null;
let lastLeakResult: LeakResponse | null = null;
let lastTTFResult: { remaining_useful_life: number; unit: string } | null = null;

// ─── Health Check ──────────────────────────────────────────────────────────
router.get('/health', async (_req: Request, res: Response) => {
    try {
        const aiHealth = await aiWaterClient.healthCheck();
        res.json({
            backend: 'healthy',
            ai_model: aiHealth,
        });
    } catch (err: any) {
        res.json({
            backend: 'healthy',
            ai_model: { status: 'unreachable', error: err.message },
        });
    }
});

// ─── Full Analysis (Simulation page) ───────────────────────────────────────
// POST /api/analyze  — accepts sensor parameters, calls all 3 AI_Water endpoints
router.post('/analyze', async (req: Request, res: Response) => {
    try {
        // Map frontend keys (lowercase) to AI_Water keys (mixed case)
        const body = req.body;
        console.log('[DEBUG] Frontend sent:', JSON.stringify(body, null, 2));

        const sensorData: SensorPayload = {
            timestamp: new Date().toISOString(),
            ph: body.ph ?? body.pH ?? DEFAULT_SENSORS.ph,
            Hardness: body.hardness ?? body.Hardness ?? DEFAULT_SENSORS.Hardness,
            Solids: body.solids ?? body.Solids ?? DEFAULT_SENSORS.Solids,
            Chloramines: body.chloramines ?? body.Chloramines ?? DEFAULT_SENSORS.Chloramines,
            Sulfate: body.sulfate ?? body.Sulfate ?? DEFAULT_SENSORS.Sulfate,
            Conductivity: body.conductivity ?? body.Conductivity ?? DEFAULT_SENSORS.Conductivity,
            Organic_carbon: body.organic_carbon ?? body.Organic_carbon ?? DEFAULT_SENSORS.Organic_carbon,
            Trihalomethanes: body.trihalomethanes ?? body.Trihalomethanes ?? DEFAULT_SENSORS.Trihalomethanes,
            Turbidity: body.turbidity ?? body.Turbidity ?? DEFAULT_SENSORS.Turbidity,
            pressure: body.pressure ?? DEFAULT_SENSORS.pressure,
        };

        console.log('[DEBUG] Sending to AI_Water:', JSON.stringify(sensorData, null, 2));

        // Fire all 3 requests to AI_Water in parallel
        const [anomalyResult, ttfResult, leakResult] = await Promise.all([
            aiWaterClient.predictAnomaly(sensorData),
            aiWaterClient.predictTTF(sensorData),
            aiWaterClient.leakLocalization(sensorData),
        ]);

        // Cache results for Dashboard GET endpoints
        lastSensorData = sensorData;
        lastAnomalyResult = anomalyResult;
        lastTTFResult = ttfResult;
        lastLeakResult = leakResult;

        // ── Transform to the shape the frontend expects ──────────────────────
        const riskLevel = anomalyResult.risk_level === 'CRITICAL'
            ? 'CRITICAL'
            : anomalyResult.risk_level === 'HIGH' || anomalyResult.risk_level === 'MEDIUM'
                ? 'WARNING'
                : 'SAFE';

        const systemStatus = {
            anomalyDetected: anomalyResult.is_anomaly,
            riskLevel,
            globalZScore: Math.round(anomalyResult.global_z_score * 100) / 100,
            confidenceScore: Math.round(anomalyResult.confidence_score * 10) / 10,
        };

        // Map violations
        const violations = (anomalyResult.top_violations || []).map((v) => ({
            parameter: v.parameter,
            deviation: Math.round(v.deviation * 100) / 100,
            zScore: Math.round(v.z_score * 100) / 100,
            severity: v.severity === 'ELEVATED' ? 'HIGH' : v.severity,
        }));

        // Map all sensor metrics
        const sensorParameters = Object.entries(anomalyResult.metrics || {}).map(
            ([name, metric]) => ({
                name: formatParamName(name),
                value: Math.round(metric.value * 100) / 100,
                baseline: metric.baseline,
                deviation: Math.round(metric.deviation * 100) / 100,
                zScore: Math.round(metric.z_score * 100) / 100,
                status: metric.status === 'NORMAL' ? 'NORMAL' : metric.status === 'ELEVATED' ? 'HIGH' : metric.status,
            })
        );

        // Prediction
        const prediction = {
            remainingUsefulLife: Math.round(ttfResult.remaining_useful_life),
            stabilityPercent: Math.min(100, Math.max(0, Math.round(
                (ttfResult.remaining_useful_life / 2000) * 100
            ))),
        };

        // Leak localization
        const leakLocation = {
            probableSegment: leakResult.probable_leak_segment,
            anomalyDetected: leakResult.status === 'anomaly_detected',
            confidence: leakResult.global_confidence,
            segments: (leakResult.segment_analysis || []).map((seg) => ({
                segment: seg.name,
                probability: seg.probability_percent,
                status: seg.probability_percent > 50 ? 'Anomaly Detected' : seg.probability_percent > 20 ? 'Monitoring' : 'Normal',
            })),
        };

        // Impact report from LLM (detect error responses and use fallback)
        const llmAnalysis = anomalyResult.llm_analysis;
        const isLLMError = !llmAnalysis || llmAnalysis.startsWith('LLM Connection Error');
        const report = {
            analysis: isLLMError
                ? generateFallbackReport(anomalyResult, leakResult, ttfResult)
                : llmAnalysis,
        };

        res.json({
            systemStatus,
            violations,
            sensorParameters,
            prediction,
            leakLocation,
            report,
        });
    } catch (err: any) {
        console.error('Analysis error:', err.message);
        res.status(502).json({
            error: 'AI Model Error',
            detail: err.response?.data?.detail || err.message,
        });
    }
});

// ─── Dashboard GET endpoints (return cached last analysis) ─────────────────

router.get('/status', async (_req: Request, res: Response) => {
    if (lastAnomalyResult) {
        const riskLevel = lastAnomalyResult.risk_level === 'CRITICAL'
            ? 'CRITICAL'
            : lastAnomalyResult.risk_level === 'HIGH' || lastAnomalyResult.risk_level === 'MEDIUM'
                ? 'WARNING'
                : 'SAFE';
        return res.json({
            anomalyDetected: lastAnomalyResult.is_anomaly,
            riskLevel,
            globalZScore: lastAnomalyResult.global_z_score,
            confidenceScore: lastAnomalyResult.confidence_score,
        });
    }
    // No analysis run yet — run one with default data
    try {
        const result = await aiWaterClient.predictAnomaly(DEFAULT_SENSORS);
        lastAnomalyResult = result;
        lastSensorData = { ...DEFAULT_SENSORS };
        const riskLevel = result.risk_level === 'CRITICAL' ? 'CRITICAL' : result.risk_level === 'HIGH' ? 'WARNING' : 'SAFE';
        res.json({
            anomalyDetected: result.is_anomaly,
            riskLevel,
            globalZScore: result.global_z_score,
            confidenceScore: result.confidence_score,
        });
    } catch (err: any) {
        res.status(502).json({ error: 'AI Model unreachable', detail: err.message });
    }
});

router.get('/sensors', (_req: Request, res: Response) => {
    if (lastAnomalyResult?.metrics) {
        const sensorParameters = Object.entries(lastAnomalyResult.metrics).map(
            ([name, metric]) => ({
                name: formatParamName(name),
                value: metric.value,
                baseline: metric.baseline,
                deviation: metric.deviation,
                zScore: metric.z_score,
                status: metric.status === 'NORMAL' ? 'NORMAL' : metric.status === 'ELEVATED' ? 'HIGH' : metric.status,
            })
        );
        return res.json(sensorParameters);
    }
    res.json([]);
});

router.get('/violations', (_req: Request, res: Response) => {
    if (lastAnomalyResult?.top_violations) {
        return res.json(
            lastAnomalyResult.top_violations.map((v) => ({
                parameter: v.parameter,
                deviation: v.deviation,
                zScore: v.z_score,
                severity: v.severity === 'ELEVATED' ? 'HIGH' : v.severity,
            }))
        );
    }
    res.json([]);
});

router.get('/predictions', (_req: Request, res: Response) => {
    if (lastTTFResult) {
        return res.json({
            remainingUsefulLife: Math.round(lastTTFResult.remaining_useful_life),
            stabilityPercent: Math.min(100, Math.max(0, Math.round(
                (lastTTFResult.remaining_useful_life / 2000) * 100
            ))),
        });
    }
    res.json({ remainingUsefulLife: 0, stabilityPercent: 0 });
});

router.get('/leak-location', (_req: Request, res: Response) => {
    if (lastLeakResult) {
        // Normalize probabilities to sum to 100%
        const rawSegments = lastLeakResult.segment_analysis || [];
        const totalProb = rawSegments.reduce((sum, seg) => sum + seg.probability_percent, 0);
        const normalizedSegments = rawSegments.map((seg) => {
            const normalizedProb = totalProb > 0 ? (seg.probability_percent / totalProb) * 100 : 0;
            return {
                segment: seg.name,
                probability: Math.round(normalizedProb * 100) / 100, // Round to 2 decimals
                status: normalizedProb > 50 ? 'Anomaly Detected' : normalizedProb > 20 ? 'Monitoring' : 'Normal',
            };
        });

        return res.json({
            probableSegment: lastLeakResult.probable_leak_segment,
            anomalyDetected: lastLeakResult.status === 'anomaly_detected',
            confidence: lastLeakResult.global_confidence,
            segments: normalizedSegments,
        });
    }
    res.json({ probableSegment: 'N/A', anomalyDetected: false, confidence: 0, segments: [] });
});

router.get('/report', (_req: Request, res: Response) => {
    const llmOk = lastAnomalyResult?.llm_analysis && !lastAnomalyResult.llm_analysis.startsWith('LLM Connection Error');
    if (llmOk) {
        return res.json({ analysis: lastAnomalyResult!.llm_analysis });
    }
    if (lastAnomalyResult && lastLeakResult && lastTTFResult) {
        return res.json({
            analysis: generateFallbackReport(lastAnomalyResult, lastLeakResult, lastTTFResult),
        });
    }
    res.json({ analysis: 'No analysis has been run yet. Go to the Simulation page to run an analysis.' });
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatParamName(key: string): string {
    const map: Record<string, string> = {
        pressure: 'Pressure',
        ph: 'pH',
        Hardness: 'Hardness',
        Solids: 'Solids',
        Chloramines: 'Chloramines',
        Sulfate: 'Sulfate',
        Conductivity: 'Conductivity',
        Organic_carbon: 'Organic Carbon',
        Trihalomethanes: 'Trihalomethanes',
        Turbidity: 'Turbidity',
    };
    return map[key] || key;
}

function generateFallbackReport(
    anomaly: AnomalyResponse,
    leak: LeakResponse,
    ttf: { remaining_useful_life: number; unit: string }
): string {
    const status = anomaly.is_anomaly ? 'ANOMALY DETECTED' : 'SYSTEM NORMAL';
    const topViolation = anomaly.top_violations?.[0];

    let report = `INFRASTRUCTURE SAFETY ANALYSIS\n\n`;
    report += `System Status: ${status}\n`;
    report += `Risk Level: ${anomaly.risk_level}\n`;
    report += `Confidence: ${anomaly.confidence_score.toFixed(1)}%\n`;
    report += `Global Z-Score: ${anomaly.global_z_score.toFixed(2)}\n\n`;

    if (topViolation) {
        report += `Primary Violation\n`;
        report += `${topViolation.parameter} — Z-Score: ${topViolation.z_score.toFixed(2)} (${topViolation.severity})\n`;
        report += `Value: ${topViolation.value}, Deviation: ${topViolation.deviation > 0 ? '+' : ''}${topViolation.deviation.toFixed(1)}\n\n`;
    }

    report += `Leak Localization\n`;
    report += `Most Probable Segment: ${leak.probable_leak_segment}\n`;
    report += `Status: ${leak.status}\n\n`;

    report += `Remaining Useful Life\n`;
    report += `Estimated: ${Math.round(ttf.remaining_useful_life)} ${ttf.unit}\n`;

    return report;
}

export default router;
