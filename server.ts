/**
 * ============================================================================
 * LOCAL DEVELOPMENT & HOSTING SERVER (Express + Vite Middleware)
 * ============================================================================
 * ARCHITECTURE:
 * - Frontend SPA: React + Vite (Cloudflare Pages static hosting in production)
 * - Single Authoritative Backend: Google Apps Script (Code.gs)
 * - Gemini AI MCQ Generation: Directly executed inside Google Apps Script (UrlFetchApp)
 *
 * This server.ts serves the Vite dev server during local development on port 3000
 * and serves the production static build in containerized environments.
 * ============================================================================
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// Safely load local .env variables into process.env if available in Node runtime
try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile();
  }
} catch {
  // .env file is optional in containerized environments where env vars are injected directly
}

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // Safe JSON error handling middleware for malformed request bodies
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_REQUEST',
        message: 'Invalid JSON payload in request body.'
      });
    }
    next(err);
  });

  // Guarantee application/json header & CORS for /api routes
  app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    next();
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'CNE Management System API',
      timestamp: new Date().toISOString()
    });
  });

  // Catch-all route for unhandled /api calls to prevent HTML fall-through
  app.all('/api/*all', (req, res) => {
    res.status(404).json({
      success: false,
      errorCode: 'NOT_FOUND',
      message: 'API endpoint not found.'
    });
  });

  // Vite middleware setup for local development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CNE Management System server running on http://localhost:${PORT}`);
  });
}

startServer();
