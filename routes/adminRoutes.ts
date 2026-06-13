import { Router } from 'express';
import {
  createDriver,
  getAllDrivers,
  getAllCustomers,
  updateDriverStatus,
  deleteUser,
  getDashboardStats
} from '../controllers/adminController';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticateToken, requireAdmin);

// Driver management
router.post('/drivers', createDriver);
router.get('/drivers', getAllDrivers);
router.patch('/drivers/:driverId/status', updateDriverStatus);

// Customer management
router.get('/customers', getAllCustomers);

// User management
router.delete('/users/:userId', deleteUser);

// Dashboard
router.get('/dashboard/stats', getDashboardStats);

export default router;