import { Request, Response } from 'express';
import { authService } from '../services/authService';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

// Register
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, phone } = req.body;
    const result = await authService.register({ email, password, name, phone });
    res.status(201).json({ success: true, message: 'User registered successfully', data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error registering user';
    res.status(400).json({ success: false, message });
  }
};

// Login
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json({ success: true, message: 'Login successful', data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error logging in';
    res.status(401).json({ success: false, message });
  }
};

// Get profile
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    const user = await authService.getProfile(userId);
    res.json({ success: true, message: 'Profile retrieved successfully', data: user });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error fetching profile';
    res.status(404).json({ success: false, message });
  }
};

// Update profile - ADD THIS
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    const { name, phone } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    
    const updatedUser = await authService.updateProfile(userId, { name, phone });
    res.json({ 
      success: true, 
      message: 'Profile updated successfully', 
      data: updatedUser 
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error updating profile';
    res.status(400).json({ success: false, message });
  }
};

// Verify token
export const verifyToken = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const result = authService.verifyToken(token);
    res.json({ success: true, message: 'Token is valid', data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid token';
    res.status(403).json({ success: false, message });
  }
};

// Get all users (Admin only)
export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const users = await authService.getAllUsers();
    res.json({ success: true, message: 'Users retrieved successfully', data: { users } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error fetching users';
    res.status(500).json({ success: false, message });
  }
};

// Change password
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { currentPassword, newPassword } = req.body;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    const result = await authService.changePassword(userId, currentPassword, newPassword);
    res.json({ success: true, message: 'Password changed successfully', data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error changing password';
    res.status(400).json({ success: false, message });
  }
};