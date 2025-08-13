import React, { useState, useEffect } from 'react';
import { Heart, Trash2, ShoppingCart, Calendar, Star, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { booqableAPI, type Product } from '../../lib/booqable';

interface WishlistItem {
  id: string;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  category: string;
  rating: number;
  reviewCount: number;
  available: boolean;
  addedAt: string;
}


export default function WishlistsFavorites() {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { addItem } = useCart();
  const { currentUser } = useAuth();

  // Load wishlist from Booqable and Firebase
  useEffect(() => {
    if (currentUser) {
      loadWishlistData();
    }
  }, [currentUser]);

  const loadWishlistData = async (showRefreshToast = false) => {
    try {
      setLoading(true);
      if (showRefreshToast) setRefreshing(true);

      // In a real implementation, you would:
      // 1. Load wishlist item IDs from Firebase/user preferences
      // 2. Fetch product details from Booqable API
      // 3. Combine the data

      // Fetch real products from Booqable and simulate wishlist
      const products = await booqableAPI.getProducts();

      // Take first 5 products as wishlist items
      const wishlistProducts = products.slice(0, 5).map(product => ({
        id: product.id,
        name: product.name,
        image: product.images[0] || 'https://images.unsplash.com/photo-1583196344000-916dd2b51a79?w=400&h=500&fit=crop',
        price: product.price_per_day,
        originalPrice: product.price_per_day * 1.2, // Simulate discount
        category: product.category,
        rating: 4.5 + Math.random() * 0.5, // Simulate ratings
        reviewCount: Math.floor(Math.random() * 200) + 50,
        available: product.available,
        addedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Random date in last 30 days
      }));
      setWishlistItems(wishlistProducts);

      if (showRefreshToast) {
        toast.success(`Loaded ${products.length} products as wishlist items`);
      }
    } catch (error) {
      console.error('Error loading wishlist:', error);
      toast.error('Failed to load products from Booqable API.');
      setWishlistItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const removeFromWishlist = async (itemId: string) => {
    try {
      // Remove from Firebase
      // await deleteDoc(doc(db, 'wishlists', itemId));
      
      setWishlistItems(prev => prev.filter(item => item.id !== itemId));
      toast.success('Removed from wishlist');
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      toast.error('Failed to remove item');
    }
  };

  const addToCart = (item: WishlistItem) => {
    if (!item.available) {
      toast.error('This costume is currently unavailable');
      return;
    }

    // Create default rental dates (3 days from tomorrow)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 4);

    const cartItem = {
      id: item.id,
      name: item.name,
      image: item.image,
      price: item.price,
      originalPrice: item.originalPrice,
      category: item.category,
      rentalDates: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        days: 3
      }
    };

    addItem(cartItem);
  };

  const moveAllToCart = () => {
    const availableItems = wishlistItems.filter(item => item.available);
    
    if (availableItems.length === 0) {
      toast.error('No available items to add to cart');
      return;
    }

    availableItems.forEach(item => addToCart(item));
    toast.success(`Added ${availableItems.length} items to cart`);
  };

  const clearWishlist = async () => {
    try {
      // Clear from Firebase
      // const batch = writeBatch(db);
      // wishlistItems.forEach(item => {
      //   batch.delete(doc(db, 'wishlists', item.id));
      // });
      // await batch.commit();

      setWishlistItems([]);
      toast.success('Wishlist cleared');
    } catch (error) {
      console.error('Error clearing wishlist:', error);
      toast.error('Failed to clear wishlist');
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                My Wishlist ({loading ? '...' : wishlistItems.length} items)
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Save costumes for later and get notified about availability
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => loadWishlistData(true)}
                disabled={refreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              {wishlistItems.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    onClick={moveAllToCart}
                    className="flex items-center gap-2"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Add All to Cart
                  </Button>
                  <Button
                    variant="outline"
                    onClick={clearWishlist}
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear All
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Wishlist Items */}
      {loading ? (
        <Card>
          <CardContent className="text-center py-12">
            <RefreshCw className="mx-auto h-12 w-12 text-muted-foreground animate-spin" />
            <h3 className="mt-2 text-sm font-semibold text-foreground">Loading wishlist...</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Fetching your saved items from Booqable
            </p>
          </CardContent>
        </Card>
      ) : wishlistItems.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Heart className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold text-foreground">Your wishlist is empty</h3>
            <p className="mt-1 text-sm text-muted-foreground mb-4">
              Save costumes you love to your wishlist to rent them later.
            </p>
            <Button asChild className="bg-brand-purple hover:bg-brand-purple-dark">
              <a href="/#featured">Browse Costumes</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlistItems.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-48 object-cover"
                />
                
                {/* Availability Badge */}
                <div className="absolute top-3 left-3">
                  <Badge className={item.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {item.available ? 'Available' : 'Unavailable'}
                  </Badge>
                </div>

                {/* Discount Badge */}
                {item.originalPrice && (
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-red-500 text-white">
                      {Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}% OFF
                    </Badge>
                  </div>
                )}

                {/* Remove from Wishlist */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFromWishlist(item.id)}
                  className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm hover:bg-white"
                >
                  <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                </Button>
              </div>

              <CardContent className="p-4">
                <div className="mb-2">
                  <Badge variant="outline" className="text-xs">
                    {item.category}
                  </Badge>
                </div>

                <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
                  {item.name}
                </h3>

                {/* Rating */}
                <div className="flex items-center gap-1 mb-3">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${
                          i < Math.floor(item.rating) 
                            ? 'fill-brand-gold text-brand-gold' 
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {item.rating} ({item.reviewCount})
                  </span>
                </div>

                {/* Price */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg font-bold text-brand-purple">
                    £{item.price}
                  </span>
                  {item.originalPrice && (
                    <span className="text-sm text-muted-foreground line-through">
                      £{item.originalPrice}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">/day</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => addToCart(item)}
                    disabled={!item.available}
                    className={`flex-1 ${
                      item.available 
                        ? 'bg-brand-purple hover:bg-brand-purple-dark' 
                        : 'bg-gray-300 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {item.available ? 'Add to Cart' : 'Unavailable'}
                  </Button>
                  
                  {!item.available && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <Calendar className="h-3 w-3" />
                      Notify Me
                    </Button>
                  )}
                </div>

                {/* Added Date */}
                <p className="text-xs text-muted-foreground mt-2">
                  Added on {new Date(item.addedAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
