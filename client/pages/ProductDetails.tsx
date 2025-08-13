import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Heart,
  Share2,
  Star,
  ShoppingCart,
  Truck,
  Shield,
  RotateCcw,
  Plus,
  Minus,
  RefreshCw,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  Calendar
} from 'lucide-react';
import { booqableAPI, type Product } from '../lib/booqable';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { useCart } from '../contexts/CartContext';
import { AvailabilityChecker } from '../components/AvailabilityChecker';

// Enhanced Product interface for UI display
interface UIProduct extends Product {
  rating: number;
  reviews: number;
  isFavorite: boolean;
  isNew: boolean;
  onSale: boolean;
  originalPrice?: number;
}

export function ProductDetails() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<UIProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<UIProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);
  const [rentalAvailability, setRentalAvailability] = useState<{
    available: boolean;
    startDate: string;
    endDate: string;
    totalDays: number;
    totalPrice: number;
  } | null>(null);

  const { addToCart } = useCart();

  useEffect(() => {
    if (productId) {
      loadProduct();
    }
  }, [productId]);

  const loadProduct = async () => {
    if (!productId) return;

    try {
      setLoading(true);
      console.log('Loading product details for ID:', productId);

      // Fetch the specific product
      const productData = await booqableAPI.getProduct(productId);
      
      if (!productData) {
        toast.error('Product not found');
        navigate('/products');
        return;
      }

      // Enhance product with UI-specific properties
      const enhancedProduct: UIProduct = {
        ...productData,
        rating: Math.random() * 2 + 3, // Random rating between 3-5
        reviews: Math.floor(Math.random() * 50) + 5, // Random reviews 5-55
        isFavorite: false,
        isNew: Math.random() > 0.8, // 20% chance of being new
        onSale: Math.random() > 0.9, // 10% chance of being on sale
        originalPrice: Math.random() > 0.9 ? productData.price_per_day * 1.2 : undefined,
      };

      setProduct(enhancedProduct);

      // Load related products from the same category
      if (enhancedProduct.product_group_id) {
        try {
          const allProducts = await booqableAPI.getProducts();
          const related = allProducts
            .filter(p => p.product_group_id === enhancedProduct.product_group_id && p.id !== productId)
            .slice(0, 4)
            .map(p => ({
              ...p,
              rating: Math.random() * 2 + 3,
              reviews: Math.floor(Math.random() * 50) + 5,
              isFavorite: false,
              isNew: Math.random() > 0.8,
              onSale: Math.random() > 0.9,
              originalPrice: Math.random() > 0.9 ? p.price_per_day * 1.2 : undefined,
            })) as UIProduct[];
          
          setRelatedProducts(related);
        } catch (error) {
          console.error('Error loading related products:', error);
        }
      }

      console.log('Successfully loaded product:', enhancedProduct);
    } catch (error) {
      console.error('Error loading product:', error);
      toast.error('Failed to load product details');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product || !rentalAvailability) return;

    // Store rental info in localStorage and show success message
    const rentalInfo = {
      productId: product.id,
      productName: product.name,
      quantity: quantity,
      pricePerDay: product.price_per_day,
      totalDays: rentalAvailability.totalDays,
      totalPrice: rentalAvailability.totalPrice * quantity,
      startDate: rentalAvailability.startDate,
      endDate: rentalAvailability.endDate,
      image: product.images[0] || 'https://images.unsplash.com/photo-1583196344000-916dd2b51a79?w=400&h=500&fit=crop',
    };

    // Store in localStorage for now
    const existingCart = JSON.parse(localStorage.getItem('rentalCart') || '[]');
    existingCart.push(rentalInfo);
    localStorage.setItem('rentalCart', JSON.stringify(existingCart));

    toast.success(
      `${product.name} added to cart!\n` +
      `${quantity} unit${quantity > 1 ? 's' : ''} for ${rentalAvailability.totalDays} day${rentalAvailability.totalDays !== 1 ? 's' : ''}\n` +
      `Total: £${rentalAvailability.totalPrice * quantity}`
    );
  };

  const handleShare = async () => {
    if (navigator.share && product) {
      try {
        await navigator.share({
          title: product.name,
          text: product.description,
          url: window.location.href,
        });
      } catch (error) {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.href);
        toast.success('Product link copied to clipboard!');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Product link copied to clipboard!');
    }
  };

  const nextImage = () => {
    if (product && product.images.length > 1) {
      setSelectedImageIndex((prev) => (prev + 1) % product.images.length);
    }
  };

  const prevImage = () => {
    if (product && product.images.length > 1) {
      setSelectedImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto h-12 w-12 text-purple-600 animate-spin mb-4" />
          <p className="text-muted-foreground">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Product not found</p>
          <Button asChild>
            <Link to="/products">Back to Products</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center space-x-2 text-sm">
            <Link to="/" className="text-muted-foreground hover:text-purple-600">
              Home
            </Link>
            <span className="text-muted-foreground">/</span>
            <Link to="/products" className="text-muted-foreground hover:text-purple-600">
              Products
            </Link>
            <span className="text-muted-foreground">/</span>
            <Link to={`/products?collection=${product.category.toLowerCase()}`} className="text-muted-foreground hover:text-purple-600">
              {product.category}
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground font-medium">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="aspect-square relative bg-white rounded-xl overflow-hidden border">
              {product.images.length > 0 ? (
                <>
                  <img
                    src={product.images[selectedImageIndex]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onLoad={() => setImageLoading(false)}
                    onError={() => setImageLoading(false)}
                  />
                  {imageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                      <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Image Navigation */}
                  {product.images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </>
                  )}

                  {/* Image Indicator */}
                  {product.images.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                      {product.images.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImageIndex(index)}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            index === selectedImageIndex ? 'bg-white' : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Thumbnail Images */}
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.slice(0, 4).map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`aspect-square bg-white rounded-lg overflow-hidden border-2 transition-colors ${
                      index === selectedImageIndex ? 'border-purple-500' : 'border-gray-200'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Badges */}
            <div className="flex gap-2">
              <Badge variant="secondary">{product.category}</Badge>
              {product.isNew && <Badge className="bg-green-500">New</Badge>}
              {product.onSale && <Badge className="bg-red-500">Sale</Badge>}
            </div>

            {/* Title */}
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{product.name}</h1>
              <p className="text-muted-foreground">{product.short_description}</p>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.floor(product.rating)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {product.rating.toFixed(1)} ({product.reviews} reviews)
              </span>
            </div>

            {/* Price */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                {product.onSale && product.originalPrice ? (
                  <>
                    <span className="text-3xl font-bold text-purple-600">
                      £{product.price_per_day}
                    </span>
                    <span className="text-xl text-muted-foreground line-through">
                      £{product.originalPrice}
                    </span>
                    <Badge className="bg-red-500 text-white">
                      {Math.round(((product.originalPrice - product.price_per_day) / product.originalPrice) * 100)}% OFF
                    </Badge>
                  </>
                ) : (
                  <span className="text-3xl font-bold text-purple-600">
                    £{product.price_per_day}
                  </span>
                )}
                <span className="text-muted-foreground">/day</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Inclusive of all taxes • Free delivery on orders above £999
              </p>
            </div>

            {/* Availability Checker */}
            <div className="mb-6">
              <AvailabilityChecker
                productId={product.id}
                productName={product.name}
                pricePerDay={product.price_per_day}
                onAvailabilityConfirmed={setRentalAvailability}
              />
            </div>

            {/* Availability Display */}
            {rentalAvailability && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  <span className="font-medium">Rental Summary</span>
                </div>
                <div className="text-sm space-y-1">
                  <p>
                    <strong>Period:</strong> {new Date(rentalAvailability.startDate).toLocaleDateString()} - {new Date(rentalAvailability.endDate).toLocaleDateString()}
                  </p>
                  <p>
                    <strong>Duration:</strong> {rentalAvailability.totalDays} day{rentalAvailability.totalDays !== 1 ? 's' : ''}
                  </p>
                  <p className="text-purple-600 font-medium">
                    <strong>Total Cost:</strong> £{rentalAvailability.totalPrice * quantity}
                    <span className="text-muted-foreground text-xs ml-1">
                      (£{product.price_per_day}/day × {rentalAvailability.totalDays} days × {quantity} qty)
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            {rentalAvailability && rentalAvailability.available && (
              <div className="flex items-center gap-4">
                <span className="font-medium">Quantity:</span>
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="p-2 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="px-4 py-2 min-w-[3rem] text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                    disabled={quantity >= product.stock_quantity}
                    className="p-2 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <span className="text-sm text-muted-foreground">
                  In Stock: {product.stock_quantity}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleAddToCart}
                disabled={!rentalAvailability || !rentalAvailability.available}
                className="w-full h-12"
                size="lg"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                {!rentalAvailability
                  ? 'Check Availability First'
                  : rentalAvailability.available
                    ? `Add to Cart - £${rentalAvailability.totalPrice * quantity}`
                    : 'Not Available for Selected Dates'
                }
              </Button>
              
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setProduct({...product, isFavorite: !product.isFavorite})}>
                  <Heart className={`h-4 w-4 mr-2 ${product.isFavorite ? 'fill-current text-red-500' : ''}`} />
                  {product.isFavorite ? 'Added to Wishlist' : 'Add to Wishlist'}
                </Button>
                <Button variant="outline" onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 py-6 border-t border-gray-200">
              <div className="text-center">
                <Truck className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                <p className="text-sm font-medium">Free Delivery</p>
                <p className="text-xs text-muted-foreground">On orders above £999</p>
              </div>
              <div className="text-center">
                <Shield className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                <p className="text-sm font-medium">Quality Guarantee</p>
                <p className="text-xs text-muted-foreground">Premium costumes</p>
              </div>
              <div className="text-center">
                <RotateCcw className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                <p className="text-sm font-medium">Easy Returns</p>
                <p className="text-xs text-muted-foreground">24-hour return policy</p>
              </div>
            </div>
          </div>
        </div>

        {/* Product Description */}
        <div className="mt-12">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4">Product Description</h2>
              <div className="prose max-w-none">
                <p className="text-muted-foreground leading-relaxed">
                  {product.description || product.short_description || 'No description available for this product.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Related Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <Card key={relatedProduct.id} className="group overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    <Link to={`/product/${relatedProduct.id}`}>
                      <div className="aspect-square relative overflow-hidden">
                        <img
                          src={relatedProduct.images[0] || 'https://images.unsplash.com/photo-1583196344000-916dd2b51a79?w=400&h=500&fit=crop'}
                          alt={relatedProduct.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          {relatedProduct.isNew && (
                            <Badge className="bg-green-500 text-white text-xs">New</Badge>
                          )}
                          {relatedProduct.onSale && (
                            <Badge className="bg-red-500 text-white text-xs">Sale</Badge>
                          )}
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold mb-2 line-clamp-2">{relatedProduct.name}</h3>
                        <div className="flex items-center gap-1 mb-2">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${
                                i < Math.floor(relatedProduct.rating)
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({relatedProduct.reviews})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-purple-600">£{relatedProduct.price_per_day}</span>
                          <span className="text-sm text-muted-foreground">/day</span>
                        </div>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
