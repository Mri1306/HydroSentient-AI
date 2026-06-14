"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiWaterClient = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("./config");
class AIWaterClient {
    constructor() {
        this.client = axios_1.default.create({
            baseURL: config_1.config.aiApi.baseUrl,
            timeout: 30000, // 30s timeout for LLM inference
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': config_1.config.aiApi.apiKey, // <-- PASSWORD SET HERE, NOT IN FRONTEND
            },
        });
    }
    async healthCheck() {
        const { data } = await this.client.get('/health');
        return data;
    }
    async predictAnomaly(sensorData) {
        const { data } = await this.client.post('/predict-anomaly', sensorData);
        return data;
    }
    async predictTTF(sensorData) {
        const { data } = await this.client.post('/predict-ttf', sensorData);
        return data;
    }
    async leakLocalization(sensorData) {
        const { data } = await this.client.post('/leak-localization', sensorData);
        return data;
    }
}
// Singleton instance
exports.aiWaterClient = new AIWaterClient();
//# sourceMappingURL=aiWaterClient.js.map