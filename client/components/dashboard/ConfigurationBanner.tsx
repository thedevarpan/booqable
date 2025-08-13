import React, { useState } from 'react';
import { AlertTriangle, Settings, X, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';

interface ConfigurationBannerProps {
  showDemoWarning?: boolean;
}

export default function ConfigurationBanner({ showDemoWarning = true }: ConfigurationBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  
  // Check if we're in demo mode
  const apiKey = import.meta.env.VITE_BOOQABLE_API_KEY;
  const companySlug = import.meta.env.VITE_BOOQABLE_COMPANY_SLUG;
  const isConfigured = apiKey && companySlug && apiKey !== 'demo_mode' && companySlug !== 'demo_company';
  
  if (!showDemoWarning || isConfigured || isDismissed) {
    return null;
  }

  return (
    <Alert className="mb-6 border-amber-200 bg-amber-50">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1 mr-4">
          <strong className="text-amber-800">Demo Mode Active</strong>
          <p className="text-amber-700 text-sm mt-1">
            You're currently viewing demo data. To connect your real Booqable account, configure your API credentials in the environment variables.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('https://help.booqable.com/en/articles/4325485-how-to-create-an-api-key', '_blank')}
            className="text-amber-800 border-amber-300 hover:bg-amber-100"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Setup Guide
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDismissed(true)}
            className="text-amber-600 hover:bg-amber-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

// Hook to check configuration status
export function useBookableConfig() {
  const apiKey = import.meta.env.VITE_BOOQABLE_API_KEY;
  const companySlug = import.meta.env.VITE_BOOQABLE_COMPANY_SLUG;
  
  return {
    isConfigured: apiKey && companySlug && apiKey !== 'demo_mode' && companySlug !== 'demo_company',
    isDemoMode: !apiKey || !companySlug || apiKey === 'demo_mode' || companySlug === 'demo_company',
    hasCredentials: !!(apiKey && companySlug)
  };
}
