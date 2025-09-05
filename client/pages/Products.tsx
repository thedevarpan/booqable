import { useState, useEffect } from 'react';
import { Search, Filter, Star, Heart, Calendar, Grid, List, SlidersHorizontal, Loader2, AlertCircle } from 'lucide-react';
import Pagination from '@/components/Pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link, useSearchParams } from 'react-router-dom';

// Types for Booqable data
interface Collection {
  id: string | number;
  name: string;
  image: string;
  product_count?: number;
  count?: number; // Backwards compatibility
  description?: string;
}

interface Product {
  id: string | number;
  name: string;
  price_per_day: number;
  images: string[];
  category: string;
  description: string;
  sizes?: string[];
  colors?: string[];
  rating?: number;
  review_count?: number;
  is_featured?: boolean;
  is_new?: boolean;
  attributes?: {
    sku?: string;
    material?: string;
    care?: string;
    [key: string]: any;
  };
}

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [priceRange, setPriceRange] = useState([0, 100]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('featured');

  // API Data State
  const [collections, setCollections] = useState<Collection[]>([]);
  const [slugToUuid, setSlugToUuid] = useState<Record<string, string>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collectionsLoading, setCollectionsLoading] = useState(true);

  // Helper function to retry fetch requests
  const fetchWithRetry = async (url: string, options: RequestInit, retries = 3): Promise<Response> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
            // If url is relative, make it absolute to avoid origin issues in some deployments
        const absoluteUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
        // Diagnostic log
        console.log('fetchWithRetry attempt', attempt, 'url:', absoluteUrl);

        const response = await fetch(absoluteUrl, {
          ...options,
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }

        // Wait progressively longer between retries
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }

    throw new Error('All retry attempts failed');
  };

  // Fetch collections from Booqable
  const fetchCollections = async () => {
    try {
      setCollectionsLoading(true);
      setError(null);

      const response = await fetchWithRetry('/api/collections', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        // Ensure each collection has a URL-friendly slug
        const mapped = data.data.map((col: any) => ({
          ...col,
          slug: col.slug || String(col.id).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        }));
        setCollections(mapped);
        // Build slug -> UUID map for fast lookup when translating slugs to API collection IDs
        const map: Record<string, string> = {};
        mapped.forEach((c: any) => {
          if (c.slug) map[c.slug] = String(c.id);
        });
        setSlugToUuid(map);
      } else {
        throw new Error(data.error || 'Failed to fetch collections');
      }
    } catch (err) {
      console.error('Error fetching collections:', err);

      // Additional diagnostics: try direct function endpoint to see if functions are reachable
      (async () => {
        try {
          const funcUrl = `${window.location.origin}/.netlify/functions/api/collections`;
          console.warn('Attempting fallback to functions endpoint:', funcUrl);
          const r = await fetch(funcUrl, { method: 'GET' });
          console.warn('Fallback functions endpoint status:', r.status);
          try { const txt = await r.text(); console.warn('Fallback functions response text:', txt); } catch (e) { console.warn('Could not read fallback response text', e); }
        } catch (e) {
          console.warn('Fallback functions request failed:', e);
        }
      })();

      // Provide fallback collections to keep the app functional
      const fallbackCollections = [
        {
          id: 'all',
          name: 'All Products',
          image: '/placeholder.svg',
          description: 'Browse all available costumes',
          product_count: 0
        },
        {
          id: 'shows',
          name: 'Shows',
          image: '/placeholder.svg',
          description: 'Costumes for performances',
          product_count: 0
        },
        {
          id: 'competitions',
          name: 'Competitions',
          image: '/placeholder.svg',
          description: 'Competition costumes',
          product_count: 0
        },
        {
          id: 'schools',
          name: 'Schools',
          image: '/placeholder.svg',
          description: 'School event costumes',
          product_count: 0
        }
      ];

      const withSlugs = fallbackCollections.map(col => ({
        ...col,
        slug: col.slug || String(col.id).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      }));
      setCollections(withSlugs);
      // Build slug->UUID map for fallbacks as well
      const fallbackMap: Record<string, string> = {};
      withSlugs.forEach((c: any) => { if (c.slug) fallbackMap[c.slug] = String(c.id); });
      setSlugToUuid(fallbackMap);
      setError(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}. Using fallback collections.`);
    } finally {
      setCollectionsLoading(false);
    }
  };

  // Fetch products from Booqable
  const fetchProducts = async (page = 1, searchTerm = '', category = '') => {
    try {
      setLoading(true);
      setError(null);

      // Determine collection id to send to API: accept UUIDs directly, or translate slugs to UUIDs using slugToUuid map
      let collectionForApi = '';
      if (category && category !== 'all') {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(String(category))) {
          collectionForApi = String(category);
        } else if (slugToUuid[String(category)]) {
          collectionForApi = slugToUuid[String(category)];
        } else {
          // Fallback: use provided category (might be a legacy id or slug); API may handle it
          collectionForApi = String(category);
        }
      }

      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '30',
        ...(searchTerm && { search: searchTerm }),
        ...(collectionForApi && { collection_id: collectionForApi }),
      });

      console.log('Fetching products with search term:', searchTerm);
      console.log('Full URL params:', params.toString());

      setCurrentPage(page);

      const response = await fetchWithRetry(`/api/products?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setProducts(data.data.products);
        setTotalProducts(data.data.pagination.total_count);
        setTotalPages(data.data.pagination.total_pages || Math.ceil(data.data.pagination.total_count / 30));

        // Update "All Products" count if collections are loaded
        if (collections.length > 0) {
          setCollections(prev =>
            prev.map(col =>
              col.id === 'all'
                ? { ...col, product_count: data.data.pagination.total_count }
                : col
            )
          );
        }
      } else {
        throw new Error(data.error || 'Failed to fetch products');
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      const message = err instanceof Error ? err.message : String(err);

      // Diagnostics: attempt direct functions endpoint to capture server behavior
      (async () => {
        try {
          const funcUrl = `${window.location.origin}/.netlify/functions/api/products?${params}`;
          console.warn('Attempting fallback to functions endpoint for products:', funcUrl);
          const r = await fetch(funcUrl, { method: 'GET' });
          console.warn('Fallback functions products status:', r.status);
          try { const txt = await r.text(); console.warn('Fallback functions products response text:', txt); } catch (e) { console.warn('Could not read fallback products response text', e); }
        } catch (e) {
          console.warn('Fallback functions products request failed:', e);
        }
      })();

      if (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('All retry attempts failed')) {
        setError('Network error: Unable to reach API. Please check your connection or try again later.');
      } else {
        setError(`Error: ${message}`);
      }
      setProducts([]);
      setTotalProducts(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const sizes = ["XS", "S", "M", "L", "XL", "XXL"];
  const colors = ["Black", "White", "Red", "Blue", "Green", "Gold", "Silver", "Purple", "Brown", "Navy", "Burgundy"];

  // Initialize data loading
  const initializeData = async () => {
    // Basic connectivity check
    try {
      const pingUrl = `${window.location.origin}/api/ping`;
      console.log('Pinging API at', pingUrl);
      const pingResp = await fetch(pingUrl);
      console.log('/api/ping status:', pingResp.status);
    } catch (e) {
      console.warn('Ping to /api/ping failed:', e);
    }

    await fetchCollections();
  };

  // Fetch collections on component mount
  useEffect(() => {
    initializeData();
    // Also fetch products initially (including any search from URL)
    fetchProducts(1, searchQuery, selectedCategory);
  }, []);

  // Fetch products when filters change
  useEffect(() => {
    fetchProducts(1, searchQuery, selectedCategory);
  }, [selectedCategory]);

  // If we had a slug selected but no UUID mapping at the time of initial fetch,
  // refetch once the slug->UUID map is available so the API receives the UUID.
  useEffect(() => {
    if (!selectedCategory || selectedCategory === 'all') return;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(String(selectedCategory))) return; // already UUID
    if (slugToUuid[selectedCategory]) {
      // refetch using slug (fetchProducts will translate slug to UUID)
      fetchProducts(1, searchQuery, selectedCategory);
    }
  }, [slugToUuid]);

  // Fetch products when search query changes
  useEffect(() => {
    if (searchQuery) {
      fetchProducts(1, searchQuery, selectedCategory);
    }
  }, [searchQuery]);

  const handlePageChange = (page: number) => {
    fetchProducts(page, searchQuery, selectedCategory);
    // Scroll to top of products section
    document.querySelector('main')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Update URL params when search or category changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedCategory && selectedCategory !== 'all') params.set('category', selectedCategory);
    setSearchParams(params);
  }, [searchQuery, selectedCategory, setSearchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts(1, searchQuery, selectedCategory);
  };

  const toggleSize = (size: string) => {
    setSelectedSizes(prev => 
      prev.includes(size) 
        ? prev.filter(s => s !== size)
        : [...prev, size]
    );
  };

  const toggleColor = (color: string) => {
    setSelectedColors(prev => 
      prev.includes(color) 
        ? prev.filter(c => c !== color)
        : [...prev, color]
    );
  };

  const FilterSidebar = () => (
    <div className="space-y-6">
      <Separator />

      {/* Price Range */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">Price Range (per day)</h3>
        <div className="space-y-4">
          <Slider
            value={priceRange}
            onValueChange={setPriceRange}
            max={100}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>£{priceRange[0]}</span>
            <span>£{priceRange[1]}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Sizes */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">Sizes</h3>
        <div className="grid grid-cols-3 gap-2">
          {sizes.map((size) => (
            <button
              key={size}
              onClick={() => toggleSize(size)}
              className={`rounded border p-2 text-sm transition-colors ${
                selectedSizes.includes(size)
                  ? 'border-luxury-purple-500 bg-luxury-purple-100 text-luxury-purple-700'
                  : 'border-border hover:bg-muted'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Colors */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">Colors</h3>
        <div className="space-y-2">
          {colors.map((color) => (
            <div key={color} className="flex items-center space-x-2">
              <Checkbox
                id={color}
                checked={selectedColors.includes(color)}
                onCheckedChange={() => toggleColor(color)}
              />
              <Label htmlFor={color} className="text-sm">
                {color}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-4 text-3xl font-bold">Costume Collection</h1>
        <p className="text-lg text-muted-foreground">
          Discover our premium costume rental collection
        </p>
      </div>

      {/* Search and Filters Bar */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search costumes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" className="bg-luxury-purple-600 hover:bg-luxury-purple-700">
            Search
          </Button>
        </form>

        <div className="flex items-center gap-4">
          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
            </SelectContent>
          </Select>

          {/* View Mode */}
          <div className="flex rounded-md border">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Mobile Filter Toggle */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <FilterSidebar />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden w-80 lg:block">
          <div className="sticky top-24">
            <FilterSidebar />
          </div>
        </aside>

        {/* Products Grid */}
        <main className="flex-1">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {loading ? 'Loading...' : `Page ${currentPage} of ${totalPages} (${totalProducts} total costumes)`}
            </p>
          </div>

          {/* Error State */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setError(null);
                      initializeData();
                    }}
                  >
                    Retry
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setError(null);
                      fetchProducts(currentPage, searchQuery, selectedCategory);
                    }}
                  >
                    Refresh Products
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open('/network-diagnostics', '_blank')}
                  >
                    Network Test
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-luxury-purple-600" />
              <span className="ml-2 text-lg text-muted-foreground">Loading costumes...</span>
            </div>
          ) : products.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No costumes found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || selectedCategory !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'No costumes are currently available'
                }
              </p>
              {(searchQuery || selectedCategory !== 'all') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setCurrentPage(1);
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            /* Products Grid */
            <div className={`grid gap-6 ${
              viewMode === 'grid'
                ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
                : 'grid-cols-1'
            }`}>
              {products.map((product) => (
                <Link key={product.id} to={`/costume/${product.id}`} className="group">
                  <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                    <CardContent className="p-0">
                      {viewMode === 'grid' ? (
                        <>
                          <div className="relative aspect-[3/4] overflow-hidden">
                            <img
                              src={product.images?.[0] || '/placeholder.svg'}
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
                              {product.rating && (
                                <div className="flex items-center space-x-1">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  <span className="text-xs text-muted-foreground">
                                    {product.rating} {product.review_count && `(${product.review_count})`}
                                  </span>
                                </div>
                              )}
                            </div>
                            <h3 className="mb-2 font-semibold group-hover:text-luxury-purple-600">
                              {product.name}
                            </h3>
                            <p className="mb-3 text-xs text-muted-foreground line-clamp-2">
                              {product.description}
                            </p>
                            <div className="flex items-center space-x-2 mb-3">
                              <span className="text-lg font-bold text-luxury-purple-600">
                                £{product.price_per_day}
                              </span>
                              <span className="text-xs text-muted-foreground">/day</span>
                            </div>
                            <Button className="w-full bg-luxury-purple-600 hover:bg-luxury-purple-700" size="sm">
                              View Product
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="flex gap-4 p-4">
                          <div className="relative h-32 w-24 flex-shrink-0 overflow-hidden rounded-md">
                            <img
                              src={product.images?.[0] || '/placeholder.svg'}
                              alt={product.name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/placeholder.svg';
                              }}
                            />
                            {product.is_new && (
                              <Badge className="absolute top-1 left-1 bg-luxury-emerald-500 text-xs">
                                New
                              </Badge>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="mb-2 flex items-center justify-between">
                              <Badge variant="secondary" className="text-xs">
                                {product.category}
                              </Badge>
                              {product.rating && (
                                <div className="flex items-center space-x-1">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  <span className="text-xs text-muted-foreground">
                                    {product.rating} {product.review_count && `(${product.review_count})`}
                                  </span>
                                </div>
                              )}
                            </div>
                            <h3 className="mb-2 text-lg font-semibold group-hover:text-luxury-purple-600">
                              {product.name}
                            </h3>
                            <p className="mb-3 text-sm text-muted-foreground">
                              {product.description}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="text-xl font-bold text-luxury-purple-600">
                                  £{product.price_per_day}
                                </span>
                                <span className="text-sm text-muted-foreground">/day</span>
                              </div>
                              <Button className="bg-luxury-purple-600 hover:bg-luxury-purple-700" size="sm">
                                View Product
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {products.length > 0 && totalPages > 1 && (
            <div className="mt-12">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                className="mb-4"
              />
              <div className="text-center text-sm text-muted-foreground">
                Showing {((currentPage - 1) * 30) + 1}-{Math.min(currentPage * 30, totalProducts)} of {totalProducts} costumes
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
