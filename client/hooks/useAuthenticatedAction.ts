import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useAuthenticatedAction() {
  const { currentUser } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  const executeAction = (action: () => void, mode: 'login' | 'signup' = 'login') => {
    if (currentUser) {
      // User is authenticated, execute the action
      action();
    } else {
      // User is not authenticated, show auth modal
      setAuthModalMode(mode);
      setShowAuthModal(true);
    }
  };

  const closeAuthModal = () => {
    setShowAuthModal(false);
  };

  return {
    executeAction,
    showAuthModal,
    authModalMode,
    closeAuthModal,
    isAuthenticated: !!currentUser,
  };
}
