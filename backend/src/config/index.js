import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Ưu tiên .env ở thư mục backend (cùng cấp src/). Nếu không có (vd: server chạy với CWD = backend/src), load từ CWD
const envPathBackend = path.resolve(__dirname, '../../.env');
const envPathBackendTrue = path.resolve(__dirname, '../../.env.true');
const envPathCwd = path.resolve(process.cwd(), '.env');
let loadedFrom = null;
if (existsSync(envPathBackend)) {
  dotenv.config({ path: envPathBackend });
  loadedFrom = envPathBackend;
} else if (existsSync(envPathBackendTrue)) {
  dotenv.config({ path: envPathBackendTrue });
  loadedFrom = envPathBackendTrue;
} else if (existsSync(envPathCwd)) {
  dotenv.config({ path: envPathCwd });
  loadedFrom = envPathCwd;
} else {
  dotenv.config();
}
// Log để debug khi deploy (biết .env đã load từ đâu hoặc chưa tìm thấy)
if (process.env.NODE_ENV !== 'test') {
  if (loadedFrom) {
    console.log(`📄 .env loaded from: ${loadedFrom}`);
  } else {
    console.warn(`📄 .env: không tìm thấy tại ${envPathBackend}, ${envPathBackendTrue} cũng như ${envPathCwd}. Đặt file .env vào một trong các đường dẫn này.`);
  }
}

export default {
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    name: process.env.DB_NAME || 'job_share_prod',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-here',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  
  // CORS - cho phép localhost, IP nội bộ, và Dev Tunnels (*.asse.devtunnels.ms)
  cors: {
    origin: (() => {
      const envOrigin = process.env.CORS_ORIGIN;
      if (envOrigin) {
        return envOrigin.includes(',') ? envOrigin.split(',').map(s => s.trim()) : envOrigin.trim();
      }
      const isDev = (process.env.NODE_ENV || 'development') === 'development';
      if (isDev) {
        return (origin, callback) => {
          if (!origin) return callback(null, true);
          const localOrLan = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$/;
          const devTunnel = /\.asse\.devtunnels\.ms$/i;
          const allowed = localOrLan.test(origin) || devTunnel.test(origin);
          if (allowed) return callback(null, origin);
          callback(null, false);
        };
      }
      return 'http://localhost:5173';
    })()
  },
  
  // File Upload
  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 41943040, // 40MB
    /** Giới hạn độ dài trường text trong multipart (JSON hồ sơ, hoặc avatarBase64 fallback). Busboy mặc định ~1MB. */
    maxFormFieldSize: parseInt(process.env.MAX_FORM_FIELD_SIZE, 10) || 41943040 // 40MB
  },

  // AWS S3 (file storage: CV, JD, ...)
  aws: {
    s3: {
      bucket: (process.env.AWS_S3_BUCKET || '').trim(),
      region: (process.env.AWS_REGION || 'ap-northeast-1').trim(),
      accessKeyId: (process.env.AWS_ACCESS_KEY_ID || '').trim(),
      secretAccessKey: (process.env.AWS_SECRET_ACCESS_KEY || '').trim(),
      // Prefix trong bucket, ví dụ: "wjs" -> file lưu thành wjs/cvs/xxx.pdf
      keyPrefix: process.env.AWS_S3_KEY_PREFIX ? process.env.AWS_S3_KEY_PREFIX.trim().replace(/\/$/, '') : '',
      // Signed URL hết hạn (giây): view 1h, download 15 phút
      signedUrlExpiresView: parseInt(process.env.AWS_S3_SIGNED_URL_EXPIRES_VIEW) || 3600,
      signedUrlExpiresDownload: parseInt(process.env.AWS_S3_SIGNED_URL_EXPIRES_DOWNLOAD) || 900
    }
  },
  
  // Email
  email: {
    // MAIL_* ưu tiên cho cấu hình mới; EMAIL_* giữ tương thích ngược
    mailer: process.env.MAIL_MAILER || process.env.EMAIL_MAILER || process.env.EMAIL_SERVICE || 'gmail',
    from: process.env.MAIL_FROM_ADDRESS || process.env.EMAIL_FROM || 'kietvu389@gmail.com',
    fromName: process.env.MAIL_FROM_NAME || process.env.EMAIL_FROM_NAME || 'JobShare System',
    user: process.env.MAIL_USERNAME || process.env.EMAIL_USER || 'kietvu389@gmail.com',
    password: process.env.MAIL_PASSWORD || process.env.EMAIL_PASSWORD || process.env.EMAIL_APP_PASSWORD,
    service: process.env.EMAIL_SERVICE || 'gmail', // legacy SMTP service
    host: process.env.MAIL_HOST || '',
    port: parseInt(process.env.MAIL_PORT || '587', 10),
    secure: String(process.env.MAIL_ENCRYPTION || '').toLowerCase() === 'ssl',
    encryption: process.env.MAIL_ENCRYPTION || 'tls',
    microsoftTenantId: process.env.MICROSOFT_TENANT_ID || 'common',
    microsoftClientId: process.env.MICROSOFT_CLIENT_ID || '',
    microsoftClientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    microsoftMailFrom: process.env.MICROSOFT_MAIL_FROM || process.env.MAIL_FROM_ADDRESS || process.env.EMAIL_FROM || ''
  },

  /** Email nhận thông báo khi có đơn tiến cử mới (phân tách bằng dấu phẩy; ghi đè bằng NOMINATION_NEW_ADMIN_EMAILS) */
  nominationNewAdminEmails: (() => {
    const raw = process.env.NOMINATION_NEW_ADMIN_EMAILS || [
      'hung.nguyen@work-station.vn',
      'linh.bui@work-station.vn',
      'huyen.vu@work-station.vn',
      'anh.tran@work-station.vn',
      'tung.nguyen@work-station.vn',
      'tuanvukiet04@gmail.com'
    ].join(',');
    return raw
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  })()
};

