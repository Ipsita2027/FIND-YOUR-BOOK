import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';

const browserDistFolder = join(import.meta.dirname, '../browser');
const backendApiBaseUrl = process.env['BACKEND_API_URL'] || 'http://localhost:4000';

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use('/api', async (req, res, next) => {
  try {
    const targetUrl = new URL(req.originalUrl, backendApiBaseUrl);
    const headers = new Headers();

    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'undefined') {
        continue;
      }

      if (Array.isArray(value)) {
        headers.set(key, value.join(', '));
      } else {
        headers.set(key, value);
      }
    }

    headers.set('x-forwarded-host', req.get('host') || '');
    headers.set('x-forwarded-proto', req.protocol);

    const requestBody =
      req.method === 'GET' || req.method === 'HEAD'
        ? undefined
        : (Readable.toWeb(req) as unknown as BodyInit);
    const requestInit: RequestInit & { duplex?: 'half' } = {
      method: req.method,
      headers,
      body: requestBody,
      duplex: req.method === 'GET' || req.method === 'HEAD' ? undefined : 'half',
    };

    const response = await fetch(targetUrl, requestInit);

    res.status(response.status);

    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'transfer-encoding') {
        return;
      }

      res.setHeader(key, value);
    });

    if (!response.body) {
      res.end();
      return;
    }

    Readable.fromWeb(response.body as NodeReadableStream).pipe(res);
  } catch (error) {
    next(error);
  }
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 8000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 8000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
