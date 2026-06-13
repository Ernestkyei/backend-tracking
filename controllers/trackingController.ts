import { Request, Response } from 'express';
import db from '../config/database';
import { 
  createShipment as createShipmentService,
  getShipmentByTrackingNumber,
  getCustomerShipments,
  getDriverShipments,
  updateShipmentStatus as updateShipmentStatusService,
  assignDriverToShipment,
  getAllShipments as getAllShipmentsService,
  scanQRCode as scanQRCodeService
} from '../services/trackingService';
import { AuthRequest } from '../middleware/authMiddleware';

// Create new shipment - UPDATED with new sender/recipient fields
export const createShipment = async (req: AuthRequest, res: Response) => {
  try {
    const {
      // New sender fields (priority)
      senderName,
      senderEmail,
      senderPhone,
      // New recipient fields
      recipientName,
      recipientPhone,
      recipientEmail,
      // Legacy fields (for backward compatibility)
      customerName,
      customerEmail,
      customerPhone,
      // Package fields
      pickupAddress,
      deliveryAddress,
      description,
      weight,
      price,
      expectedDelivery
    } = req.body;

    const customerId = req.user?.userId;

    // Use new fields first, fallback to legacy
    const finalSenderName = senderName || customerName;
    const finalSenderEmail = senderEmail || customerEmail;
    const finalSenderPhone = senderPhone || customerPhone;
    const finalRecipientName = recipientName;
    const finalRecipientPhone = recipientPhone;

    // Validate required fields
    if (!finalSenderName) {
      return res.status(400).json({
        success: false,
        message: 'Sender name is required'
      });
    }

    if (!pickupAddress || !deliveryAddress) {
      return res.status(400).json({
        success: false,
        message: 'Pickup address and delivery address are required'
      });
    }

    const shipment = await createShipmentService({
      // New sender fields
      senderName: finalSenderName,
      senderEmail: finalSenderEmail,
      senderPhone: finalSenderPhone,
      // New recipient fields
      recipientName: finalRecipientName,
      recipientPhone: finalRecipientPhone,
      recipientEmail: recipientEmail,
      // Legacy fields (for backward compatibility)
      customerName: finalSenderName,
      customerEmail: finalSenderEmail,
      customerPhone: finalSenderPhone,
      // Package fields
      pickupAddress,
      deliveryAddress,
      description,
      weight: weight ? parseFloat(weight) : undefined,
      price: price ? parseFloat(price) : undefined,
      expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : undefined,
      customerId
    });

    res.status(201).json({
      success: true,
      message: 'Shipment created successfully',
      data: shipment
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error creating shipment';
    console.error('Create shipment error:', error);
    res.status(500).json({
      success: false,
      message
    });
  }
};

// Track shipment by number - FIXED
export const trackShipment = async (req: Request, res: Response) => {
  try {
    const { trackingNumber } = req.params;
    const trackingNumberStr = Array.isArray(trackingNumber) ? trackingNumber[0] : trackingNumber;
    
    const shipment = await getShipmentByTrackingNumber(trackingNumberStr);
    
    // Transform to frontend expected format
    const formattedShipment = {
      id: shipment.id,
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      currentLocation: shipment.currentLocation,
      pickupAddress: shipment.pickupAddress,
      deliveryAddress: shipment.deliveryAddress,
      expectedDelivery: shipment.expectedDelivery,
      actualDelivery: shipment.actualDelivery,
      createdAt: shipment.createdAt,
      packageType: shipment.packageType || 'OTHER',
      weight: shipment.weight || 0,
      description: shipment.description || '',
      // Sender info - use new fields first
      senderName: shipment.senderName || shipment.customerName,
      senderEmail: shipment.senderEmail || shipment.customerEmail,
      senderPhone: shipment.senderPhone || shipment.customerPhone,
      // Recipient info
      recipientName: shipment.recipientName,
      recipientPhone: shipment.recipientPhone,
      // Fix: Ensure locationUpdates is always an array from the service
      locationUpdates: (shipment as any).locationUpdates || [],
    };
    
    res.json({
      success: true,
      message: 'Shipment retrieved successfully',
      data: formattedShipment
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error finding shipment';
    res.status(404).json({
      success: false,
      message
    });
  }
};

// Get my shipments
export const getMyShipments = async (req: AuthRequest, res: Response) => {
  try {
    const customerId = req.user?.userId;
    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    const shipments = await getCustomerShipments(customerId);
    
    // Transform shipments to frontend expected format
    const formattedShipments = shipments.map(shipment => ({
      id: shipment.id,
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      currentLocation: shipment.currentLocation,
      pickupAddress: shipment.pickupAddress,
      deliveryAddress: shipment.deliveryAddress,
      expectedDelivery: shipment.expectedDelivery,
      createdAt: shipment.createdAt,
      packageType: shipment.packageType || 'OTHER',
      weight: shipment.weight || 0,
      description: shipment.description || '',
      senderName: shipment.senderName || shipment.customerName,
      recipientName: shipment.recipientName,
      recipientPhone: shipment.recipientPhone,
    }));
    
    res.json({
      success: true,
      message: 'Your shipments retrieved',
      data: formattedShipments
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error fetching shipments';
    res.status(500).json({
      success: false,
      message
    });
  }
};

// Get driver shipments
export const getDriverShipmentsController = async (req: AuthRequest, res: Response) => {
  try {
    const driverId = req.user?.userId;
    if (!driverId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    const shipments = await getDriverShipments(driverId);
    res.json({
      success: true,
      message: 'Your assigned shipments',
      data: shipments
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error fetching shipments';
    res.status(500).json({
      success: false,
      message
    });
  }
};

// Update shipment status
export const updateShipmentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { trackingNumber } = req.params;
    const { status, location, note } = req.body;
    
    const trackingNumberStr = Array.isArray(trackingNumber) ? trackingNumber[0] : trackingNumber;
    
    const shipment = await updateShipmentStatusService(trackingNumberStr, status, location, note);
    res.json({
      success: true,
      message: 'Shipment status updated',
      data: shipment
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error updating status';
    res.status(500).json({
      success: false,
      message
    });
  }
};

// Assign driver
export const assignDriver = async (req: AuthRequest, res: Response) => {
  try {
    const { trackingNumber } = req.params;
    const { driverId } = req.body;
    
    const trackingNumberStr = Array.isArray(trackingNumber) ? trackingNumber[0] : trackingNumber;
    
    const shipment = await assignDriverToShipment(trackingNumberStr, driverId);
    res.json({
      success: true,
      message: 'Driver assigned successfully',
      data: shipment
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error assigning driver';
    res.status(500).json({
      success: false,
      message
    });
  }
};

// Get all shipments (Admin)
export const getAllShipments = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    const shipments = await getAllShipmentsService();
    
    // Transform shipments to frontend expected format
    const formattedShipments = shipments.map(shipment => ({
      id: shipment.id,
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      currentLocation: shipment.currentLocation,
      pickupAddress: shipment.pickupAddress,
      deliveryAddress: shipment.deliveryAddress,
      expectedDelivery: shipment.expectedDelivery,
      createdAt: shipment.createdAt,
      senderName: shipment.senderName || shipment.customerName,
      recipientName: shipment.recipientName,
      recipientPhone: shipment.recipientPhone,
    }));
    
    res.json({
      success: true,
      message: 'All shipments retrieved',
      data: formattedShipments
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error fetching shipments';
    res.status(500).json({
      success: false,
      message
    });
  }
};

// Customer scans QR code to confirm delivery
export const scanQRCode = async (req: Request, res: Response) => {
  try {
    const { trackingNumber } = req.params;
    const trackingNumberStr = Array.isArray(trackingNumber) ? trackingNumber[0] : trackingNumber;
    
    const scannerInfo = {
      scannerIp: req.ip,
      scannerDevice: req.headers['user-agent'],
      scannerLocation: (req.query.location as string) || 'Unknown'
    };
    
    const shipment = await scanQRCodeService(trackingNumberStr, scannerInfo);
    
    res.json({
      success: true,
      message: 'Package delivery confirmed! Thank you for scanning.',
      data: shipment
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error processing scan';
    res.status(400).json({
      success: false,
      message
    });
  }
};

// Delete shipment - FIXED
export const deleteShipment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const shipmentId = Array.isArray(id) ? id[0] : id;
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    
    // Find the shipment first
    const shipment = await db.track.findUnique({
      where: { id: shipmentId },
      select: { 
        trackingNumber: true,
        customerId: true, 
        senderId: true 
      }
    });
    
    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }
    
    // Check if user owns this shipment or is admin
    const isOwner = shipment.customerId === userId || shipment.senderId === userId;
    const isAdmin = userRole === 'ADMIN';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this shipment'
      });
    }
    
    // Delete associated records first (due to foreign key constraints)
    await db.$transaction([
      db.locationUpdate.deleteMany({ where: { trackingNumber: shipment.trackingNumber } }),
      db.delivery.deleteMany({ where: { trackingNumber: shipment.trackingNumber } }),
      db.qRCode.deleteMany({ where: { trackingNumber: shipment.trackingNumber } }),
      db.qRScan.deleteMany({ where: { trackingNumber: shipment.trackingNumber } }),
      db.track.delete({ where: { id: shipmentId } })
    ]);
    
    res.json({
      success: true,
      message: 'Shipment deleted successfully'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error deleting shipment';
    console.error('Delete shipment error:', error);
    res.status(500).json({
      success: false,
      message
    });
  }
};

// Get shipment by ID (Admin) - FIXED
export const getShipmentById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const shipmentId = Array.isArray(id) ? id[0] : id;
    
    const shipment = await db.track.findUnique({
      where: { id: shipmentId },
      include: {
        sender: {
          select: { id: true, name: true, email: true, phone: true }
        },
        driver: {
          select: { id: true, name: true, email: true, phone: true }
        },
        locationUpdates: {
          orderBy: { timestamp: 'asc' }
        },
        qrCode: true,
        delivery: true
      }
    });
    
    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }
    
    res.json({
      success: true,
      data: shipment
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error fetching shipment';
    res.status(500).json({
      success: false,
      message
    });
  }
};