import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import http from 'node:http';
import { fileURLToPath } from 'url';
import config from './config/index.js';
import { sequelize } from './models/index.js';
import { getStoredHtml } from './services/cvPdfService.js';
import { startCvVectorSyncRunner } from './services/cvVectorSyncService.js';
import { initRealtimeHub } from './services/realtimeHub.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Cho phép origin từ Dev Tunnels (dùng khi chạy qua tunnel HTTPS)
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://73mlvrh5-5173.asse.devtunnels.ms'
];
if (process.env.CORS_ORIGIN) {
  process.env.CORS_ORIGIN.split(',').forEach(o => {
    const t = o.trim();
    if (t && !ALLOWED_ORIGINS.includes(t)) ALLOWED_ORIGINS.push(t);
  });
}

/** Production: HTTPS *.ws-jobshare.com (admin subdomain calling API on ws-jobshare.com) */
function isJobshareHttpsOrigin(origin) {
  try {
    const u = new URL(origin);
    if (u.protocol !== 'https:') return false;
    const h = u.hostname.toLowerCase();
    return h === 'ws-jobshare.com' || h.endsWith('.ws-jobshare.com');
  } catch {
    return false;
  }
}

function isCorsOriginAllowed(origin) {
  if (!origin || typeof origin !== 'string') return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (/\.asse\.devtunnels\.ms$/i.test(origin)) return true;
  if (isJobshareHttpsOrigin(origin)) return true;
  if (process.env.NODE_ENV !== 'production' && /^https?:\/\//.test(origin)) return true;
  return false;
}


// Middleware CORS thủ công chạy đầu tiên: trả header cho mọi request và xử lý OPTIONS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allow = isCorsOriginAllowed(origin);
  if (allow) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (isCorsOriginAllowed(origin)) return callback(null, true);
    if (typeof config.cors.origin === 'function') {
      return config.cors.origin(origin, callback);
    }
    if (Array.isArray(config.cors.origin)) {
      return callback(null, config.cors.origin.includes(origin));
    }
    if (typeof config.cors.origin === 'string') {
      return callback(null, origin === config.cors.origin);
    }
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
  preflightContinue: false
}));
const defaultDirectives = helmet.contentSecurityPolicy.getDefaultDirectives();
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      ...defaultDirectives,
      "frame-ancestors": [
        "'self'",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://73mlvrh5-5173.asse.devtunnels.ms",
        'https://ws-jobshare.com',
        'https://admin.ws-jobshare.com',
        ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean) : [])
      ],
      // Cho phép trang /cv-pdf-render tải font từ Google (PDF CV không bị ô vuông)
      "style-src": [...(defaultDirectives["style-src"] || ["'self'"]), "https://fonts.googleapis.com"],
      "font-src": [...(defaultDirectives["font-src"] || ["'self'"]), "https://fonts.gstatic.com"]
    }
  }
}));
app.use(morgan('dev'));
// Giới hạn 40MB cho payload lớn (upload CV, ảnh). Nginx phía trước cần client_max_body_size >= 40m.
app.use(express.json({ limit: '40mb' }));
app.use(express.urlencoded({ extended: true, limit: '40mb' }));

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res, filePath) => {
    // Set proper headers for PDF files
    if (filePath.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
    }
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// CV PDF render: trả HTML tạm để Puppeteer load (có origin thật → font Google Fonts tải được)
app.get('/cv-pdf-render/:id', (req, res) => {
  const html = getStoredHtml(req.params.id);
  if (!html) return res.status(404).end();
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// API Routes
import adminRoutes from './routes/adminRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import collaboratorRoutes from './routes/collaboratorRoutes.js';
import collaboratorAssignmentRoutes from './routes/collaboratorAssignmentRoutes.js';
import cvRoutes from './routes/cvRoutes.js';
import cvStorageRoutes from './routes/cvStorageRoutes.js';
import jobCategoryRoutes from './routes/jobCategoryRoutes.js';
import jobPickupRoutes from './routes/jobPickupRoutes.js';
import companyRoutes from './routes/companyRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import typeRoutes from './routes/typeRoutes.js';
import valueRoutes from './routes/valueRoutes.js';
import jobApplicationRoutes from './routes/jobApplicationRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import postRoutes from './routes/postRoutes.js';
import calendarRoutes from './routes/calendarRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import emailToCompanyRoutes from './routes/emailToCompanyRoutes.js';
import emailToCollaboratorRoutes from './routes/emailToCollaboratorRoutes.js';
import emailToGroupRoutes from './routes/emailToGroupRoutes.js';
import paymentRequestRoutes from './routes/paymentRequestRoutes.js';
import ctvAuthRoutes from './routes/ctvAuthRoutes.js';
import ctvCvRoutes from './routes/ctvCvRoutes.js';
import ctvJobApplicationRoutes from './routes/ctvJobApplicationRoutes.js';
import ctvJobRoutes from './routes/ctvJobRoutes.js';
import ctvSearchHistoryRoutes from './routes/ctvSearchHistoryRoutes.js';
import ctvSavedSearchCriteriaRoutes from './routes/ctvSavedSearchCriteriaRoutes.js';
import ctvSavedListRoutes from './routes/ctvSavedListRoutes.js';
import ctvPaymentRequestRoutes from './routes/ctvPaymentRequestRoutes.js';
import ctvDashboardRoutes from './routes/ctvDashboardRoutes.js';
import ctvCampaignRoutes from './routes/ctvCampaignRoutes.js';
import ctvPostRoutes from './routes/ctvPostRoutes.js';
import ctvJobPickupRoutes from './routes/ctvJobPickupRoutes.js';
import ctvScheduleRoutes from './routes/ctvScheduleRoutes.js';
import ctvJobCategoryRoutes from './routes/ctvJobCategoryRoutes.js';
import ctvMessageRoutes from './routes/ctvMessageRoutes.js';
import ctvNotificationRoutes from './routes/ctvNotificationRoutes.js';
import adminNotificationRoutes from './routes/adminNotificationRoutes.js';
import ctvEventRoutes from './routes/ctvEventRoutes.js';
import publicPostRoutes from './routes/publicPostRoutes.js';
import publicPostCategoryRoutes from './routes/publicPostCategoryRoutes.js';
import publicEventRoutes from './routes/publicEventRoutes.js';
import reportsRoutes from './routes/reportsRoutes.js';
import oauthRoutes from './routes/oauthRoutes.js';
import adminOutlookRoutes from './routes/adminOutlookRoutes.js';
import cvAutoParseRoutes from './routes/cvAutoParseRoutes.js';
import applicantAuthRoutes from './routes/applicantAuthRoutes.js';
import applicantCvRoutes from './routes/applicantCvRoutes.js';
import applicantJobRoutes from './routes/applicantJobRoutes.js';
import applicantJobApplicationRoutes from './routes/applicantJobApplicationRoutes.js';
import applicantMessageRoutes from './routes/applicantMessageRoutes.js';
import publicCtvChatRoutes from './routes/publicCtvChatRoutes.js';
import adminPublicCtvChatRoutes from './routes/adminPublicCtvChatRoutes.js';
import publicCandidateChatRoutes from './routes/publicCandidateChatRoutes.js';
import adminPublicCandidateChatRoutes from './routes/adminPublicCandidateChatRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import translationRoutes from './routes/translationRoutes.js';

// Admin routes
app.use('/api/admin', adminRoutes);
app.use('/api/admin/reports', reportsRoutes);
app.use('/api/admin/groups', groupRoutes);
app.use('/api/admin/collaborators', collaboratorRoutes);
app.use('/api/admin/collaborator-assignments', collaboratorAssignmentRoutes);
app.use('/api/admin/cvs', cvRoutes);
app.use('/api/admin/cv-storages', cvStorageRoutes);
app.use('/api/admin/job-categories', jobCategoryRoutes);
app.use('/api/admin/job-pickups', jobPickupRoutes);
app.use('/api/admin/companies', companyRoutes);
app.use('/api/admin/jobs', jobRoutes);
app.use('/api/admin/types', typeRoutes);
app.use('/api/admin/values', valueRoutes);
app.use('/api/admin/job-applications', jobApplicationRoutes);
app.use('/api/admin/campaigns', campaignRoutes);
app.use('/api/admin/events', eventRoutes);
app.use('/api/admin/categories', categoryRoutes);
app.use('/api/admin/posts', postRoutes);
app.use('/api/admin/calendars', calendarRoutes);
app.use('/api/admin/messages', messageRoutes);
app.use('/api/admin/emails/companies', emailToCompanyRoutes);
app.use('/api/admin/emails/collaborators', emailToCollaboratorRoutes);
app.use('/api/admin/emails/groups', emailToGroupRoutes);
app.use('/api/admin/payment-requests', paymentRequestRoutes);
app.use('/api/admin/outlook', adminOutlookRoutes);
app.use('/api/admin/cv-auto-parse', cvAutoParseRoutes);
app.use('/api/admin/notifications', adminNotificationRoutes);
app.use('/api/admin/public-ctv-chat', adminPublicCtvChatRoutes);
app.use('/api/admin/public-candidate-chat', adminPublicCandidateChatRoutes);

// OAuth (Outlook connect/callback)
app.use('/api/oauth', oauthRoutes);

// CTV routes
app.use('/api/ctv/auth', ctvAuthRoutes);
app.use('/api/ctv/cvs', ctvCvRoutes);
app.use('/api/ctv/job-applications', ctvJobApplicationRoutes);
app.use('/api/ctv/jobs', ctvJobRoutes);
app.use('/api/ctv/search-history', ctvSearchHistoryRoutes);
app.use('/api/ctv/saved-search-criteria', ctvSavedSearchCriteriaRoutes);
app.use('/api/ctv/saved-lists', ctvSavedListRoutes);
app.use('/api/ctv/payment-requests', ctvPaymentRequestRoutes);
app.use('/api/ctv/dashboard', ctvDashboardRoutes);
app.use('/api/ctv/campaigns', ctvCampaignRoutes);
app.use('/api/ctv/posts', ctvPostRoutes);
app.use('/api/ctv/job-pickups', ctvJobPickupRoutes);
app.use('/api/ctv/calendars', ctvScheduleRoutes);
app.use('/api/ctv/job-categories', ctvJobCategoryRoutes);
app.use('/api/ctv/messages', ctvMessageRoutes);
app.use('/api/ctv/notifications', ctvNotificationRoutes);
app.use('/api/ctv/events', ctvEventRoutes);

// Public routes (no auth)
app.use('/api/public/posts', publicPostRoutes);
app.use('/api/public/post-categories', publicPostCategoryRoutes);
app.use('/api/public/events', publicEventRoutes);
app.use('/api/applicant/auth', applicantAuthRoutes);
app.use('/api/applicant/cvs', applicantCvRoutes);
app.use('/api/applicant/jobs', applicantJobRoutes);
app.use('/api/applicant/job-applications', applicantJobApplicationRoutes);
app.use('/api/applicant/messages', applicantMessageRoutes);
app.use('/api/public/ctv-chat', publicCtvChatRoutes);
app.use('/api/public/candidate-chat', publicCandidateChatRoutes);

/** Redirect sang presigned S3 — dùng cho img src khi DB lưu object key */
app.use('/api/media', mediaRoutes);
app.use('/api_jobshare/media', mediaRoutes);
app.use('/api/translate', translationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
import { errorHandler } from './middleware/errorHandler.js';
app.use(errorHandler);

// Database connection and server start
const PORT = config.port;

async function startServer() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Sync database (use with caution in production)
    // await sequelize.sync({ alter: true });
    // console.log('✅ Database synchronized.');

    // Start payment scheduler
    import('./utils/paymentScheduler.js').then(({ startPaymentScheduler }) => {
      startPaymentScheduler();
    }).catch(err => {
      console.error('❌ Error starting payment scheduler:', err);
    });

    import('./utils/cvOverdueScheduler.js').then(({ startCvOverdueScheduler }) => {
      startCvOverdueScheduler();
    }).catch((err) => {
      console.error('Error starting CV overdue scheduler:', err);
    });

    startCvVectorSyncRunner();

    // Start server
    const server = http.createServer(app);
    initRealtimeHub(server, config.cors || {});

    server.listen(PORT, async () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📝 Environment: ${config.nodeEnv}`);
      console.log(`📂 CWD (thư mục chạy, nơi dotenv tìm .env): ${process.cwd()}`);
      const corsDesc = typeof config.cors.origin === 'function' ? 'localhost + LAN IP (dynamic)' : (Array.isArray(config.cors.origin) ? config.cors.origin.join(', ') : config.cors.origin);
      console.log(`🌐 CORS enabled for: ${corsDesc}`);
      const { s3Enabled } = await import('./services/s3Service.js');
      const s3On = s3Enabled();
      console.log(`📦 S3 storage: ${s3On ? 'enabled' : 'disabled (file CV lưu local uploads/cvs/)'}`);
      if (!s3On && (config.aws?.s3)) {
        const { bucket, accessKeyId, secretAccessKey } = config.aws.s3;
        const missing = [(!bucket && 'AWS_S3_BUCKET'), (!accessKeyId && 'AWS_ACCESS_KEY_ID'), (!secretAccessKey && 'AWS_SECRET_ACCESS_KEY')].filter(Boolean);
        if (missing.length) console.log(`   Thiếu hoặc rỗng trong .env: ${missing.join(', ')}. Đặt .env trong thư mục backend (cùng cấp src/) hoặc trong CWD (xem 📂 trên).`);
      }
    });
  } catch (error) {
    console.error('❌ Unable to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await sequelize.close();
  process.exit(0);
});

export default app;

