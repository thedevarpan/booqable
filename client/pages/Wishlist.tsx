import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Eye, Trash2, Star, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

interface WishlistItem {
  id: string;
  name: string;
  price_per_day: number;
  images: string[];
  category: string;
}

interface WishlistResponse {
  items: WishlistItem[];
  count: number;
}

export default function Wishlist() {
  const { currentUser } = useAuth();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());

  // Fetch wishlist from API
  const fetchWishlist = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setError(null);
      
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/user/wishlist', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: { success: boolean; data: WishlistResponse; error?: string } = await response.json();
      
      if (data.success) {
        setWishlistItems(data.data.items);
      } else {
        throw new Error(data.error || 'Failed to fetch wishlist');
      }
    } catch (err) {
      console.error('Error fetching wishlist:', err);
      setError(err instanceof Error ? err.message : 'Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  };

  // Remove item from wishlist
  const removeFromWishlist = async (productId: string) => {
    if (!currentUser) return;

    try {
      setRemovingItems(prev => new Set(prev).add(productId));
      
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/user/wishlist/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Remove item from local state
        setWishlistItems(prev => prev.filter(item => item.id !== productId));
        
        toast({
          title: "Removed from wishlist",
          description: "Item has been removed from your wishlist.",
        });
      } else {
        throw new Error(data.error || 'Failed to remove from wishlist');
      }
    } catch (err) {
      console.error('Error removing from wishlist:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to remove from wishlist',
        variant: "destructive",
      });
    } finally {
      setRemovingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  // Add to cart (placeholder function)
  const addToCart = (productId: string) => {
    // This would normally add the item to a cart context/state
    toast({
      title: "Added to cart",
      description: "Item has been added to your cart.",
    });
  };

  useEffect(() => {
    fetchWishlist();
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Please log in to view your wishlist</h1>
        <Button asChild>
          <Link to="/login">Login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Wishlist</h1>
            <p className="text-lg text-muted-foreground">
              Your saved costume favorites ({wishlistItems.length} items)
            </p>
          </div>
          <Button onClick={fetchWishlist} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-4"
              onClick={fetchWishlist}
            >
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-luxury-purple-600 mr-2" />
          <span className="text-lg text-muted-foreground">Loading wishlist...</span>
        </div>
      ) : wishlistItems.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12">
          <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Your wishlist is empty</h3>
          <p className="text-muted-foreground mb-6">
            Start adding costumes you love to keep track of them for later!
          </p>
          <Button asChild>
            <Link to="/products">Browse Costumes</Link>
          </Button>
        </div>
      ) : (
        /* Wishlist Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wishlistItems.map((item) => (
            <Card key={item.id} className="group overflow-hidden">
              <CardContent className="p-0">
                {/* Product Image */}
                <div className="relative aspect-[3/4] overflow-hidden">
                  <img
                    src={item.images?.[0] || '/placeholder.svg'}
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/placeholder.svg';
                    }}
                  />
                  
                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                    <Button size="sm" asChild>
                      <Link to={`/costume/${item.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Link>
                    </Button>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => addToCart(item.id)}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Rent
                    </Button>
                  </div>

                  {/* Remove Button */}
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute top-2 right-2 h-8 w-8 p-0"
                    onClick={() => removeFromWishlist(item.id)}
                    disabled={removingItems.has(item.id)}
                  >
                    {removingItems.has(item.id) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <div className="mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {item.category}
                    </Badge>
                  </div>
                  
                  <h3 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-luxury-purple-600 transition-colors">
                    {item.name}
                  </h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold text-luxury-purple-600">
                      £{item.price_per_day.toFixed(2)}/day
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs text-muted-foreground">4.5</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 space-y-2">
                    <Button 
                      className="w-full bg-luxury-purple-600 hover:bg-luxury-purple-700"
                      onClick={() => addToCart(item.id)}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <Link to={`/costume/${item.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Link>
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-red-600 hover:text-red-700"
                        onClick={() => removeFromWishlist(item.id)}
                        disabled={removingItems.has(item.id)}
                      >
                        {removingItems.has(item.id) ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Heart className="h-4 w-4 mr-2" />
                        )}
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      {wishlistItems.length > 0 && (
        <div className="mt-8 p-6 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Wishlist Summary</h3>
              <p className="text-muted-foreground">
                {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'} saved
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">Total value (per day)</p>
              <p className="text-2xl font-bold text-luxury-purple-600">
                £{wishlistItems.reduce((sum, item) => sum + item.price_per_day, 0).toFixed(2)}
              </p>
            </div>
          </div>
          
          <div className="mt-4 flex gap-4">
            <Button className="flex-1 bg-luxury-purple-600 hover:bg-luxury-purple-700">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add All to Cart
            </Button>
            <Button variant="outline" asChild>
              <Link to="/products">Continue Shopping</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
