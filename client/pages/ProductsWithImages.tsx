import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { 
  fetchProductsWithImages, 
  getProductImages, 
  transformProduct,
  type BooqableResponse,
  type BooqableProduct 
} from '@/lib/booqable-api';

export default function ProductsWithImages() {
  const [data, setData] = useState<BooqableResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchProducts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchProductsWithImages({ 
        page: 1, 
        per_page: 10 
      });
      
      setData(result);
      console.log('Fetched data:', result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Products with Images API Test</h1>
        <Button 
          onClick={handleFetchProducts} 
          disabled={loading}
          className="flex items-center gap-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Fetch Products
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              API Response Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Products:</span> {data.products?.length || 0}
              </div>
              <div>
                <span className="font-medium">Included Items:</span> {data.included?.length || 0}
              </div>
              <div>
                <span className="font-medium">Images:</span> {
                  data.included?.filter(item => item.type === 'photos' || item.type === 'images').length || 0
                }
              </div>
            </div>

            {data.meta && (
              <div className="text-sm text-muted-foreground">
                Page {data.meta.current_page} • Total: {data.meta.total_count}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {data?.products && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Products</h2>
          <div className="grid gap-4">
            {data.products.map((product) => {
              const images = getProductImages(product, data.included || []);
              const transformed = transformProduct(product, data.included || []);
              
              return (
                <Card key={product.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        {images[0] !== '/placeholder.svg' ? (
                          <img 
                            src={images[0]} 
                            alt={product.name}
                            className="w-20 h-20 object-cover rounded"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder.svg';
                            }}
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <h3 className="font-semibold">{product.name}</h3>
                          {product.base_price_in_cents && (
                            <span className="text-lg font-bold">
                              £{(product.base_price_in_cents / 100).toFixed(2)}
                            </span>
                          )}
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          ID: {product.id} • SKU: {product.sku || 'N/A'}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <span>Images found: {images.length}</span>
                          {images.length > 1 && (
                            <span className="text-blue-600">+{images.length - 1} more</span>
                          )}
                        </div>
                        
                        {images.length > 0 && (
                          <details className="text-sm">
                            <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                              View image URLs
                            </summary>
                            <div className="mt-2 space-y-1 pl-4">
                              {images.map((url, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <span>{index + 1}.</span>
                                  <a 
                                    href={url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 break-all flex items-center gap-1"
                                  >
                                    {url.length > 80 ? `${url.substring(0, 80)}...` : url}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {data?.included && data.included.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Raw Included Data (Images)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto max-h-96">
              {JSON.stringify(
                data.included.filter(item => item.type === 'photos' || item.type === 'images'),
                null, 
                2
              )}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
