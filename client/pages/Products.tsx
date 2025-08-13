import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Grid, List, Heart, Star, Eye, ShoppingCart, RefreshCw, Filter } from 'lucide-react';
import { booqableAPI, type Product, type ProductGroup } from '../lib/booqable';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useCart } from '../contexts/CartContext';

// Enhanced Product interface for UI display
interface UIProduct extends Product {
  rating: number;
  reviews: number;
  isFavorite: boolean;
  isNew: boolean;
  onSale: boolean;
  originalPrice?: number;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'name' | 'price-low' | 'price-high' | 'rating' | 'newest';

// Icon mapping for collections
const getCollectionIcon = (name: string): string => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('wedding') || lowerName.includes('bridal')) return '💍';
  if (lowerName.includes('party') || lowerName.includes('celebration')) return '🎉';
  if (lowerName.includes('kids') || lowerName.includes('children') || lowerName.includes('child')) return '👶';
  if (lowerName.includes('theme') || lowerName.includes('costume')) return '🎭';
  if (lowerName.includes('superhero') || lowerName.includes('hero')) return '🦸';
  if (lowerName.includes('dance') || lowerName.includes('ballet')) return '💃';
  if (lowerName.includes('traditional') || lowerName.includes('cultural')) return '🌍';
  if (lowerName.includes('top') || lowerName.includes('shirt')) return '👕';
  if (lowerName.includes('dress') || lowerName.includes('gown')) return '👗';
  if (lowerName.includes('skirt') || lowerName.includes('bottom')) return '👜';
  return '🎪';
};

