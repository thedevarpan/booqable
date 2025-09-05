import { RequestHandler } from "express";
import { adminAuth } from "../lib/firebase-admin";

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    email_verified?: boolean;
  };
}

// Middleware to verify Firebase JWT tokens
export const authenticateToken: RequestHandler = async (req: any, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token is required'
      });
    }

    // Verify the Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Add user info to request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      email_verified: decodedToken.email_verified
    };

    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

// Optional authentication - allows both authenticated and anonymous users
export const optionalAuth: RequestHandler = async (req: any, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        req.user = {
          uid: decodedToken.uid,
          email: decodedToken.email,
          email_verified: decodedToken.email_verified
        };
      } catch (error) {
        // Token is invalid, but we allow the request to continue
        console.warn('Invalid token provided, continuing without authentication');
      }
    }

    next();
  } catch (error) {
    // Error in middleware, but still allow request to continue
    console.error('Auth middleware error:', error);
    next();
  }
};
