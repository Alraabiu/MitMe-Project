import http from 'http';
import { buildApp } from './app.js';
import { env } from './config/env.js';
import { log } from './config/logger.js';
import { connectDB, disconnectDB } from './config/db.js';
import { createIO } from './config/socket.js';
import { registerSockets } from './sockets/index.js';
import { migrateRoles } from './scripts/migrateRoles.js';

const start = async () => {
  await connectDB();

  await migrateRoles();

  const app = buildApp();
  const server = http.createServer(app);
  const io = createIO(server);
  app.set('io', io);

  registerSockets(io);

  await new Promise((resolve) =>
    server.listen(env.PORT, '0.0.0.0', resolve)
  );

  log.info('server_started', {
    port: env.PORT,
    host: '0.0.0.0',
    env: env.NODE_ENV,
  });

  const shutdown = async (signal) => {
    log.warn('shutdown_initiated', { signal });
    io.close();
    server.close(async () => {
      await disconnectDB();
      log.info('shutdown_complete');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) =>
    log.error('unhandled_rejection', { reason: String(reason) })
  );
  process.on('uncaughtException', (err) => {
    log.error('uncaught_exception', { err: err.message, stack: err.stack });
    shutdown('uncaughtException');
  });
};

start().catch((err) => {
  log.error('startup_failed', { err: err.message, stack: err.stack });
  process.exit(1);
});
