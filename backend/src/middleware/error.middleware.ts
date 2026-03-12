import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

export interface ApiError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: ApiError & { code?: string },
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'La imagen no puede superar 5 MB';
  } else if (message === 'Only image files are allowed') {
    statusCode = 400;
    message = 'Solo se permiten archivos de imagen (jpg, png, gif, webp)';
  }

  console.error('Error:', {
    statusCode,
    message,
    stack: config.nodeEnv === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  res.status(statusCode).json({
    error: message,
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
};
