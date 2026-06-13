import { Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../config/database';
import { AuthRequest } from '../middleware/authMiddleware';

// Helper function to safely get string from params
const getParamString = (param: string | string[] | undefined): string | undefined => {
  if (Array.isArray(param)) {
    return param[0];
  }
  return param;
};

// Create driver account (Admin only)
export const createDriver = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { email, password, name, phone } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      });
    }

    const existingUser = await db.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const driver = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone: phone || null,
        role: 'DRIVER',
        isActive: true
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Driver account created successfully',
      data: driver
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error creating driver account'
    });
  }
};

// Get all drivers (Admin only)
export const getAllDrivers = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const drivers = await db.user.findMany({
      where: { role: 'DRIVER' },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      message: 'Drivers retrieved successfully',
      data: drivers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching drivers'
    });
  }
};

// Get all customers (Admin only)
export const getAllCustomers = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const customers = await db.user.findMany({
      where: { role: 'CUSTOMER' },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      message: 'Customers retrieved successfully',
      data: customers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customers'
    });
  }
};

// Update driver status (activate/deactivate)
export const updateDriverStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const driverIdParam = req.params.driverId;
    const driverId = getParamString(driverIdParam);

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: 'Driver ID is required'
      });
    }

    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean'
      });
    }

    const driverExists = await db.user.findFirst({
      where: {
        id: driverId,
        role: 'DRIVER'
      }
    });

    if (!driverExists) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    const driver = await db.user.update({
      where: { id: driverId },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true
      }
    });

    res.json({
      success: true,
      message: `Driver ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: driver
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error updating driver status'
    });
  }
};

// Delete user (Admin only)
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const userIdParam = req.params.userId;
    const userId = getParamString(userIdParam);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    if (userId === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const userExists = await db.user.findUnique({
      where: { id: userId }
    });

    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = await db.user.delete({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    res.json({
      success: true,
      message: 'User deleted successfully',
      data: user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user'
    });
  }
};

// Get dashboard stats (Admin only)
export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const [
      totalUsers,
      totalDrivers,
      totalCustomers,
      totalShipments,
      pendingShipments,
      inTransitShipments,
      deliveredShipments,
      totalRevenue
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { role: 'DRIVER' } }),
      db.user.count({ where: { role: 'CUSTOMER' } }),
      db.track.count(),
      db.track.count({ where: { status: 'PENDING' } }),
      db.track.count({ where: { status: 'IN_TRANSIT' } }),
      db.track.count({ where: { status: 'DELIVERED' } }),
      db.track.aggregate({ _sum: { price: true } })
    ]);

    const recentShipments = await db.track.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { name: true } },  
        driver: { select: { name: true } }
      }
    });

    res.json({
      success: true,
      message: 'Dashboard stats retrieved',
      data: {
        users: {
          total: totalUsers,
          drivers: totalDrivers,
          customers: totalCustomers
        },
        shipments: {
          total: totalShipments,
          pending: pendingShipments,
          inTransit: inTransitShipments,
          delivered: deliveredShipments
        },
        revenue: totalRevenue._sum.price || 0,
        recentShipments: recentShipments.map(s => ({
          ...s,
          customer: s.sender  
        }))
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard stats'
    });
  }
};