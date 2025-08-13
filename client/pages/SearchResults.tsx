import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, SortAsc, Grid, List, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { ProductSection } from '../components/ProductSection';
import { booqableAPI, type Product } from '../lib/booqable';
import { toast } from 'sonner';

interface SearchProduct {
  id: string;
  name: string;
  image: string;
  price: number;
  category: string;
  available: boolean;
  stock_quantity: number;
  description: string;
  rating: number;
  reviewCount: number;
}

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(query);
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'category'>('name');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (query) {
      searchProducts(query);
    }
  }, [query]);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, sortBy, filterCategory]);

  const searchProducts = async (searchQuery: string) => {
    try {
      setLoading(true);
      const allProducts = await booqableAPI.getProducts();
      
      // Filter products based on search query
      const matchingProducts = allProducts.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Convert to SearchProduct interface
      const searchProducts: SearchProduct[] = matchingProducts.map(product => ({
        id: product.id,
        name: product.name,
        image: product.images[0] || 'https://images.unsplash.com/photo-1583196344000-916dd2b51a79?w=400&h=500&fit=crop',
        price: product.price_per_day,
        category: product.category,
        available: product.available,
        stock_quantity: product.stock_quantity,
        description: product.description,
        rating: 4.2 + Math.random() * 0.8, // Simulate rating
        reviewCount: Math.floor(Math.random() * 200) + 10 // Simulate reviews
      }));

      setProducts(searchProducts);
      
      // Extract unique categories for filter
      const uniqueCategories = [...new Set(searchProducts.map(p => p.category))];
      setCategories(uniqueCategories);
      
      console.log(`Found ${searchProducts.length} products matching "${searchQuery}"`);
    } catch (error) {
      console.error('Error searching products:', error);
      toast.error('Failed to search products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortProducts = () => {
    let filtered = [...products];

    // Filter by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter(product => product.category === filterCategory);
    }

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return a.price - b.price;
        case 'category':
          return a.category.localeCompare(b.category);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    setFilteredProducts(filtered);
  };

  const handleNewSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setSearchParams({ q: searchTerm.trim() });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Search Header */}
      <div className="bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Search Results
            </h1>
            {query && (
              <p className="text-muted-foreground">
                Showing results for "{query}"
              </p>
            )}
          </div>

          {/* Search Form */}
          <form onSubmit={handleNewSearch} className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                type="text"
                placeholder="Search for costumes, themes, occasions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 text-lg border-2 border-gray-200 rounded-full focus:border-brand-purple"
              />
              <Button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-brand-purple hover:bg-brand-purple-dark rounded-full px-6"
              >
                Search
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Results Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="mx-auto h-12 w-12 text-muted-foreground animate-spin mb-4" />
            <p className="text-muted-foreground">Searching products...</p>
          </div>
        ) : (
          <>
            {/* Results Summary and Filters */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
              <div className="mb-4 md:mb-0">
                <h2 className="text-xl font-semibold text-foreground">
                  {filteredProducts.length} {filteredProducts.length === 1 ? 'result' : 'results'} found
                </h2>
                {filterCategory !== 'all' && (
                  <p className="text-sm text-muted-foreground">
                    in {filterCategory} category
                  </p>
                )}
              </div>

              {/* Filters and Sort */}
              <div className="flex gap-4">
                {/* Category Filter */}
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-purple focus:border-transparent"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'price' | 'category')}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-purple focus:border-transparent"
                >
                  <option value="name">Sort by Name</option>
                  <option value="price">Sort by Price</option>
                  <option value="category">Sort by Category</option>
                </select>
              </div>
            </div>

            {/* Results Grid */}
            {filteredProducts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No results found</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your search terms or browse our categories
                  </p>
                  <Button asChild>
                    <a href="/">Browse All Products</a>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-[3/4] relative">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3">
                        <Badge variant="outline" className="bg-white">
                          {product.category}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
                        {product.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {product.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-lg font-bold text-brand-purple">
                            £{product.price}/day
                          </p>
                          <p className={`text-xs ${product.available ? 'text-green-600' : 'text-red-500'}`}>
                            {product.available ? `In Stock (${product.stock_quantity})` : 'Out of Stock'}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          disabled={!product.available}
                          className="bg-brand-purple hover:bg-brand-purple-dark"
                        >
                          Add to Cart
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Related/Suggested Products */}
      {!loading && products.length > 0 && (
        <div className="bg-gray-50">
          <ProductSection sectionType="featured" />
        </div>
      )}
    </div>
  );
}
