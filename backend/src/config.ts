import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || '3001', 10),
    aiApi: {
        baseUrl: process.env.AI_API_BASE_URL || 'http://127.0.0.1:8000',
        apiKey: process.env.AI_API_KEY || '',
    },
    cors: {
        origin: ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:5173', 'http://localhost:3000'],
        credentials: true,
    },
};
