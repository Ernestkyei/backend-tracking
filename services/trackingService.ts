import db from '../config/database';
import { smsService } from './smsService';

// Generate unique tracking number
function generateTrackingNumber(): string {
  const prefix = 'TRK';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

// Generate QR code data
function generateQRCodeData(trackingNumber: string): string {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/api/tracking/scan/${trackingNumber}`;
}

// Create new shipment
export const createShipment = async (data: {
  pickupAddress: string;
  deliveryAddress: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  description?: string;
  weight?: number;
  price?: number;
  expectedDelivery?: Date;
  customerId?: string;
}) => {
  const trackingNumber = generateTrackingNumber();
  const qrCodeText = generateQRCodeData(trackingNumber);

  // ✅ Auto-calculate expected delivery (3 days from now) if not provided
  const expectedDelivery = data.expectedDelivery || (() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d;
  })();
  
  const track = await db.track.create({
    data: {
      trackingNumber,
      status: 'PENDING',
      currentLocation: data.pickupAddress,
      pickupAddress: data.pickupAddress,
      deliveryAddress: data.deliveryAddress,
      senderName: data.senderName,
      senderEmail: data.senderEmail,
      senderPhone: data.senderPhone,
      senderId: data.customerId,
      recipientName: data.recipientName,
      recipientPhone: data.recipientPhone,
      recipientEmail: data.recipientEmail,
      customerName: data.senderName || data.customerName,
      customerEmail: data.senderEmail || data.customerEmail,
      customerPhone: data.senderPhone || data.customerPhone,
      customerId: data.customerId,
      description: data.description,
      weight: data.weight,
      price: data.price,
      expectedDelivery, // ✅ now always has a value
    },
  });
  
  await db.qRCode.create({
    data: {
      trackingNumber,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeText)}`,
      qrCodeText,
      size: 200,
      format: 'png'
    }
  });
  
  if (data.senderPhone) {
    await smsService.sendTrackingNumber(data.senderPhone, trackingNumber);
  } else if (data.customerPhone) {
    await smsService.sendTrackingNumber(data.customerPhone, trackingNumber);
  }
  
  if (data.recipientPhone) {
    await smsService.sendTrackingNumber(data.recipientPhone, trackingNumber);
  }
  
  const trackWithQR = await db.track.findUnique({
    where: { trackingNumber },
    include: {
      qrCode: true
    }
  });
  
  return trackWithQR;
};

// Scan QR code
export const scanQRCode = async (trackingNumber: string, scannerInfo?: {
  scannerIp?: string;
  scannerDevice?: string;
  scannerLocation?: string;
}) => {
  const track = await db.track.findUnique({
    where: { trackingNumber }
  });
  
  if (!track) {
    throw new Error('Tracking number not found');
  }
  
  if (track.status === 'DELIVERED') {
    throw new Error('Package already delivered');
  }
  
  const updatedTrack = await db.track.update({
    where: { trackingNumber },
    data: {
      status: 'DELIVERED',
      actualDelivery: new Date(),
      updatedAt: new Date()
    }
  });
  
  await db.qRScan.create({
    data: {
      trackingNumber,
      scannerIp: scannerInfo?.scannerIp,
      scannerDevice: scannerInfo?.scannerDevice,
      scannerLocation: scannerInfo?.scannerLocation,
      scanStatus: 'success'
    }
  });
  
  await db.qRCode.update({
    where: { trackingNumber },
    data: {
      scanCount: { increment: 1 },
      lastScannedAt: new Date()
    }
  });
  
  const senderPhone = track.senderPhone || track.customerPhone;
  if (senderPhone) {
    await smsService.sendDeliveryConfirmation(senderPhone, trackingNumber);
  }
  if (track.recipientPhone) {
    await smsService.sendDeliveryConfirmation(track.recipientPhone, trackingNumber);
  }
  
  return updatedTrack;
};

// Get QR code
export const getShipmentQRCode = async (trackingNumber: string) => {
  const qrCode = await db.qRCode.findUnique({
    where: { trackingNumber },
    include: {
      track: {
        select: {
          status: true,
          deliveryAddress: true,
          senderName: true,
          customerName: true,
          recipientName: true
        }
      }
    }
  });
  
  if (!qrCode) {
    throw new Error('QR code not found');
  }
  
  return qrCode;
};

// Get shipment by tracking number
export const getShipmentByTrackingNumber = async (trackingNumber: string) => {
  const track = await db.track.findUnique({
    where: { trackingNumber },
    include: {
      locationUpdates: {
        orderBy: { timestamp: 'desc' },
        take: 20
      },
      delivery: true,
      qrCode: true
    }
  });
  
  if (!track) {
    throw new Error('Tracking number not found');
  }
  
  return {
    ...track,
    senderName: track.senderName || track.customerName,
    senderEmail: track.senderEmail || track.customerEmail,
    senderPhone: track.senderPhone || track.customerPhone,
    recipientName: track.recipientName,
    recipientPhone: track.recipientPhone,
  };
};

