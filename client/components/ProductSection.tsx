import React, { useState, useEffect } from 'react';
import { Heart, ShoppingCart, Star, Calendar, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AuthModal } from './AuthModal';
import { useAuthenticatedAction } from '../hooks/useAuthenticatedAction';
import { useCart } from '../contexts/CartContext';
import { booqableAPI, type Product as BooqableProduct } from '../lib/booqable';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  category: string;
  available: boolean;
  trending?: boolean;
  featured?: boolean;
  tag?: string;
  description?: string;
  stock_quantity: number;
}


interface ProductCardProps {
  product: Product;
  onAddToCart: (productId: string) => void;
  onToggleFavorite: (productId: string) => void;
  isFavorite?: boolean;
}

function ProductCard({ product, onAddToCart, onToggleFavorite, isFavorite = false }: ProductCardProps) {
  return (
    <div className="group relative bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
      {/* Image Container */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.tag && (
            <Badge className="bg-brand-gold text-white font-semibold">
              {product.tag}
            </Badge>
          )}
          {product.originalPrice && (
            <Badge className="bg-red-500 text-white">
              {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
            </Badge>
          )}
        </div>

        {/* Favorite Button */}
        <button
          onClick={() => onToggleFavorite(product.id)}
          className="absolute top-3 right-3 p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors duration-300"
        >
          <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
        </button>

        {/* Quick Add to Cart - Shows on Hover */}
        <div className="absolute inset-x-0 bottom-0 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <Button
            onClick={() => onAddToCart(product.id)}
            className="w-full bg-brand-purple hover:bg-brand-purple-dark text-white rounded-none"
            disabled={!product.available}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {product.available ? 'Add to Cart' : 'Out of Stock'}
          </Button>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4">
        <div className="mb-2">
          <Badge variant="outline" className="text-xs">
            {product.category}
          </Badge>
        </div>
        
        <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-brand-purple transition-colors">
          {product.name}
        </h3>
        
        {/* Rating */}
        <div className="flex items-center gap-1 mb-3">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-3 w-3 ${
                  i < Math.floor(product.rating) 
                    ? 'fill-brand-gold text-brand-gold' 
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {product.rating} ({product.reviewCount})
          </span>
        </div>

        {/* Price */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg font-bold text-brand-purple">
            £{product.price}
          </span>
          {product.originalPrice && (
            <span className="text-sm text-muted-foreground line-through">
              £{product.originalPrice}
            </span>
          )}
          <span className="text-xs text-muted-foreground">/day</span>
        </div>

        {/* Availability */}
        <div className="flex items-center gap-1 text-xs">
          <Calendar className="h-3 w-3" />
          <span className={product.available ? "text-brand-emerald" : "text-red-500"}>
            {product.available ? `In Stock (${product.stock_quantity})` : 'Out of Stock'}
          </span>
        </div>
      </div>
    </div>
  );
}

interface ProductSectionProps {
  sectionType: 'featured' | 'trending';
}

export function ProductSection({ sectionType }: ProductSectionProps) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { executeAction, showAuthModal, authModalMode, closeAuthModal } = useAuthenticatedAction();
  const { addItem } = useCart();

  useEffect(() => {
    loadProducts();
  }, [sectionType]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const booqableProducts = await booqableAPI.getProducts();

      // Convert Booqable products to our Product interface
      const convertedProducts: Product[] = booqableProducts.map((product, index) => {
        // Simulate ratings and reviews for now
        const rating = 4.2 + Math.random() * 0.8; // Random rating between 4.2-5.0
        const reviewCount = Math.floor(Math.random() * 200) + 10; // Random reviews 10-210

        // Determine if featured/trending based on index and section type
        const isFeatured = sectionType === 'featured' && index < 8;
        const isTrending = sectionType === 'trending' && index >= 4 && index < 12;

        // Add tags based on price or other criteria
        let tag: string | undefined;
        if (product.price_per_day > 1000) tag = 'Premium';
        else if (product.price_per_day < 500) tag = 'Budget Friendly';
        else if (index % 3 === 0) tag = 'Popular';

        return {
          id: product.id,
          name: product.name,
          image: product.images[0] || 'https://images.unsplash.com/photo-1583196344000-916dd2b51a79?w=400&h=500&fit=crop',
          price: product.price_per_day,
          originalPrice: product.price_per_day > 500 ? product.price_per_day * 1.25 : undefined, // Simulate discount
          rating: Math.round(rating * 10) / 10,
          reviewCount,
          category: product.category,
          available: product.available,
          stock_quantity: product.stock_quantity,
          description: product.description,
          featured: isFeatured,
          trending: isTrending,
          tag
        };
      });

      // Filter products based on section type
      const filteredProducts = sectionType === 'featured'
        ? convertedProducts.filter((_, index) => index < 8) // First 8 for featured
        : convertedProducts.filter((_, index) => index >= 4 && index < 12); // Next 8 for trending

      setProducts(filteredProducts);
      console.log(`Loaded ${filteredProducts.length} ${sectionType} products from Booqable`);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products from Booqable');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (productId: string) => {
    executeAction(() => {
      // User is authenticated, add to cart
      const product = products.find(p => p.id === productId);
      if (product) {
        // Create default rental dates (3 days from today)
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 1); // Tomorrow
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 4); // 4 days from today

        const cartItem = {
          id: product.id,
          name: product.name,
          image: product.image,
          price: product.price,
          originalPrice: product.originalPrice,
          category: product.category,
          rentalDates: {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            days: 3
          }
        };

        addItem(cartItem);
        toast.success(`Added ${product.name} to cart!`);
      }
    }, 'login');
  };

  const handleToggleFavorite = (productId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(productId)) {
        newFavorites.delete(productId);
      } else {
        newFavorites.add(productId);
      }
      return newFavorites;
    });
  };

  const sectionTitle = sectionType === 'featured' ? 'Featured Costumes' : 'Trending Now';
  const sectionDescription = sectionType === 'featured' 
    ? 'Handpicked premium costumes for your special occasions'
    : 'Most popular costumes rented by our customers';

  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {sectionTitle}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {sectionDescription}
          </p>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="mx-auto h-12 w-12 text-muted-foreground animate-spin mb-4" />
            <p className="text-muted-foreground">Loading {sectionType} products from Booqable...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No {sectionType} products found.</p>
            <button onClick={loadProducts} className="text-brand-purple hover:underline">Try again</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
                onToggleFavorite={handleToggleFavorite}
                isFavorite={favorites.has(product.id)}
              />
            ))}
          </div>
        )}

        {/* View More Button */}
        <div className="text-center mt-12">
          <Button
            variant="outline"
            size="lg"
            className="border-brand-purple text-brand-purple hover:bg-brand-purple hover:text-white"
          >
            View All {sectionTitle}
          </Button>
        </div>
      </div>

      {/* Auth Modal for Add to Cart */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={closeAuthModal}
        defaultMode={authModalMode}
      />
    </section>
  );
}
