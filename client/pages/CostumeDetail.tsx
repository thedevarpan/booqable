import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ShoppingCart,
  Heart,
  Share2,
  Star,
  Calendar,
  Package,
  Shield,
  Truck,
  RefreshCw,
  Eye,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { safeFetch } from '@/lib/safeFetch';

interface Product {
  id: string;
  name: string;
  price_per_day: number;
  images: string[];
  category: string;
  collections: Array<{ id: string; name: string; slug: string }>;
  description: string;
  sizes: string[];
  colors: string[];
  rating: number;
  review_count: number;
  is_featured: boolean;
  is_new: boolean;
  attributes: {
    sku: string;
    material: string;
    care: string;
    dimensions: string;
  };
}

export default function CostumeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addItem, state: cartState } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [showDateDialog, setShowDateDialog] = useState(false);
  const [rentFrom, setRentFrom] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0,10);
  });
  const [rentTo, setRentTo] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0,10);
  });

  // Fetch product details
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        const primary = `/api/products/${id}`;
        const functionsEndpoint = `/.netlify/functions/api/products/${id}`;

        let response: Response | null = null;
        let lastError: any = null;

        // Try primary endpoint with retries using safeFetch
        let attempts = 0;
        const maxAttempts = 3;
        while (attempts < maxAttempts) {
          attempts++;
          try {
            response = await safeFetch(primary, {
              cache: 'no-store',
              credentials: 'same-origin',
              headers: { Accept: 'application/json' },
              timeoutMs: 8000,
            } as any);
            if (response && response.ok) break;
            throw new Error(`Primary API responded ${response ? response.status : 'network'}`);
          } catch (innerErr) {
            lastError = innerErr;
            if (attempts >= maxAttempts) {
              console.warn('Primary product fetch failed after retries, trying functions endpoint...', innerErr);
              try {
                response = await safeFetch(functionsEndpoint, {
                  cache: 'no-store',
                  credentials: 'same-origin',
                  headers: { Accept: 'application/json' },
                  timeoutMs: 8000,
                } as any);
                if (!response || !response.ok) throw new Error(`Functions endpoint responded ${response ? response.status : 'network'}`);
              } catch (e2) {
                console.warn('Functions product fetch failed, will try list fallback...', e2);
                lastError = e2;
                response = null;
              }
            } else {
              await new Promise((r) => setTimeout(r, 200 * attempts));
            }
          }
        }

        if (response) {
          const result = await response.json().catch(() => null);
          if (response.ok && result && result.success && result.data) {
            setProduct(result.data);
            setLoading(false);
            return;
          }
          // If response not as expected, continue to fallback
        }

        // Fallback: fetch products list and search locally
        try {
          const listUrls = [`/api/products?per_page=100`, `/.netlify/functions/api/products?per_page=100`];

          for (const listUrl of listUrls) {
            try {
              const listResp = await safeFetch(listUrl, {
                cache: 'no-store',
                credentials: 'same-origin',
                headers: { Accept: 'application/json' },
                timeoutMs: 8000,
              } as any);
              if (!listResp || !listResp.ok) continue;
              const listResult = await listResp.json().catch(() => null);
              const productsList = listResult.data?.products || listResult.data || [];
              const found = Array.isArray(productsList) ? productsList.find((p: any) => p.id === id) : null;
              if (found) {
                setProduct(found);
                setLoading(false);
                return;
              }
            } catch (inner) {
              console.warn('List fetch attempt failed:', inner);
            }
          }

          throw lastError || new Error('Product fetch failed after multiple attempts');
        } catch (fallbackErr) {
          throw fallbackErr;
        }
      } catch (err) {
        console.error('Error fetching product:', err);
        setError(err instanceof Error ? err.message : 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Open date picker dialog before adding to cart
  const handleAddToCart = () => {
    if (!product) return;
    setShowDateDialog(true);
  };

  const performAddToCart = (from: string, to: string) => {
    if (!product) return;

    // Basic validation
    if (!from || !to) {
      toast({ title: 'Select dates', description: 'Please select both start and end dates for the rental.', variant: 'destructive' });
      return;
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime()) || fromDate > toDate) {
      toast({ title: 'Invalid dates', description: 'Please ensure the start date is before the end date.', variant: 'destructive' });
      return;
    }

    addItem({
      id: product.id,
      name: product.name,
      price_per_day: product.price_per_day,
      image: product.images[0],
      category: product.category,
      quantity,
      rental_from: from,
      rental_to: to,
    } as any);

    toast({
      title: 'Added to cart',
      description: `${product.name} has been added to your cart for ${from} to ${to}.`,
    });

    setShowDateDialog(false);
  };

  // Add to wishlist handler
  const handleAddToWishlist = async () => {
    if (!product) return;

    const currentlyInWishlist = isInWishlist(product.id);

    if (currentlyInWishlist) {
      const success = await removeFromWishlist(product.id);
      if (success) {
        toast({
          title: "Removed from wishlist",
          description: "Item has been removed from your wishlist.",
        });
      }
    } else {
      const success = await addToWishlist(
        product.id,
        product.name,
        product.price_per_day,
        product.images[0] || "/placeholder.svg",
        product.category,
      );
      if (success) {
        toast({
          title: "Added to wishlist",
          description: "Item has been added to your wishlist.",
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="aspect-square bg-gray-200 rounded-lg"></div>
              <div className="grid grid-cols-4 gap-2">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square bg-gray-200 rounded"
                  ></div>
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center space-y-6 text-center py-16">
          <div className="rounded-full bg-red-100 p-6">
            <Package className="h-12 w-12 text-red-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              Product Not Found
            </h1>
            <p className="text-lg text-muted-foreground max-w-md">
              {error || "The costume you're looking for could not be found."}
            </p>
          </div>
          <div className="flex space-x-4">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
            <Button
              asChild
              className="bg-luxury-purple-600 hover:bg-luxury-purple-700"
            >
              <Link to="/products">Browse Products</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const totalPrice = product.price_per_day * quantity;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground">
          Home
        </Link>
        <span>/</span>
        <Link to="/products" className="hover:text-foreground">
          Products
        </Link>
        <span>/</span>
        <span className="text-foreground">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="aspect-square relative overflow-hidden rounded-lg border">
            <img
              src={product.images[selectedImage]}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "/placeholder.svg";
              }}
            />
            {product.is_new && (
              <Badge className="absolute top-4 left-4 bg-green-500 text-white">
                New
              </Badge>
            )}
            {product.is_featured && (
              <Badge className="absolute top-4 right-4 bg-luxury-purple-600 text-white">
                Featured
              </Badge>
            )}
          </div>

          {/* Thumbnail Images */}
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.slice(0, 4).map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square rounded border-2 overflow-hidden ${
                    selectedImage === index
                      ? "border-luxury-purple-600"
                      : "border-gray-200"
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg";
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {product.name}
            </h1>
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.floor(product.rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                ))}
                <span className="text-sm text-muted-foreground ml-2">
                  {product.rating} ({product.review_count} reviews)
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2 mb-4">
              <Badge variant="secondary">{product.category}</Badge>
              {product.collections.map((collection) => (
                <Badge key={collection.id} variant="outline">
                  {collection.name}
                </Badge>
              ))}
            </div>
          </div>

          <div className="text-3xl font-bold text-luxury-purple-600 mb-6">
            £{product.price_per_day.toFixed(2)}{" "}
            <span className="text-lg font-normal text-muted-foreground">
              per day
            </span>
          </div>

          <Separator />

          <div className="mt-4 text-sm text-muted-foreground">Availability and calendar features have been removed.</div>

          {/* Quantity Selection */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                -
              </Button>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-20 text-center"
                min="1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuantity(quantity + 1)}
              >
                +
              </Button>
            </div>
          </div>

          {/* Enhanced Pricing Display */}

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <Button
              onClick={handleAddToCart}
              className="flex-1 bg-luxury-purple-600 hover:bg-luxury-purple-700"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add to Cart
            </Button>
            <Button
              variant="outline"
              onClick={handleAddToWishlist}
              className={
                product && isInWishlist(product.id)
                  ? "text-red-600 border-red-300"
                  : ""
              }
              aria-label={
                product && isInWishlist(product.id)
                  ? "Remove from wishlist"
                  : "Add to wishlist"
              }
            >
              <Heart
                className={`h-4 w-4 ${product && isInWishlist(product.id) ? "fill-current" : ""}`}
              />
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const url = window.location.href;
                  if (navigator.share) {
                    await navigator.share({
                      title: product.name,
                      text: product.name,
                      url,
                    });
                  } else {
                    await navigator.clipboard.writeText(url);
                    toast({
                      title: "Link copied",
                      description: "Product link copied to clipboard.",
                    });
                  }
                } catch (e) {
                  toast({
                    title: "Unable to share",
                    description: "Please copy the URL from the address bar.",
                    variant: "destructive",
                  });
                }
              }}
              aria-label="Share"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>


          {/* Dialog: select rental dates before adding to cart */}
          <Dialog open={showDateDialog} onOpenChange={(open) => setShowDateDialog(open)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Select rental dates</DialogTitle>
                <DialogDescription>Please choose the start and end dates for your rental.</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 gap-4 my-4">
                <div>
                  <Label htmlFor="rent-from">From</Label>
                  <Input id="rent-from" type="date" value={rentFrom} onChange={(e) => setRentFrom(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="rent-to">To</Label>
                  <Input id="rent-to" type="date" value={rentTo} onChange={(e) => setRentTo(e.target.value)} />
                </div>
              </div>

              <DialogFooter>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowDateDialog(false)}>Cancel</Button>
                  <Button onClick={() => performAddToCart(rentFrom, rentTo)}>Confirm & Add to Cart</Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Product Information */}
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {product.attributes.sku && (
                <div className="flex justify-between">
                  <span className="font-medium">SKU:</span>
                  <span>{product.attributes.sku}</span>
                </div>
              )}
              {product.attributes.material && (
                <div className="flex justify-between">
                  <span className="font-medium">Material:</span>
                  <span>{product.attributes.material}</span>
                </div>
              )}
              {product.attributes.dimensions && (
                <div className="flex justify-between">
                  <span className="font-medium">Dimensions:</span>
                  <span>{product.attributes.dimensions}</span>
                </div>
              )}
              {product.sizes.length > 0 && (
                <div className="flex justify-between">
                  <span className="font-medium">Available Sizes:</span>
                  <span>{product.sizes.join(", ")}</span>
                </div>
              )}
              {product.colors.length > 0 && (
                <div className="flex justify-between">
                  <span className="font-medium">Available Colors:</span>
                  <span>{product.colors.join(", ")}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Care Instructions */}
          {product.attributes.care && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Care Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{product.attributes.care}</p>
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      {/* Description */}
      {product.description && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line">{product.description}</p>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
