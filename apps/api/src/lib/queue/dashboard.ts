// ═══════════════════════════════════════════════════════════════
// BULL-BOARD DASHBOARD — Mounted at /internal/queues
//
// HTTP Basic Auth protects access (BULL_BOARD_USER + BULL_BOARD_PASSWORD).
// Disabled if QUEUE_REDIS_URL not set (graceful no-op).
// CSP relaxed ONLY for /internal/queues — main API stays locked down.
//
// Task #41.5 polish:
//   - Custom CSS injection (Datun teal/dark theme)
//   - Branded page title + favicon
//   - Monospace counts, FAANG aesthetic
//
// Pattern: Linear internal admin tools, Vercel admin queues.
// ═══════════════════════════════════════════════════════════════

import type { Express, Request, Response, NextFunction } from 'express';
import basicAuth from 'express-basic-auth';
import helmet from 'helmet';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { getAllQueues } from './queues.js';
import { env } from '../../config/env.js';
import { logger } from '../logger.js';

const DASHBOARD_PATH = '/internal/queues';

/**
 * Custom CSS — Datun brand applied over bull-board defaults.
 * Brand: teal #00A896 + dark #0A0F1A (memory: locked colors).
 * Loaded via response interception below.
 */
const DATUN_DASHBOARD_CSS = `
:root {
  --datun-teal: #00A896;
  --datun-teal-light: #02C39A;
  --datun-dark: #0A0F1A;
  --datun-dark-2: #131826;
  --datun-text: #E8ECF1;
  --datun-text-dim: #8B95A5;
  --datun-border: #1F2937;
}

body {
  background: var(--datun-dark) !important;
  color: var(--datun-text) !important;
  font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
}

/* Sidebar */
[class*="sidebar"], [class*="Sidebar"], aside {
  background: var(--datun-dark-2) !important;
  border-right: 1px solid var(--datun-border) !important;
}

/* Header / top bar */
header, [class*="header"], [class*="Header"], [class*="topbar"] {
  background: var(--datun-dark-2) !important;
  border-bottom: 1px solid var(--datun-border) !important;
}

/* Queue cards */
[class*="queueCard"], [class*="QueueCard"], [class*="card"] {
  background: var(--datun-dark-2) !important;
  border: 1px solid var(--datun-border) !important;
  border-radius: 12px !important;
  transition: border-color 0.15s ease, transform 0.15s ease !important;
}

[class*="queueCard"]:hover, [class*="QueueCard"]:hover, [class*="card"]:hover {
  border-color: var(--datun-teal) !important;
}

/* Queue title in card */
[class*="queueCard"] h2, [class*="queueCard"] h3,
[class*="QueueCard"] h2, [class*="QueueCard"] h3 {
  color: var(--datun-text) !important;
  font-weight: 600 !important;
  letter-spacing: -0.01em !important;
}

/* Job counts — monospace, FAANG aesthetic */
[class*="jobCount"], [class*="count"], [class*="Count"] {
  font-family: 'JetBrains Mono', 'SF Mono', Menlo, monospace !important;
  font-variant-numeric: tabular-nums !important;
  color: var(--datun-text) !important;
}

/* Status legend dots */
[class*="statusLegend"] [class*="dot"],
[class*="StatusLegend"] [class*="dot"] {
  width: 8px !important;
  height: 8px !important;
}

/* Progress bars */
[class*="progress"], [class*="Progress"] {
  background: var(--datun-border) !important;
  border-radius: 9999px !important;
  height: 4px !important;
}

[class*="progress"] > *, [class*="Progress"] > * {
  background: linear-gradient(90deg, var(--datun-teal), var(--datun-teal-light)) !important;
}

/* Buttons */
button {
  font-family: 'Inter', system-ui, sans-serif !important;
  font-weight: 500 !important;
  letter-spacing: -0.005em !important;
}

/* Primary action buttons */
button[class*="primary"], button[type="submit"] {
  background: var(--datun-teal) !important;
  color: #ffffff !important;
  border: none !important;
}

button[class*="primary"]:hover, button[type="submit"]:hover {
  background: var(--datun-teal-light) !important;
}

/* Filter input */
input[type="text"], input[type="search"] {
  background: var(--datun-dark) !important;
  color: var(--datun-text) !important;
  border: 1px solid var(--datun-border) !important;
  border-radius: 8px !important;
  padding: 8px 12px !important;
}

input[type="text"]:focus, input[type="search"]:focus {
  outline: none !important;
  border-color: var(--datun-teal) !important;
  box-shadow: 0 0 0 3px rgba(0, 168, 150, 0.15) !important;
}

/* Tables (jobs list view) */
table {
  border-collapse: collapse !important;
  background: var(--datun-dark-2) !important;
  border-radius: 12px !important;
  overflow: hidden !important;
}

thead {
  background: var(--datun-dark) !important;
  border-bottom: 1px solid var(--datun-border) !important;
}

th, td {
  border-color: var(--datun-border) !important;
  padding: 12px 16px !important;
  text-align: left !important;
}

th {
  color: var(--datun-text-dim) !important;
  font-weight: 500 !important;
  font-size: 12px !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
}

td {
  color: var(--datun-text) !important;
  font-size: 14px !important;
}

tr:hover td {
  background: rgba(0, 168, 150, 0.04) !important;
}

/* Logo / brand title */
[class*="logo"], [class*="Logo"], [class*="brand"] {
  color: var(--datun-teal) !important;
  font-weight: 700 !important;
  letter-spacing: -0.02em !important;
}

/* Code blocks (job data) */
pre, code, [class*="codeBlock"] {
  background: var(--datun-dark) !important;
  color: var(--datun-text) !important;
  border: 1px solid var(--datun-border) !important;
  border-radius: 8px !important;
  font-family: 'JetBrains Mono', 'SF Mono', Menlo, monospace !important;
  font-size: 13px !important;
}

/* Status colors */
[class*="ACTIVE"], [class*="active"] { color: var(--datun-teal) !important; }
[class*="COMPLETED"], [class*="completed"] { color: #10B981 !important; }
[class*="FAILED"], [class*="failed"] { color: #EF4444 !important; }
[class*="WAITING"], [class*="waiting"] { color: #F59E0B !important; }
[class*="DELAYED"], [class*="delayed"] { color: #8B5CF6 !important; }

/* Scrollbar — subtle dark */
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: var(--datun-dark); }
::-webkit-scrollbar-thumb {
  background: var(--datun-border);
  border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover { background: #374151; }

/* Smooth fonts */
* {
  -webkit-font-smoothing: antialiased !important;
  -moz-osx-font-smoothing: grayscale !important;
}
`.trim();

