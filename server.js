const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const securityMiddleware = require('./middleware/security');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { seedAdmin } = require('./controllers/adminController');

dotenv.config();

connectDB().then(() => seedAdmin()).catch(() => {});

const os = require('os');
const app = express();
app.set('trust proxy', 1);

// Global process-level handlers to ensure errors are logged
process.on('unhandledRejection', (reason, p) => {
	console.error('Unhandled Rejection at Promise', p, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
	console.error('Uncaught Exception thrown:', err);
});

// Core middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Security
securityMiddleware(app);

// Routes
const adminRoutes = require('./routes/admin');
const ebookRoutes = require('./routes/ebook');

app.use('/api/admin', adminRoutes);
app.use('/api/ebooks', ebookRoutes);

// Root route: redirect to client or return minimal JSON to avoid 404 on '/'
app.get('/', (req, res) => {
	const client = process.env.CLIENT_ORIGIN || process.env.CLIENT_URL || 'https://ebooks-sigma.vercel.app';
	console.log('Root hit, redirecting or responding with client=', client);
	// If browser expects HTML, redirect to frontend
	if (req.headers.accept && req.headers.accept.includes('text/html')) {
		return res.redirect(client);
	}
	res.json({ status: 'ok', message: 'JohnBooks backend is running', client });
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Error handlers
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
	console.log(`Local: http://localhost:${PORT}`);

	// Print non-internal IPv4 addresses so you can access the server from other devices on the LAN
	const nets = os.networkInterfaces();
	for (const name of Object.keys(nets)) {
		for (const net of nets[name]) {
			if (net.family === 'IPv4' && !net.internal) {
				console.log(`LAN:   http://${net.address}:${PORT}`);
			}
		}
	}
});
