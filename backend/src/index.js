import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/authRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import followupRoutes from './routes/followupRoutes.js';
import { PORT, CORS_ORIGIN } from './config.js';

// Inicializa o app Express
const app = express();

// Protege o app com Helmet (segurança de headers HTTP)
app.use(helmet());

// Permite receber JSON no corpo das requisições (limitado a 1mb)
app.use(express.json({ limit: '1mb' }));

// Configura origens permitidas para CORS
const origins = (CORS_ORIGIN || '*')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

// Middleware de CORS: permite apenas origens configuradas
app.use(cors({
    origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (origins.includes('*') || origins.includes(origin)) return cb(null, true);
        return cb(new Error(`Not allowed by CORS: ${origin}`));
    }
}));

// Limita requisições para evitar abuso (rate limit)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 600 // máximo de 600 requisições por janela
});
app.use('/api', limiter);

// Rota de health check
app.get('/healthz', (_, res) => res.json({ ok: true }));

// Rotas de autenticação
app.use('/api/auth', authRoutes);

// Rotas de tickets
app.use('/api/tickets', ticketRoutes);

// Rotas de followups dos tickets
app.use('/api/tickets', followupRoutes);

// Inicia o servidor na porta configurada
app.listen(PORT, () =>
    console.log(`Backend listening on http://localhost:${PORT}`)
);