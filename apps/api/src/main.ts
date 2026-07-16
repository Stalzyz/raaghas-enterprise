import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { Prisma } from '@raaghas/database';

// ─── Global Serialization Patch (500% Sure) ──────────────────────────────────
// Prisma 7 Decimal and BigInt are not JSON-serializable by default.
// This patch ensures all API responses are consistent and front-end friendly.
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
(Prisma.Decimal.prototype as any).toJSON = function () {
  return this.toString();
};
// ─────────────────────────────────────────────────────────────────────────────

// ─── Bulletproof .env Loader ─────────────────────────────────────────────────
// __dirname of dist/src/main.js resolves to apps/api/dist/src/
// Going up two levels (../../) lands at apps/api/ — where .env lives.
// This is immune to process.cwd() being the monorepo root when launched by PM2.
function loadEnvFile(filename: string) {
  // Primary: resolve relative to compiled file location (correct in production)
  const paths = [
    resolve(__dirname, '../..', filename),          // apps/api/.env (via dist/src)
    resolve(__dirname, '../../..', 'apps/api', filename), // fallback: monorepo root → apps/api/.env
    resolve(process.cwd(), 'apps/api', filename),   // fallback: cwd/apps/api/.env
    resolve(process.cwd(), filename),               // last resort: cwd/.env
    resolve(process.cwd(), '../shared/.env'),       // VPS shared env
    resolve(process.cwd(), '../../shared/.env'),
  ];
  for (const envPath of paths) {
    if (existsSync(envPath)) {
      try {
        const lines = readFileSync(envPath, 'utf8').split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIndex = trimmed.indexOf('=');
          if (eqIndex === -1) continue;
          const key = trimmed.slice(0, eqIndex).trim();
          const val = trimmed.slice(eqIndex + 1).trim();
          if (!process.env[key]) process.env[key] = val;
        }
        console.log(`[env] Loaded: ${envPath}`);
        return true;
      } catch { /* skip unreadable file */ }
    }
  }
  return false;
}

// Always load base .env first, then let production overrides win
loadEnvFile('.env');
if (process.env.NODE_ENV === 'production') {
  loadEnvFile('.env.production');
}
// ─────────────────────────────────────────────────────────────────────────────

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
const cookieParser = require('cookie-parser');
const express = require('express');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // 0. Security: Request body size limit (prevent memory DoS attacks)
  // Increased to 50mb to allow large CMS page saves with extensive content
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  
  // 1. MUST BE FIRST: Enable Dynamic CORS
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or SSR fetch)
      if (!origin) {
        return callback(null, true);
      }
      
      const allowedRegex = /^https?:\/\/(?:[a-zA-Z0-9-]+\.)*raaghas\.in$/;
      const isLocalhost = /^http:\/\/localhost:\d+$/.test(origin);

      if (allowedRegex.test(origin) || isLocalhost) {
        callback(null, true);
      } else {
        console.error(`🚨 [CORS] FATAL: Blocked unauthorized request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
    exposedHeaders: ['Content-Disposition'], // Required for browser PDF downloads
  });

  // 2. Register Cookie Parser
  app.use(cookieParser());
  
  // 3. Register Global Filter
  app.useGlobalFilters(new GlobalExceptionFilter());
  
  // Re-enabled global validation now that dependencies are restored
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: false,
  }));
  
  // Versioning and Prefixing
  app.setGlobalPrefix('api/v1');
  
  const port = process.env.PORT || 6005;
  
  const startApp = async (retry = true) => {
    try {
      console.log(`🚀 Raaghas API attempting to bind to port ${port}...`);
      await app.listen(port);
      console.log(`✅ Raaghas API is fully operational on: http://localhost:${port}/api/v1`);
    } catch (err: any) {
      if (retry && err.code === 'EADDRINUSE') {
        console.warn(`⚠️  Port ${port} is occupied. Attempting self-healing...`);
        const { execSync } = require('child_process');
        try {
          execSync(`fuser -k ${port}/tcp`);
          console.log(`🧹 Zombie process on port ${port} terminated. Retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return startApp(false);
        } catch (e) {
          console.error(`❌ Self-healing failed: ${e}`);
        }
      }
      console.error(`❌ CRITICAL: Failed to bind to port ${port}.`, err);
      process.exit(1);
    }
  };

  await startApp();
}

bootstrap().catch(err => {
  console.error('❌ FATAL BOOTSTRAP ERROR:', err);
  process.exit(1);
});
