import express from 'express';
import {
  register,
  login,
  getProfile,
  updateProfile,
  verifyToken,
  getAllUsers,
  changePassword,
} from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes (no authentication needed)
router.post('/register', register);
router.post('/login', login);
router.post('/verify', verifyToken);

// Protected routes (authentication required)
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.put('/change-password', authenticateToken, changePassword);

// Admin routes
router.get('/users', authenticateToken, getAllUsers);

export default router;