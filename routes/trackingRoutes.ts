import { Router } from 'express';
import {
  createShipment,
  trackShipment,
  getMyShipments,
  getDriverShipmentsController,
  updateShipmentStatus,
  assignDriver,
  getAllShipments,
  scanQRCode,
  deleteShipment 
} from '../controllers/trackingController';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// Public routes
router.get('/track/:trackingNumber', trackShipment);
router.get('/scan/:trackingNumber', scanQRCode);

// Customer routes
router.post('/shipments', authenticateToken, createShipment);
router.get('/my-shipments', authenticateToken, getMyShipments);
router.delete('/shipments/:id', authenticateToken, deleteShipment); 

// Driver routes
router.get('/driver-shipments', authenticateToken, getDriverShipmentsController);
router.patch('/shipments/:trackingNumber/status', authenticateToken, updateShipmentStatus);

// Admin routes
router.get('/all-shipments', authenticateToken, requireAdmin, getAllShipments);
router.patch('/shipments/:trackingNumber/assign', authenticateToken, requireAdmin, assignDriver);

export default router;