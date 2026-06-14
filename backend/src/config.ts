import dotenv from 'dotenv';
dotenv.config();

const allowedOrigins = [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:5173',
    'http://localhost:3000',
    ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) : []),
];

export const config = {
    port: parseInt(process.env.PORT || '3001', 10),
    aiApi: {
        baseUrl: process.env.AI_API_BASE_URL || 'http://127.0.0.1:8000',
        apiKey: process.env.AI_API_KEY || '',
    },
    cors: {
        origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
            if (!origin) return callback(null, true);
            if (
                origin.endsWith('.onrender.com') ||
                origin.endsWith('.vercel.app') ||
                origin.endsWith('.netlify.app') ||
                allowedOrigins.includes(origin)
            ) {
                return callback(null, true);
            }
            callback(new Error(`CORS blocked: ${origin}`));
        },
        credentials: true,
    },
};