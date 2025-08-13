import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from './AuthModal';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ 
  children, 
  requireAuth = true, 
  fallback 
}: ProtectedRouteProps) {
  const { currentUser, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (!loading && requireAuth && !currentUser) {
      setShowAuthModal(true);
    }
  }, [currentUser, loading, requireAuth]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-purple mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If authentication is required but user is not logged in
  if (requireAuth && !currentUser) {
    return (
      <>
        {fallback || (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center max-w-md mx-auto px-4">
              <div className="w-16 h-16 bg-brand-purple-light rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🔒</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-4">
                Authentication Required
              </h1>
              <p className="text-muted-foreground mb-6">
                Please sign in to access this page and enjoy all the features of CostumeRent.
              </p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-brand-purple hover:bg-brand-purple-dark text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Sign In to Continue
              </button>
            </div>
          </div>
        )}
        
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          defaultMode="login"
        />
      </>
    );
  }

  // If user is authenticated or authentication is not required
  return <>{children}</>;
}
