import { Request, Response } from 'express';

const API_KEY = '4d3436be0a75173dc58c5d412471fb02934b878b283442e99ef0762ec30bdb32';
const COMPANY_SLUG = 'dance-costumes-for-hire-90e5';
const BASE_URL = `https://${COMPANY_SLUG}.booqable.com/api/1`;

export async function handleBookableProxy(req: Request, res: Response) {
  const { endpoint } = req.params;
  const { query } = req;

  if (!API_KEY || !COMPANY_SLUG) {
    return res.status(500).json({ error: 'Booqable API credentials not configured' });
  }

  try {
    // Construct the full URL
    const searchParams = new URLSearchParams();
    searchParams.append('api_key', API_KEY);
    
    // Add any additional query parameters
    Object.entries(query).forEach(([key, value]) => {
      if (typeof value === 'string') {
        searchParams.append(key, value);
      }
    });

    const url = `${BASE_URL}/${endpoint}?${searchParams.toString()}`;
    
    console.log('Proxying request to:', url.replace(API_KEY, '***'));

    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'CostumeRent-App/1.0',
      },
    });

    if (!response.ok) {
      console.error(`Booqable API error: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ 
        error: `Booqable API error: ${response.status} ${response.statusText}` 
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error proxying Booqable request:', error);
    res.status(500).json({ 
      error: 'Failed to fetch from Booqable API',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
