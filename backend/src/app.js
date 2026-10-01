import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { env, isProd } from './config/env.js';
import { requestId } from './middleware/requestId.js';
import { notFound, errorHandler } from './middleware/error.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import contactRoutes from './routes/contacts.js';
import conversationRoutes from './routes/conversations.js';
import meetingRoutes from './routes/meetings.js';
import whiteboardRoutes from './routes/whiteboards.js';
import notificationRoutes from './routes/notifications.js';
import adminRoutes from './routes/admin.js';
import classRoutes from './routes/classes.js';
import schoolRoutes from './routes/schools.js';
import joinRoutes from './routes/join.js';

export const buildApp = () => {
  const app = express();
  const origins = env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);

  app.set('trust proxy', 1);
  app.use(requestId);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: origins, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.json({ limit: '5mb' }));
  app.use(morgan(isProd ? 'combined' : 'dev'));

  app.use(
    env.API_PREFIX,
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.get('/health', (_req, res) =>
    res.json({ ok: true, service: 'mitme-api', time: new Date().toISOString() })
  );

  app.use(`${env.API_PREFIX}/auth`, authRoutes);
  app.use(`${env.API_PREFIX}/users`, userRoutes);
  app.use(`${env.API_PREFIX}/contacts`, contactRoutes);
  app.use(`${env.API_PREFIX}/conversations`, conversationRoutes);
  app.use(`${env.API_PREFIX}/meetings`, meetingRoutes);
  app.use(`${env.API_PREFIX}/whiteboards`, whiteboardRoutes);
  app.use(`${env.API_PREFIX}/notifications`, notificationRoutes);
  app.use(`${env.API_PREFIX}/admin`, adminRoutes);
  app.use(`${env.API_PREFIX}/classes`, classRoutes);
  app.use(`${env.API_PREFIX}/schools`, schoolRoutes);

  app.use('/join', joinRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};