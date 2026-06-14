import express from 'express';
import cors from 'cors';
import { config } from './config';
import apiRoutes from './routes/api';

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors(config.cors));
app.use(express.json());

// ── Request logging ──────────────────────────────────────────────────────────
app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api', apiRoutes);

// ── Root ─────────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
    res.json({
        service: 'HydroSentient Backend Middleware',
        version: '1.0.0',
        endpoints: [
            'GET  /api/health',
            'POST /api/analyze',
            'GET  /api/status',
            'GET  /api/sensors',
            'GET  /api/violations',
            'GET  /api/predictions',
            'GET  /api/leak-location',
            'GET  /api/report',
        ],
    });
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(config.port, () => {
    console.log(`\n🚀 HydroSentient Backend running on http://localhost:${config.port}`);
    console.log(`📡 AI Model endpoint: ${config.aiApi.baseUrl}`);
    console.log(`🔑 API Key: ${'*'.repeat(config.aiApi.apiKey.length - 4)}${config.aiApi.apiKey.slice(-4)}`);
    console.log(`🌐 CORS: auto-allowing *.onrender.com, *.vercel.app + local origins\n`);
});

export default app;
