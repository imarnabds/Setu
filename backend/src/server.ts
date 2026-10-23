import http from 'http';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';

import { config } from './config/index.js';
import { connectDatabase, isDatabaseConnected } from './config/database.js';
import { socketService } from './services/socketService.js';
import { ensureAdminAndKycData } from './services/adminSeed.js';
import { upstoxIpoService } from './services/upstoxIpoService.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import pokeRoutes from './routes/pokeRoutes.js';
import connectionRoutes from './routes/connectionRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import commissionRoutes from './routes/commissionRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import ipoRoutes from './routes/ipoRoutes.js';

const app = express();
const server = http.createServer(app);

// Helper to validate allowed CORS origins
const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return true; // Allow non-browser requests (mobile apps, curl, server-to-server)
  if (config.corsOrigins.includes('*')) return true;
  return config.corsOrigins.some((allowed) => {
    if (allowed === origin) return true;
    try {
      const url = new URL(origin);
      const allowedUrl = new URL(allowed);
      return url.origin === allowedUrl.origin;
    } catch {
      return false;
    }
  });
};

// Initialize Socket.IO with strict CORS allowlist
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        console.warn(`[Socket.IO CORS Blocked] Origin: ${origin}`);
        callback(new Error('Origin not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});
socketService.initialize(io);

// Security & Parsing Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS Blocked] Origin: ${origin}`);
        callback(new Error(`Origin ${origin} not permitted by CORS policy`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes'
  }
});
app.use('/api', limiter);

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: isDatabaseConnected() ? 'healthy' : 'degraded',
    database: isDatabaseConnected() ? 'connected' : 'disconnected',
    app: config.appName,
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: isDatabaseConnected() ? 'healthy' : 'degraded',
    database: isDatabaseConnected() ? 'connected' : 'disconnected',
    app: config.appName,
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/pokes', pokeRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/commission', commissionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ipos', ipoRoutes);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Global Error]', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start Server with strict database prerequisite
const startServer = async () => {
  try {
    console.log(`[Startup] Initializing ${config.appName} Backend in [${config.nodeEnv}] mode...`);

    // 1. Establish and verify MongoDB connection
    await connectDatabase();
    console.log('[Startup] Authoritative MongoDB storage verified.');

    // 2. Ensure specific admin user and verification queue items exist
    await ensureAdminAndKycData();

    // 3. Start background Upstox IPO status synchronization scheduler
    upstoxIpoService.startScheduledSync();

    // 4. Start HTTP & WebSocket server
    server.listen(config.port, () => {
      console.log(`====================================================`);
      console.log(`🚀 ${config.appName} Backend running on port ${config.port}`);
      console.log(`📡 Real-Time Socket.IO initialized`);
      console.log(`🔒 Security, Strict CORS Allowlist & Helmet activated`);
      console.log(`🍃 Database: MongoDB Atlas / Verified Primary Store`);
      console.log(`💼 Commission Engine: 0% to 50% in 2.5% steps active`);
      console.log(`====================================================`);
    });
  } catch (error: any) {
    console.error('[Startup Fatal Error] Database connection failed. Aborting startup:', error.message);
    process.exit(1);
  }
};

startServer();
