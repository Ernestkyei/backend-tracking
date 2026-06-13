import db from '../config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
if (!JWT_EXPIRES_IN) throw new Error('JWT_EXPIRES_IN is not defined');

export const authService = {
  // Register new user
  async register(data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
  }) {
    const existingUser = await db.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await db.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        phone: data.phone,
        role: 'CUSTOMER'
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN as any }
    );

    return { user, token };
  },

  // Login user
  async login(email: string, password: string) {
    const user = await db.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN as any }
    );

    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  },

  // Get user profile - FIXED: removed customerTracks, using correct relation names
  async getProfile(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // Use correct relation names from your schema
        sentShipments: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            trackingNumber: true,
            status: true,
            pickupAddress: true,
            deliveryAddress: true,
            createdAt: true
          }
        },
        driverShipments: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            trackingNumber: true,
            status: true,
            pickupAddress: true,
            deliveryAddress: true,
            createdAt: true
          }
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  },

  // Update user profile
  async updateProfile(userId: string, data: { name: string; phone?: string }) {
    const user = await db.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        phone: data.phone || null,
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  },

  // Get all users (Admin only)
  async getAllUsers() {
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return users;
  },

  // Change password
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await db.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    return { message: 'Password updated successfully' };
  },

  // Verify token
  verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return { valid: true, decoded };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      throw new Error('Invalid token');
    }
  }
};