export function Products() {
  const [products, setProducts] = useState<UIProduct[]>([]);
  const [collections, setCollections] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart } = useCart();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Handle URL params for collection filtering
    const collectionParam = searchParams.get('collection');
    if (collectionParam && collections.length > 0) {
      const collection = collections.find(c => c.slug === collectionParam);
      if (collection) {
        setSelectedCollectionId(collection.id);
      }
    }
  }, [searchParams, collections]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Loading products and collections from Booqable...');
      
      const [productsData, collectionsData] = await Promise.all([
        booqableAPI.getProducts(),
        booqableAPI.getProductGroups()
      ]);

      console.log('Raw products response:', productsData);
      console.log('Raw collections response:', collectionsData);

      // Enhance products with UI-specific properties
      const enhancedProducts: UIProduct[] = productsData.map(product => ({
        ...product,
        rating: Math.random() * 2 + 3, // Random rating between 3-5
        reviews: Math.floor(Math.random() * 50) + 5, // Random reviews 5-55
        isFavorite: false,
        isNew: Math.random() > 0.8, // 20% chance of being new
        onSale: Math.random() > 0.9, // 10% chance of being on sale
        originalPrice: Math.random() > 0.9 ? product.price_per_day * 1.2 : undefined,
      }));

      setProducts(enhancedProducts);
      setCollections(collectionsData);
      
      console.log(`Successfully loaded ${enhancedProducts.length} products and ${collectionsData.length} collections`);
      
      if (enhancedProducts.length === 0) {
        toast.info('No products found in your Booqable account');
      }
      if (collectionsData.length === 0) {
        toast.info('No collections found in your Booqable account');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data from Booqable API');
      setProducts([]);
      setCollections([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort products
  const filteredAndSortedProducts = React.useMemo(() => {
    let filtered = products.filter(product => {
      // Search filter
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Collection filter
      const matchesCollection = selectedCollectionId === 'all' || 
                               product.product_group_id === selectedCollectionId;
      
      return matchesSearch && matchesCollection;
    });

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price_per_day - b.price_per_day;
        case 'price-high':
          return b.price_per_day - a.price_per_day;
        case 'rating':
          return b.rating - a.rating;
        case 'newest':
          return b.isNew ? 1 : -1;
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [products, searchQuery, selectedCollectionId, sortBy]);

  const handleAddToCart = (product: UIProduct) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price_per_day,
      image: product.images[0] || 'https://images.unsplash.com/photo-1583196344000-916dd2b51a79?w=400&h=500&fit=crop',
      quantity: 1,
    });
    toast.success(`${product.name} added to cart!`);
  };

  const handleCollectionSelect = (collectionId: string) => {
    setSelectedCollectionId(collectionId);
    
    // Update URL params
    if (collectionId === 'all') {
      setSearchParams({});
    } else {
      const collection = collections.find(c => c.id === collectionId);
      if (collection) {
        setSearchParams({ collection: collection.slug });
      }
    }
    
    // Close sidebar on mobile after selection
    setSidebarOpen(false);
  };

  const selectedCollection = collections.find(c => c.id === selectedCollectionId);
  const currentCollectionName = selectedCollectionId === 'all' ? 'All Products' : selectedCollection?.name || 'Unknown Collection';

  const ProductCard = ({ product }: { product: UIProduct }) => (
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300">
      <CardHeader className="p-0 relative">
        <div className="aspect-[3/4] relative overflow-hidden">
          <img
            src={product.images[0] || 'https://images.unsplash.com/photo-1583196344000-916dd2b51a79?w=400&h=500&fit=crop'}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.isNew && (
              <Badge className="bg-green-500 text-white">New</Badge>
            )}
            {product.onSale && (
              <Badge className="bg-red-500 text-white">Sale</Badge>
            )}
          </div>
          <div className="absolute top-2 right-2">
            <Button
              size="sm"
              variant="ghost"
              className="text-white bg-black/50 hover:bg-black/70"
              onClick={(e) => {
                e.preventDefault();
                // Toggle favorite functionality can be added here
              }}
            >
              <Heart className="h-4 w-4" />
            </Button>
          </div>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Button asChild className="bg-white text-black hover:bg-gray-100">
              <Link to={`/product/${product.id}`}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="mb-2">
          <Badge variant="secondary" className="text-xs">
            {product.category}
          </Badge>
        </div>
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">
          {product.name}
        </h3>
        <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
          {product.description || product.short_description}
        </p>
        <div className="flex items-center gap-1 mb-3">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`h-3 w-3 ${
                i < Math.floor(product.rating)
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300'
              }`}
            />
          ))}
          <span className="text-sm text-muted-foreground ml-1">
            ({product.reviews})
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {product.onSale && product.originalPrice ? (
              <>
                <span className="text-lg font-bold text-purple-600">
                  £{product.price_per_day}
                </span>
                <span className="text-sm text-muted-foreground line-through">
                  £{product.originalPrice}
                </span>
              </>
            ) : (
              <span className="text-lg font-bold text-purple-600">
                £{product.price_per_day}
              </span>
            )}
            <span className="text-sm text-muted-foreground">/day</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <div className="w-full space-y-2">
          <div className="text-sm text-muted-foreground">
            Stock: {product.stock_quantity} available
          </div>
          <Button
            onClick={() => handleAddToCart(product)}
            disabled={!product.available || product.stock_quantity === 0}
            className="w-full"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {product.available && product.stock_quantity > 0 ? 'Add to Cart' : 'Out of Stock'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );

  const Sidebar = () => (
    <div className="w-80 bg-white border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-6">
        <h2 className="text-xl font-bold mb-6">Collections</h2>
        
        {/* All Products Option */}
        <button
          onClick={() => handleCollectionSelect('all')}
          className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
            selectedCollectionId === 'all'
              ? 'bg-purple-100 text-purple-700 border-l-4 border-purple-500'
              : 'hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center">
            <span className="text-xl mr-3">🎪</span>
            <div>
              <div className="font-medium">All Products</div>
              <div className="text-sm text-muted-foreground">
                {products.length} items
              </div>
            </div>
          </div>
        </button>

        {/* Collections List */}
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="mx-auto h-8 w-8 text-muted-foreground animate-spin mb-2" />
            <p className="text-sm text-muted-foreground">Loading collections...</p>
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-2">No collections found</p>
            <button 
              onClick={loadData}
              className="text-purple-600 hover:underline text-sm"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {collections.map((collection) => {
              const productCount = products.filter(p => p.product_group_id === collection.id).length;
              return (
                <button
                  key={collection.id}
                  onClick={() => handleCollectionSelect(collection.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedCollectionId === collection.id
                      ? 'bg-purple-100 text-purple-700 border-l-4 border-purple-500'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="text-xl mr-3">{getCollectionIcon(collection.name)}</span>
                    <div className="flex-1">
                      <div className="font-medium">{collection.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {productCount} items
                      </div>
                    </div>
                    {collection.image && (
                      <img
                        src={collection.image}
                        alt={collection.name}
                        className="w-10 h-10 rounded-lg object-cover ml-2"
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-purple-600 to-green-500 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              {currentCollectionName}
            </h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto">
              {selectedCollectionId === 'all' 
                ? 'Discover our complete collection of costumes, perfect for every occasion and celebration'
                : `Explore our ${currentCollectionName.toLowerCase()} collection`
              }
            </p>
          </div>
        </div>
      </section>

      <div className="flex">
        {/* Mobile Sidebar Toggle */}
        <div className="lg:hidden fixed top-20 left-4 z-50">
          <Button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            variant="outline"
            size="sm"
            className="bg-white shadow-lg"
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Sidebar */}
        <div className={`
          fixed inset-y-0 left-0 z-40 lg:relative lg:block
          ${sidebarOpen ? 'block' : 'hidden lg:block'}
        `}>
          <Sidebar />
        </div>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 min-h-screen">
          {/* Controls */}
          <section className="bg-white border-b">
            <div className="px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
                {/* Search */}
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Sort and View Mode */}
                <div className="flex gap-4 items-center">
                  <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                      <SelectItem value="rating">Rating</SelectItem>
                      <SelectItem value="newest">Newest</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex border rounded-md">
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
                </div>
              </div>

              {/* Results Summary */}
              <div className="mt-4 flex justify-between items-center text-sm text-muted-foreground">
                <span>
                  Showing {filteredAndSortedProducts.length} of {products.length} products
                </span>
                {loading && (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Loading products...
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Products Grid */}
          <section className="p-4 sm:p-6 lg:p-8">
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="mx-auto h-12 w-12 text-muted-foreground animate-spin mb-4" />
                <p className="text-muted-foreground">Loading products from Booqable...</p>
              </div>
            ) : filteredAndSortedProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {products.length === 0 ? 'No products found in your Booqable account.' : 'No products match your filters.'}
                </p>
                {products.length === 0 && (
                  <Button onClick={loadData} variant="outline">
                    Try again
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredAndSortedProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
