# Booqable Integration Setup

This document provides instructions for setting up the Booqable API integration with your costume rental application.

## Prerequisites

1. A Booqable account with API access
2. Your company slug and API key from Booqable

## Setup Instructions

### 1. Create Booqable API Key

1. Log in to your Booqable account
2. Click on your avatar in the lower-left corner and select "User settings"
3. Scroll down to the "Authentication Methods" section
4. Click "New Authentication Method"
5. Provide a name (e.g., "React Dashboard App")
6. Save and copy the generated API key

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update your `.env` file with your Booqable credentials:
   ```env
   VITE_BOOQABLE_API_KEY=your_booqable_api_key_here
   VITE_BOOQABLE_COMPANY_SLUG=your_company_slug_here
   ```

   Replace:
   - `your_booqable_api_key_here` with the API key from step 1
   - `your_company_slug_here` with your company's slug (from your Booqable subdomain)

### 3. Restart Development Server

After updating the environment variables, restart your development server:

```bash
npm run dev
```

## Features Integrated

The following dashboard components now use dynamic data from Booqable:

### ✅ Account Portal
- **Booking History**: Fetches real booking data from Booqable orders endpoint
- **Booking Statistics**: Calculates real metrics (total bookings, active rentals, total spent, upcoming bookings)
- **Invoice Downloads**: Uses real invoice URLs from Booqable
- **Refresh Functionality**: Manual data refresh with loading states

### ✅ Booking Management  
- **Modifiable Bookings**: Fetches bookings that can be modified/cancelled
- **Real-time Modifications**: Calls Booqable API to update booking details
- **Cancellation Processing**: Handles booking cancellations through Booqable
- **Refund Calculations**: Dynamic refund calculations based on cancellation policies

### ✅ Quick Rebooking
- **Previous Orders**: Shows completed/returned orders for rebooking
- **Product Availability**: Checks real product availability from Booqable
- **Cart Integration**: Adds rebooking items to cart with current pricing

### ✅ Wishlist & Favorites
- **Product Data**: Fetches product information from Booqable catalog
- **Availability Status**: Real-time availability checking
- **Dynamic Pricing**: Current pricing from Booqable pricing engine

### ✅ Payments Dashboard
- **Payment History**: Converts Booqable order data to payment records
- **Outstanding Balances**: Calculates unpaid amounts from booking data  
- **Transaction Details**: Shows real transaction information

## API Endpoints Used

The integration uses the following Booqable API endpoints:

- `GET /orders` - Fetch customer orders/bookings
- `GET /customers/{id}` - Get customer information
- `GET /products` - Fetch available products
- `PUT /orders/{id}` - Modify existing bookings
- `DELETE /orders/{id}` - Cancel bookings

## Error Handling

If API credentials are not configured or API calls fail:

1. **Graceful Fallback**: Components will fall back to mock data
2. **Error Messages**: Users see friendly error messages with retry options
3. **Loading States**: Proper loading indicators during API calls
4. **Retry Functionality**: Manual refresh buttons to retry failed API calls

## Security Considerations

- API keys are stored as environment variables (never committed to git)
- All API calls include proper error handling
- Sensitive operations (payments, cancellations) include user confirmation
- Client-side API calls are for display purposes only

## Testing

To test the integration:

1. **Without API**: Leave environment variables empty to test with mock data
2. **With API**: Configure real credentials to test with live Booqable data
3. **Error States**: Temporarily use invalid credentials to test error handling

## Next Steps

For production deployment:

1. Set environment variables in your hosting platform
2. Consider implementing server-side API proxy for additional security
3. Add proper error monitoring and logging
4. Implement caching for frequently accessed data

## Support

For Booqable API documentation and support:
- [Booqable API Docs](https://developers.booqable.com/)
- [Booqable Help Center](https://help.booqable.com/)

For application-specific issues, check the console logs and network tab for detailed error information.
