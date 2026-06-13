import express from 'express';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes';
import trackingRoutes from './routes/trackingRoutes';
import adminRoutes from './routes/adminRoutes';
import cors from 'cors';  

const app = express();

//CORS middleware
app.use(cors({
  origin: 'http://localhost:5173', 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Tracking System API',
    version: '1.0.0',
    status: 'API is running!',
    endpoints: {
      auth: '/api/auth',
      tracking: '/api/tracking',
      admin: '/api/admin'
    }
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.url}`
  });
});

export { app };