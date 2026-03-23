/**
 * 错误处理中间件
 */

import { Request, Response, NextFunction } from 'express';
import { NotFoundError, ValidationError } from '../types/index.js';
import logger from '../../utils/logger.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error('Unhandled error', err, { path: req.path, method: req.method });

  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }

  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
}