import dotenv from 'dotenv';

dotenv.config();

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LOG_LEVELS: LogLevel[] = ['error', 'warn', 'info', 'debug'];

function parseLogLevel(): LogLevel {
  const fallback: LogLevel =
    (process.env.NODE_ENV || 'development') === 'production' ? 'info' : 'debug';
  const raw = (process.env.LOG_LEVEL || fallback).trim().toLowerCase();
  if (LOG_LEVELS.includes(raw as LogLevel)) return raw as LogLevel;
  console.warn(`[config] Invalid LOG_LEVEL "${raw}", falling back to info`);
  return 'info';
}

const logLevelRank: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

export function isLogLevelAtLeast(level: LogLevel): boolean {
  return logLevelRank[config.logLevel] >= logLevelRank[level];
}

export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: parseLogLevel(),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    name: process.env.DB_NAME || 'saru_visas',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  },
  pg: {
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432', 10),
    name: process.env.PG_NAME || '',
    user: process.env.PG_USER || '',
    password: process.env.PG_PASSWORD || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  cors: {
    origin: process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
      : ['http://localhost:5173'],
  },
  /** Ruta base para subida de archivos (logos, productos, etc.). Por defecto usa ./uploads desde el directorio de trabajo del proceso. */
  uploadsDir: process.env.UPLOADS_DIR || 'uploads',
  /** Limite maximo (MB) para plantilla PDF de formularios */
  pdfTemplateMaxMb: parseInt(process.env.PDF_TEMPLATE_MAX_MB || '25', 10),
};
