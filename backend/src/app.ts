import express, { Express, Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import { config } from './config/env';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';
import swaggerUi from 'swagger-ui-express';
import openApiSpec from './swagger/openapi.json';

const app: Express = express();

// Middleware
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Servir archivos subidos (productos, etc.) desde la carpeta configurada
const uploadsPath = path.isAbsolute(config.uploadsDir)
  ? config.uploadsDir
  : path.join(process.cwd(), config.uploadsDir);
app.use('/uploads', express.static(uploadsPath));

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Swagger UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

// API Routes
app.use('/api', routes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use(errorHandler);

export default app;
