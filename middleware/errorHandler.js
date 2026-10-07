import { logger } from '../services/loggingService.js';

/**
 * Global error handler.
 *
 * 4xx messages are intentional API responses (validation errors, RBAC denials,
 * not-found) and are safe to return verbatim. 5xx messages are internal —
 * driver errors, SQL fragments, file paths — so in production the client only
 * ever sees a generic message; the full detail (message + stack + request
 * context) stays in logs/error.log for on-call debugging.
 */
const errorHandler = (error, req, res, _next) => {
  const status =
    Number.isInteger(error?.status) && error.status >= 400 && error.status <= 599
      ? error.status
      : 500;

  const message = error?.message || 'Internal server error';

  logger.error(`${req.method} ${req.originalUrl} -> ${status}: ${message}`, {
    stack: error?.stack,
    userId: req.user?.id ?? null
  });

  if (status >= 500 && process.env.NODE_ENV === 'production') {
    return res.status(status).json({ error: 'Internal server error' });
  }

  res.status(status).json({ error: message });
};

export default errorHandler;
