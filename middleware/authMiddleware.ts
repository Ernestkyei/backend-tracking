import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
// Fail loudly at startup if secret is missing
if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined');

// Shape of the data stored inside the JWT token
interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

// Extends Express Request to include decoded user after authentication
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  // Extract token from "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  try {
    // Cast to unknown first, then to JwtPayload (TypeScript safe pattern)
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as JwtPayload;
    req.user = decoded; // attach user to request for downstream middleware
    next();
  } catch (error) {
    // Handle expired tokens separately for a clearer error message
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(403).json({ success: false, message: 'Invalid token' });
  }
};

// Must be used AFTER authenticateToken
export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};