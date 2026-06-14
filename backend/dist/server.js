"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const api_1 = __importDefault(require("./routes/api"));
const app = (0, express_1.default)();
// ── Middleware ────────────────────────────────────────────────────────────────
app.use((0, cors_1.default)(config_1.config.cors));
app.use(express_1.default.json());
// ── Request logging ──────────────────────────────────────────────────────────
app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api', api_1.default);
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
app.listen(config_1.config.port, () => {
    console.log(`\n🚀 HydroSentient Backend running on http://localhost:${config_1.config.port}`);
    console.log(`📡 AI Model endpoint: ${config_1.config.aiApi.baseUrl}`);
    console.log(`🔑 API Key: ${'*'.repeat(config_1.config.aiApi.apiKey.length - 4)}${config_1.config.aiApi.apiKey.slice(-4)}`);
    console.log(`🌐 CORS allowed: ${config_1.config.cors.origin.join(', ')}\n`);
});
exports.default = app;
//# sourceMappingURL=server.js.map