import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Star, Clock, Shield, Heart, Calendar, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface Product {
  id: string;
  name: string;
  price_per_day: number;
  images: string[];
  category: string;
  rating?: number;
  is_featured?: boolean;
  is_new?: boolean;
}

interface Collection {
  id: string;
  name: string;
  image: string;
  product_count?: number;
}

function FAQAccordion() {
  return (
    <Accordion type="single" collapsible className="max-w-3xl mx-auto">
      <AccordionItem value="item-1">
        <AccordionTrigger>How do I book a costume?</AccordionTrigger>
        <AccordionContent>
          Browse products, select your dates on the product page, add to cart, and proceed to checkout. You’ll receive confirmation by email.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>What is the minimum rental period?</AccordionTrigger>
        <AccordionContent>
          The minimum rental period is 8 days, ensuring adequate time for delivery, performances, and returns.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>Do you offer delivery?</AccordionTrigger>
        <AccordionContent>
          Yes. Delivery is free for orders over £100. Otherwise, a small delivery fee applies, shown during checkout.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-4">
        <AccordionTrigger>Can I get help choosing sizes?</AccordionTrigger>
        <AccordionContent>
          Absolutely. Contact our support team for personalized sizing advice based on your measurements and performance needs.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export default function Index() {
  const [searchQuery, setSearchQuery] = useState('');

  // ICS calendar is shown below as a demo of direct ICS parsing
  const icsUrl = 'https://dance-costumes-for-hire-90e5.booqable.com/integrations/calendar/e313abf2b30213a486a238d0986a64df/orders.ics';
  const [currentSlide, setCurrentSlide] = useState(0);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [heroProducts, setHeroProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Helper function to retry fetch with backoff. Returns null on failure instead of throwing,
  // so callers can gracefully degrade when network endpoints are unavailable.
  const fetchWithRetry = async (url: string, retries = 2): Promise<Response | null> => {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`Attempting to fetch ${url} (attempt ${i + 1}/${retries})`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

        const response = await fetch(url, {
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.warn(`Non-OK response for ${url}: ${response.status} ${response.statusText}`);
          // treat non-OK as failure for this attempt
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        console.log(`Successfully fetched ${url}`);
        return response;
      } catch (err) {
        console.warn(`Fetch attempt ${i + 1} failed for ${url}:`, err);

        if (i === retries - 1) {
          console.warn(`All retry attempts failed for ${url}. Returning null.`);
          return null; // return null to allow graceful degradation
        }

        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, i), 5000);
        console.log(`Retrying ${url} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return null;
  };

  // Fetch data from APIs
  useEffect(() => {
    const fetchHomePageData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Starting home page data fetch...');
        console.log('Environment info:', {
          userAgent: navigator.userAgent,
          hostname: window.location.hostname,
          protocol: window.location.protocol,
          hasFullStory: typeof window !== 'undefined' && !!(window as any).FS,
          hasChromeExtensions: typeof chrome !== 'undefined' && !!(chrome as any).runtime
        });

        // Test basic connectivity first (non-blocking). Skip if navigator is offline.
        try {
          if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            console.warn('Navigator reports offline; skipping connectivity test.');
          } else {
            const pingResponse = await fetchWithRetry('/api/ping', 1);
            if (pingResponse) {
              const pingData = await pingResponse.text();
              console.log('Connectivity test successful:', pingData);
            } else {
              console.warn('Connectivity test did not return a response; continuing without it.');
            }
          }
        } catch (pingError) {
          console.warn('Connectivity test failed unexpectedly, continuing anyway:', pingError);
        }

        // Fetch collections and products with individual error handling
        let collectionsData = null;
        let productsData = null;

        // Try to fetch collections
        const clientDefaultCollections = [
          { id: 'all', name: 'All Products', image: '/placeholder.svg', description: 'Browse all available costumes', product_count: 0 },
          { id: 'shows', name: 'Shows', image: '/placeholder.svg', description: 'Costumes designed for performances', product_count: 0 },
          { id: 'competitions', name: 'Competitions', image: '/placeholder.svg', description: 'Fun, vibrant costumes', product_count: 0 },
          { id: 'schools', name: 'Schools', image: '/placeholder.svg', description: 'Versatile costumes for schools', product_count: 0 },
          { id: 'boys', name: 'Boys', image: '/placeholder.svg', description: "Costumes for boys' performances", product_count: 0 },
          { id: 'girls', name: 'Girls', image: '/placeholder.svg', description: "Beautiful costumes for girls' performances", product_count: 0 }
        ];

        // Helper to try multiple endpoints for better resilience (relative, netlify functions, absolute origin)
        const tryFetchEndpoints = async (paths: string[], retries = 2) => {
          let lastError: any = null;
          for (const p of paths) {
            try {
              console.log('Attempting fetch for', p);
              const res = await fetchWithRetry(p, retries);
              if (res) {
                return res;
              }
              // otherwise move to next fallback
            } catch (err) {
              console.warn('Fetch threw for', p, err);
              lastError = err;
            }
          }
          // If nothing worked return null instead of throwing so callers can fallback
          console.warn('All endpoint fallbacks failed for paths:', paths, 'lastError:', lastError);
          return null;
        };

        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const collectionPaths = ['/api/collections', '/.netlify/functions/api/collections', `${origin}/api/collections`];
        const productPaths = ['/api/products?limit=12', '/.netlify/functions/api/products?limit=12', `${origin}/api/products?limit=12`];

        try {
          const collectionsRes = await tryFetchEndpoints(collectionPaths, 2);
          if (collectionsRes) {
            collectionsData = await collectionsRes.json();
            console.log('Collections data fetched successfully from fallback');
          } else {
            console.warn('No collections response from fallbacks; using client defaults');
            collectionsData = { success: true, data: clientDefaultCollections };
          }
        } catch (collectionsError) {
          console.error('Failed to fetch collections via all fallbacks:', collectionsError);
          // Fallback to client defaults so UI remains usable even if network fails
          collectionsData = { success: true, data: clientDefaultCollections };
        }

        // Try to fetch products
        try {
          const productsRes = await tryFetchEndpoints(productPaths, 2);
          if (productsRes) {
            productsData = await productsRes.json();
            console.log('Products data fetched successfully from fallback');
          } else {
            console.warn('No products response from fallbacks; productsData remains null');
          }
        } catch (productsError) {
          console.error('Failed to fetch products via all fallbacks:', productsError);
        }

        // Process collections data if available
        if (collectionsData && collectionsData.success) {
          // Take first 6 collections for trending categories
          setCollections(collectionsData.data.slice(0, 6));
          console.log('Collections set successfully:', collectionsData.data.length);
        }

        // Process products data if available
        if (productsData && productsData.success) {
          const products = productsData.data.products;

          // Set featured products (first 8)
          setFeaturedProducts(products.slice(0, 8));

          // Set hero products (first 3 for carousel)
          setHeroProducts(products.slice(0, 3));

          console.log('Products set successfully:', products.length);
        }

        // If we got some data, clear any previous errors
        if ((collectionsData && collectionsData.success) || (productsData && productsData.success)) {
          setError(null);
        }

      } catch (err) {
        console.error('Error fetching home page data:', err);

        setError('Failed to load data.');
      } finally {
        setLoading(false);
        console.log('Home page data loading completed');
      }
    };

    fetchHomePageData();
  }, []);


  // Dynamic hero slides based on real products only
  const heroSlides = heroProducts.length > 0 ?
    heroProducts.map((product, index) => ({
      id: product.id,
      title: product.name,
      subtitle: `Premium ${product.category} costume rental`,
      image: product.images[0] || "/placeholder.svg",
      quote: "Dance Costumes For Hire — By Julie",
      cta: "Book Now",
      bg: [
        "bg-gradient-to-r from-luxury-purple-600 to-luxury-purple-900",
        "bg-gradient-to-r from-luxury-emerald-600 to-luxury-emerald-700",
        "bg-gradient-to-r from-luxury-gold-500 to-luxury-gold-600"
      ][index % 3]
    })) : [];

  // Transform collections for trending categories (no demo fallback)
  const trendingCategories = collections.length > 0 ?
    collections.map(collection => ({
      name: collection.name,
      image: collection.image,
      count: collection.product_count ? `${collection.product_count} costumes` : "Available now"
    })) : [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Navigate to products page with search query
    window.location.href = `/products?search=${encodeURIComponent(searchQuery)}`;
  };

  const nextSlide = () => {
    if (heroSlides.length === 0) return;
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    if (heroSlides.length === 0) return;
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  // Keep currentSlide in bounds when slides change
  useEffect(() => {
    if (heroSlides.length === 0 && currentSlide !== 0) {
      setCurrentSlide(0);
    } else if (heroSlides.length > 0 && currentSlide >= heroSlides.length) {
      setCurrentSlide(0);
    }
  }, [heroSlides.length, currentSlide]);

  // Autoplay carousel unless paused
  useEffect(() => {
    if (heroSlides.length === 0 || isPaused) return;
    const id = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(id);
  }, [heroSlides.length, isPaused]);

  // Show loading screen on initial load
  if (loading && featuredProducts.length === 0 && collections.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-luxury-purple-600" />
          <h3 className="text-lg font-semibold mb-2">Loading Featured Costumes</h3>
          <p className="text-muted-foreground">Getting the best costumes for you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Error Display */}
      {error && (
        <Alert className="mb-6 mx-4">
          <AlertDescription className="flex items-center justify-between">
            <div>
              <strong>Notice:</strong> {error}
            </div>
            <div className="flex gap-2 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                <Loader2 className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('/network-diagnostics', '_blank')}
              >
                Debug
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      {/* Hero Banner Slider */}
      {heroSlides.length > 0 && (
      <section className="relative h-[760px] overflow-hidden" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
        {heroSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-transform duration-900 ease-in-out ${
              index === currentSlide ? 'translate-x-0' :
              index < currentSlide ? '-translate-x-full' : 'translate-x-full'
            }`}
            aria-hidden={index !== currentSlide}
          >
            <div className={`relative flex h-full items-center ${slide.bg}`}>
              {/* Background sliding costume image */}
              <picture className="absolute inset-0 block h-full w-full z-0">
                <source srcSet={`${slide.image}`} />
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="absolute inset-0 h-full w-full object-cover opacity-40"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder.svg';
                  }}
                />
              </picture>

              {/* Soft gradient overlay to improve contrast */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-black/10 z-10" />

              <div className="container mx-auto px-4 relative z-20">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 items-center">
                  <div className="flex flex-col justify-center space-y-4 text-white">
                    <Badge className="w-fit bg-white/20 text-white hover:bg-white/30">Featured Collection</Badge>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight">
                      {slide.title}
                    </h1>
                    <p className="text-lg md:text-xl opacity-95 max-w-xl">{slide.subtitle}</p>

                    <div className="flex flex-wrap gap-3 mt-4">
                      <Button size="lg" className="rounded-full bg-luxury-gold-500 text-white px-6 py-3 shadow-lg hover:opacity-95" asChild>
                        <Link to="/products">{slide.cta}</Link>
                      </Button>
                      <Button variant="outline" size="lg" className="rounded-full border-white text-white px-6 py-3 hover:bg-white/10" asChild>
                        <Link to="/products">Browse All</Link>
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    <picture>
                      <source srcSet={`${slide.image}`} />
                      <img
                        src={slide.image}
                        alt={slide.title}
                        loading="lazy"
                        className="max-h-96 w-auto rounded-xl shadow-2xl relative z-20"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder.svg';
                        }}
                      />
                    </picture>
                  </div>
                </div>
              </div>

              {/* Right-side quote */}
              <div className="absolute right-8 top-8 max-w-sm text-right text-white z-30">
                <p className="text-xl italic font-semibold drop-shadow">{slide.quote}</p>
              </div>
            </div>
          </div>
        ))}

        {/* Slider Controls */}
        <Button variant="ghost" size="sm" className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 text-white hover:bg-white/30" onClick={prevSlide}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <Button variant="ghost" size="sm" className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 text-white hover:bg-white/30" onClick={nextSlide}>
          <ChevronRight className="h-6 w-6" />
        </Button>

        {/* Slide Indicators */}
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 space-x-2">
          {heroSlides.map((_, index) => (
            <button key={index} className={`h-2 w-8 rounded-full transition-colors ${index === currentSlide ? 'bg-white' : 'bg-white/50'}`} onClick={() => setCurrentSlide(index)} />
          ))}
        </div>
      </section>
      )}



      {/* Featured Products */}
      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 flex items-center justify_between">
            <div>
              <h2 className="mb-4 text-3xl font-bold">Featured Products</h2>
              <p className="text-lg text-muted-foreground">
                Hand-picked premium costumes perfect for any occasion
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/products">View All Products</Link>
            </Button>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="aspect-[3/4] bg-muted animate-pulse" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                      <div className="h-6 bg-muted rounded animate-pulse" />
                      <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {featuredProducts.slice(0, 4).map((product) => (
                <Link key={product.id} to={`/costume/${product.id}`} className="group">
                  <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                    <CardContent className="p-0">
                      <div className="relative aspect-[3/4] overflow-hidden">
                        <img
                          src={product.images[0] || '/placeholder.svg'}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder.svg';
                          }}
                        />
                        <div className="absolute top-3 left-3 flex flex-col gap-2">
                          {product.is_new && (
                            <Badge className="bg-luxury-emerald-500 hover:bg-luxury-emerald-600">
                              New
                            </Badge>
                          )}
                          {product.is_featured && (
                            <Badge className="bg-luxury-gold-500 hover:bg-luxury-gold-600">
                              Featured
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-3 right-3 bg-white/20 text-white hover:bg-white/30"
                        >
                          <Heart className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <Badge variant="secondary" className="text-xs">
                            {product.category}
                          </Badge>
                          <div className="flex items-center space-x-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs text-muted-foreground">{product.rating || 4.5}</span>
                          </div>
                        </div>
                        <h3 className="mb-2 font-semibold group-hover:text-luxury-purple-600 line-clamp-2">
                          {product.name}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-bold text-luxury-purple-600">
                            £{product.price_per_day.toFixed(2)}
                          </span>
                          <span className="text-xs text-muted-foreground">/day</span>
                        </div>
                        <Button className="mt-3 w-full bg-luxury-purple-600 hover:bg-luxury-purple-700" size="sm">
                          View Product
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx_auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Star className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No featured products available</h3>
              <p className="text-muted-foreground mb-4">Check back later for our latest featured costumes</p>
              <Button asChild>
                <Link to="/products">Browse All Products</Link>
              </Button>
            </div>
          )}

        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold">Why Choose Our Costumes?</h2>
            <p className="text-lg text-muted-foreground">
              Premium quality, professional service, and unbeatable convenience
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-luxury-purple-100">
                <Shield className="h-8 w-8 text-luxury-purple-600" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Premium Quality</h3>
              <p className="text-muted-foreground">
                Professional-grade costumes cleaned and maintained to the highest standards
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-luxury-emerald-100">
                <Clock className="h-8 w-8 text-luxury-emerald-600" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Flexible Rental</h3>
              <p className="text-muted-foreground">
                Minimum 8-day rental period with easy booking and return process
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-luxury-gold-100">
                <Star className="h-8 w-8 text-luxury-gold-600" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Customer Service</h3>
              <p className="text-muted-foreground">
                Expert advice, size guidance, and 24/7 support throughout your rental
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Dance School */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-2 items-center">
            <div>
              <h2 className="mb-4 text-3xl font-bold">About Our Dance School</h2>
              <p className="text-lg text-muted-foreground mb-4">
                We provide premium costumes and tailored rentals for schools, studios, and theatre groups. Our mission is to make performances shine with high-quality, well-maintained outfits and a seamless booking experience.
              </p>
              <p className="text-muted-foreground">
                From period dramas to contemporary shows, our curated collections and professional service ensure you get the right look, on time, every time.
              </p>
            </div>
            <div>
              <img src="https://cdn.builder.io/api/v1/image/assets%2Ff9cc215e3ca54996a89f271179969b20%2F4316600c33e94d15a566c6afe22c49a5" alt="Dance School" className="rounded-lg shadow" />
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold mb-2">FAQs</h2>
            <p className="text-muted-foreground">Common questions about rentals and bookings</p>
          </div>
          <FAQAccordion />
        </div>
      </section>

      {/* Seasonal Offers */}
      <section className="bg-gradient-to-r from-luxury-purple-600 to-luxury-purple-900 py-16 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold">Limited Time Offer</h2>
          <p className="mb-6 text-xl opacity-90">
            Get 20% off your first rental when you sign up today
          </p>
          <div className="mx-auto max-w-md">
            <Button size="lg" className="w-full bg-white text-luxury-purple-600 hover:bg-gray-100">
              Claim Your Discount
            </Button>
          </div>
          <p className="mt-4 text-sm opacity-75">
            Valid until 31st December 2024. Terms and conditions apply.
          </p>
        </div>
      </section>

    </div>
  );
}
