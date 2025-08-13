import { Request, Response } from 'express';

export async function handleCalendarProxy(req: Request, res: Response) {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    console.log('Proxying calendar request to:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CostumeRent-Calendar-Proxy/1.0',
        'Accept': 'text/calendar, text/plain, */*',
      },
    });

    if (!response.ok) {
      console.error(`Calendar proxy error: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ 
        error: `Calendar fetch failed: ${response.status} ${response.statusText}` 
      });
    }

    const calendarData = await response.text();
    
    // Set appropriate headers for calendar data
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(calendarData);
  } catch (error) {
    console.error('Error proxying calendar request:', error);
    res.status(500).json({ 
      error: 'Failed to fetch calendar data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