// Get customer shipments
export const getCustomerShipments = async (customerId: string) => {
  const shipments = await db.track.findMany({
    where: { 
      OR: [
        { senderId: customerId },
        { customerId: customerId }
      ]
    },
    include: {
      locationUpdates: {
        take: 1,
        orderBy: { timestamp: 'desc' }
      },
      qrCode: true
    },
    orderBy: { createdAt: 'desc' }
  });
  
  return shipments.map(shipment => ({
    ...shipment,
    senderName: shipment.senderName || shipment.customerName,
    senderEmail: shipment.senderEmail || shipment.customerEmail,
    senderPhone: shipment.senderPhone || shipment.customerPhone,
  }));
};

// Get driver shipments
export const getDriverShipments = async (driverId: string) => {
  const shipments = await db.track.findMany({
    where: { 
      driverId: driverId,
      status: { not: 'DELIVERED' }
    },
    include: {
      locationUpdates: {
        take: 1,
        orderBy: { timestamp: 'desc' }
      },
      qrCode: true
    },
    orderBy: { createdAt: 'desc' }
  });
  
  return shipments.map(shipment => ({
    ...shipment,
    senderName: shipment.senderName || shipment.customerName,
  }));
};

// Update shipment status
export const updateShipmentStatus = async (trackingNumber: string, status: string, location?: string, note?: string) => {
  const track = await db.track.update({
    where: { trackingNumber },
    data: {
      status: status as any,
      currentLocation: location || undefined,
      updatedAt: new Date()
    }
  });

  if (location) {
    await db.locationUpdate.create({
      data: {
        trackingNumber,
        location,
        status: status as any,
        note
      }
    });
  }

  const senderPhone = track.senderPhone || track.customerPhone;
  if (senderPhone) {
    await smsService.sendStatusUpdate(senderPhone, trackingNumber, status);
  }
  if (track.recipientPhone) {
    await smsService.sendStatusUpdate(track.recipientPhone, trackingNumber, status);
  }

  return track;
};

// Assign driver
export const assignDriverToShipment = async (trackingNumber: string, driverId: string) => {
  const track = await db.track.update({
    where: { trackingNumber },
    data: {
      driverId: driverId,
      status: 'ASSIGNED'
    },
    include: {
      qrCode: true
    }
  });

  return track;
};

// Get all shipments
export const getAllShipments = async () => {
  const shipments = await db.track.findMany({
    include: {
      locationUpdates: {
        take: 1,
        orderBy: { timestamp: 'desc' }
      },
      qrCode: true
    },
    orderBy: { createdAt: 'desc' }
  });
  
  return shipments.map(shipment => ({
    ...shipment,
    senderName: shipment.senderName || shipment.customerName,
    senderEmail: shipment.senderEmail || shipment.customerEmail,
    senderPhone: shipment.senderPhone || shipment.customerPhone,
  }));
};

// Update payment status
export const updatePaymentStatus = async (
  trackingNumber: string,
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED',
  paymentId?: string,
  paymentMethod?: string
) => {
  const track = await db.track.update({
    where: { trackingNumber },
    data: {
      paymentStatus: paymentStatus as any,
      paymentId,
      paymentMethod,
      paidAt: paymentStatus === 'PAID' ? new Date() : null
    }
  });
  
  return track;
};

// Get stats
export const getShipmentStats = async () => {
  const total = await db.track.count();
  const delivered = await db.track.count({ where: { status: 'DELIVERED' } });
  const inTransit = await db.track.count({ where: { status: 'IN_TRANSIT' } });
  const pending = await db.track.count({ where: { status: 'PENDING' } });
  
  return {
    total,
    delivered,
    inTransit,
    pending,
  };
};

// Delete shipment
export const deleteShipment = async (shipmentId: string) => {
  const shipment = await db.track.findUnique({
    where: { id: shipmentId },
    select: { trackingNumber: true }
  });
  
  if (!shipment) {
    throw new Error('Shipment not found');
  }
  
  await db.$transaction([
    db.locationUpdate.deleteMany({ where: { trackingNumber: shipment.trackingNumber } }),
    db.delivery.deleteMany({ where: { trackingNumber: shipment.trackingNumber } }),
    db.qRCode.deleteMany({ where: { trackingNumber: shipment.trackingNumber } }),
    db.qRScan.deleteMany({ where: { trackingNumber: shipment.trackingNumber } }),
    db.track.delete({ where: { id: shipmentId } })
  ]);
  
  return { success: true };
};