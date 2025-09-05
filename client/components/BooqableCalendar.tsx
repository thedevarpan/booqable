import React, { useEffect } from 'react';

declare global {
  interface Window {
    booqableCalendarScriptLoaded?: boolean;
  }
}

const BooqableCalendar: React.FC<{ productId: string }> = ({ productId }) => {
  useEffect(() => {
    // Only load script if it hasn’t already been added
    if (!window.booqableCalendarScriptLoaded) {
      const script = document.createElement('script');
      script.src = 'https://cdn.booqable.com/widgets/calendar.js';
      script.async = true;
      script.onload = () => {
        window.booqableCalendarScriptLoaded = true;
      };
      document.body.appendChild(script);
    }
  }, []);

  const apiKey = (import.meta.env as any).VITE_BOOQABLE_API_KEY || '';

  return (
    <div
      className="booqable-calendar mt-4"
      data-api-key={apiKey}
      data-product-id={productId}
      data-locale="en"
      aria-hidden={apiKey ? 'false' : 'true'}
    />
  );
};

export default BooqableCalendar;
