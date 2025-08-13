import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { booqableAPI, type ProductGroup } from '../lib/booqable';
import { toast } from 'sonner';

interface Collection {
  id: string;
  name: string;
  image: string;
  icon: string;
  itemCount: number;
  featured?: boolean;
  slug: string;
  description?: string;
}

// Icon mapping for different collection types
const getIconForCollection = (name: string): string => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('wedding') || lowerName.includes('bridal')) return '💍';
  if (lowerName.includes('party') || lowerName.includes('celebration')) return '🎉';
  if (lowerName.includes('kids') || lowerName.includes('children') || lowerName.includes('child')) return '👶';
  if (lowerName.includes('theme') || lowerName.includes('costume')) return '🎭';
  if (lowerName.includes('historical') || lowerName.includes('medieval') || lowerName.includes('vintage')) return '🏺';
  if (lowerName.includes('superhero') || lowerName.includes('hero') || lowerName.includes('comic')) return '🦸';
  if (lowerName.includes('halloween') || lowerName.includes('scary') || lowerName.includes('horror')) return '🎃';
  if (lowerName.includes('cultural') || lowerName.includes('traditional') || lowerName.includes('ethnic')) return '🌍';
  if (lowerName.includes('dance') || lowerName.includes('ballet') || lowerName.includes('performance')) return '💃';
  if (lowerName.includes('fantasy') || lowerName.includes('fairy') || lowerName.includes('magical')) return '🧚';
  if (lowerName.includes('formal') || lowerName.includes('elegant') || lowerName.includes('gown')) return '👗';
  if (lowerName.includes('casual') || lowerName.includes('everyday')) return '👕';
  if (lowerName.includes('accessories') || lowerName.includes('jewelry')) return '💎';
  if (lowerName.includes('top') || lowerName.includes('shirt') || lowerName.includes('blouse')) return '👕';
  if (lowerName.includes('dress') || lowerName.includes('gown')) return '👗';
  if (lowerName.includes('skirt') || lowerName.includes('bottom')) return '👜';
  return '🎪'; // Default costume icon
};

// Default image mapping
const getImageForCollection = (name: string): string => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('wedding') || lowerName.includes('bridal')) return 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&h=300&fit=crop';
  if (lowerName.includes('party') || lowerName.includes('celebration')) return 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=300&fit=crop';
  if (lowerName.includes('kids') || lowerName.includes('children')) return 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop';
  if (lowerName.includes('dance') || lowerName.includes('ballet')) return 'https://images.unsplash.com/photo-1594736797933-d0e3b5ee0bf9?w=400&h=300&fit=crop';
  if (lowerName.includes('superhero') || lowerName.includes('hero')) return 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&h=300&fit=crop';
  if (lowerName.includes('cultural') || lowerName.includes('traditional')) return 'https://images.unsplash.com/photo-1524863479829-916d8e77f114?w=400&h=300&fit=crop';
  if (lowerName.includes('top') || lowerName.includes('shirt')) return 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=300&fit=crop';
  if (lowerName.includes('dress') || lowerName.includes('gown')) return 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=400&h=300&fit=crop';
  // Default costume image
  return 'https://images.unsplash.com/photo-1583196344000-916dd2b51a79?w=400&h=300&fit=crop';
};

export function CollectionSection() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      setLoading(true);
      console.log('Loading collections from Booqable API...');
      
      const productGroups = await booqableAPI.getProductGroups();
      console.log('Raw product groups response:', productGroups);

      const collectionData: Collection[] = productGroups.map((group, index) => ({
        id: group.id,
        name: group.name,
        slug: group.slug,
        description: group.description,
        image: group.image || getImageForCollection(group.name),
        icon: getIconForCollection(group.name),
        itemCount: group.product_count || 0,
        featured: index < 3, // Make first 3 collections featured
      }));

      setCollections(collectionData);
      console.log(`Successfully loaded ${collectionData.length} collections from Booqable`);
      
      if (collectionData.length === 0) {
        toast.info('No collections found in your Booqable account');
      }
    } catch (error) {
      console.error('Error loading collections:', error);
      toast.error('Failed to load collections from Booqable API');
      
      // Keep empty array on error - don't show demo data
      setCollections([]);
    } finally {
      setLoading(false);
    }
  };

  const featuredCollections = collections.filter(col => col.featured);
  const otherCollections = collections.filter(col => !col.featured);

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Browse Collections
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore our carefully curated collections of costumes for every occasion, 
            from weddings to parties, kids' events to themed celebrations.
          </p>
        </div>

        {/* Featured Collections - Large Cards */}
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="mx-auto h-12 w-12 text-muted-foreground animate-spin mb-4" />
            <p className="text-muted-foreground">Loading collections from Booqable...</p>
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No collections found in your Booqable account.</p>
            <button onClick={loadCollections} className="text-purple-600 hover:underline">Try again</button>
          </div>
        ) : (
          <>
            {featuredCollections.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                {featuredCollections.map((collection) => (
                  <Link
                    key={collection.id}
                    to={`/products?collection=${collection.slug}`}
                    className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  >
                    <div className="aspect-[4/3] relative">
                      <img
                        src={collection.image}
                        alt={collection.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      
                      {/* Content Overlay */}
                      <div className="absolute inset-0 flex flex-col justify-end p-6">
                        <div className="text-center">
                          <div className="text-4xl mb-2">{collection.icon}</div>
                          <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                            {collection.name}
                          </h3>
                          <p className="text-white/90 text-sm mb-4">
                            {collection.itemCount} costumes available
                          </p>
                          <div className="inline-flex items-center text-yellow-400 font-semibold group-hover:translate-x-1 transition-transform duration-300">
                            <span>Explore Collection</span>
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Other Collections - Compact Grid */}
            {otherCollections.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {otherCollections.map((collection) => (
                  <Link
                    key={collection.id}
                    to={`/products?collection=${collection.slug}`}
                    className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105 p-6 text-center"
                  >
                    <div className="mb-4">
                      <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-100 to-green-100 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
                        {collection.icon}
                      </div>
                    </div>
                    <h3 className="font-semibold text-foreground mb-2 text-sm md:text-base">
                      {collection.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {collection.itemCount} items
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* Call to Action */}
        <div className="text-center mt-12">
          <Link
            to="/products"
            className="inline-flex items-center px-8 py-3 bg-purple-600 text-white font-semibold rounded-full hover:bg-purple-700 transition-colors duration-300"
          >
            View All Products
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
