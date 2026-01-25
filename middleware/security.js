const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Read allowed origins from env (comma-separated) and normalize to an array.
// Provide a safe default for production deployments where env vars may be missing.
const defaultAllowedOrigins = ['https://ebooks-sigma.vercel.app'];

const rawOrigins = process.env.CORS_ALLOWED_ORIGINS || process.env.CLIENT_ORIGIN || '';
const allowedOriginsFromEnv = rawOrigins
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOrigins = allowedOriginsFromEnv.length > 0 ? allowedOriginsFromEnv : defaultAllowedOrigins;

const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// In development allow all origins to simplify local testing
const corsOptions = isDev
  ? { origin: true, credentials: true }
  : {
      // Use function form so Access-Control-Allow-Origin echoes back the actual origin
      origin: function (origin, callback) {
        // Allow non-browser requests like curl/postman (no origin)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
          return callback(null, true);
        }
        // Don't throw an error here — return false so cors middleware handles it cleanly.
        console.warn(`CORS: blocked origin ${origin}`);
        return callback(null, false);
      },
      credentials: true, // Allow httpOnly cookies to be sent
    };

const securityMiddleware = (app) => {
  app.use(helmet());

  // Cross-Origin Resource Sharing using CLIENT_ORIGIN
  console.log('Security middleware: NODE_ENV=', process.env.NODE_ENV, ' allowedOrigins=', allowedOrigins);
  app.use(cors(corsOptions));

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(apiLimiter);
};

module.exports = securityMiddleware;
