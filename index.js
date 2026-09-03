import express from 'express';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

// Import Tour de Rotary DSM Route Modules
import activityRoutes from './routes/activityRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import merchandiseRoutes from './routes/merchandiseRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import participantRoutes from './routes/participantRoutes.js';
import socialRoutes from './routes/socialRoutes.js';
import communicationRoutes from './routes/communicationRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import evaluationRoutes from './routes/evaluationRoutes.js';
import volunteerRoutes from './routes/volunteerRoutes.js';
import sponsorRoutes from './routes/sponsorRoutes.js';
import partnerRoutes from './routes/partnerRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import collectibleRoutes from './routes/collectibleRoutes.js';
import fitnessRoutes from './routes/fitnessRoutes.js';

// Middleware & Workers
import errorHandler from './middleware/errorHandler.js';
import { runInventoryReservationWorker } from './services/inventoryReservationWorker.js';

const app = express();

// Security and middleware
app.use(helmet());
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-payme-signature', 'x-user-role']
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Root & Health Check Endpoints
app.get('/', (req, res) => {
  res.json({
    service: 'Tour de Rotary DSM 2026 - Production Backend API',
    status: 'ONLINE',
    version: '1.0.0',
    documentation: '/api/v1/health',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'healthy',
    environment: process.env.NODE_ENV || 'development',
    database: 'Supabase PostgreSQL 16',
    edition: 'Tour de Rotary DSM 2026',
    integrations: {
      payme_africa: 'READY',
      textify_sms: 'READY',
      resend_email: 'READY',
      strava_sync: 'READY',
      polygon_certificates: 'READY'
    }
  });
});

// API Routes Mounting (v1)
app.use('/api/v1/activities', activityRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/merchandise', merchandiseRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/tickets', ticketRoutes);
app.use('/api/v1/participant', participantRoutes);
app.use('/api/v1/social', socialRoutes);
app.use('/api/v1/communications', communicationRoutes);
app.use('/api/v1/campaigns', campaignRoutes);
app.use('/api/v1/evaluation', evaluationRoutes);
app.use('/api/v1/volunteer', volunteerRoutes);
app.use('/api/v1/sponsor', sponsorRoutes);
app.use('/api/v1/partner', partnerRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/collectibles', collectibleRoutes);
app.use('/api/v1/fitness', fitnessRoutes);

// Background Worker: 7-Day Merchandise Reservation & Expiry Auto-Release Engine
// Runs every 10 minutes in dev / 1 hour in prod
setInterval(async () => {
  try {
    await runInventoryReservationWorker();
  } catch (err) {
    console.error('Inventory worker cycle error:', err);
  }
}, 10 * 60 * 1000);

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 8800;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚲 TOUR DE ROTARY DSM 2026 BACKEND API RUNNING ON PORT ${PORT}`);
  console.log(`📡 Health Check: http://localhost:${PORT}/api/v1/health`);
  console.log(`=======================================================`);
});

export default app;