export function mountBullBoard(app: Express): void {
  if (!env.QUEUE_REDIS_URL) {
    logger.info('[Bull-Board] QUEUE_REDIS_URL not set — dashboard disabled');
    return;
  }

  if (!env.BULL_BOARD_PASSWORD) {
    if (env.NODE_ENV === 'production') {
      logger.error('[Bull-Board] BULL_BOARD_PASSWORD missing in production');
      return;
    }
    logger.warn('[Bull-Board] no password set — dashboard accessible in dev only');
  }

  const queues = getAllQueues();
  if (queues.length === 0) {
    logger.warn('[Bull-Board] no queues to display');
    return;
  }

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(DASHBOARD_PATH);

  createBullBoard({
    queues: queues.map((q) => new BullMQAdapter(q)),
    serverAdapter,
    options: {
      uiConfig: {
        boardTitle: 'Datun Queues',
      },
    },
  });

  // CSP relaxed ONLY for dashboard route
  const dashboardCsp = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  });

  const authMiddleware = env.BULL_BOARD_PASSWORD
    ? basicAuth({
        users: { [env.BULL_BOARD_USER]: env.BULL_BOARD_PASSWORD },
        challenge: true,
        realm: 'Datun Queues',
      })
    : (_req: Request, _res: Response, next: NextFunction) => next();

  // Serve custom Datun CSS at predictable path
  app.get(`${DASHBOARD_PATH}/datun-theme.css`, authMiddleware, (_req, res) => {
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(DATUN_DASHBOARD_CSS);
  });

  // CSS injection middleware — appends our stylesheet link to bull-board HTML
  // Pattern: Linear admin tools inject custom branding via response wrapping
  const cssInjector = (_req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send.bind(res);
    res.send = function (body: unknown): Response {
      if (
        typeof body === 'string' &&
        res.getHeader('content-type')?.toString().includes('text/html')
      ) {
        const injection =
          '<link rel="stylesheet" href="' +
          DASHBOARD_PATH +
          '/datun-theme.css">' +
          '<link rel="preconnect" href="https://fonts.googleapis.com">' +
          '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">';
        body = body.replace('</head>', injection + '</head>');
      }
      return originalSend(body);
    };
    next();
  };

  app.use(DASHBOARD_PATH, dashboardCsp, authMiddleware, cssInjector, serverAdapter.getRouter());

  logger.info(`[Bull-Board] dashboard mounted at ${DASHBOARD_PATH}`);
}
