const mongoose = require('mongoose');

// Enable mongoose debug logging when MONGO_DEBUG=true or when not in production
const enableDebug = process.env.MONGO_DEBUG === 'true' || process.env.NODE_ENV !== 'production';

if (enableDebug) {
  mongoose.set('debug', function (coll, method, query, doc, options) {
    try {
      const q = typeof query === 'object' ? JSON.stringify(query) : String(query);
      const d = doc ? `, doc=${JSON.stringify(doc)}` : '';
      console.log(`[MongoDB] ${coll}.${method} ${q}${d}`);
    } catch (e) {
      console.log('[MongoDB] debug', coll, method, query, doc);
    }
  });
}

mongoose.connection.on('error', (err) => console.error('MongoDB connection error:', err));
mongoose.connection.on('connected', () => console.log('MongoDB event: connected'));
mongoose.connection.on('disconnected', () => console.log('MongoDB event: disconnected'));

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
