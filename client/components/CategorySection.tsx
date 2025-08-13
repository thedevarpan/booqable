import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { booqableAPI, type ProductGroup } from '../lib/booqable';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  image: string;
  icon: string;
  itemCount: number;
  featured?: boolean;
  slug: string;
}

// Icon mapping for different category types
const getIconForCategory = (name: string): string => {
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
  return '🎪'; // Default costume icon
};

// Default image mapping
const getImageForCategory = (name: string): string => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('wedding') || lowerName.includes('bridal')) return 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&h=300&fit=crop';
  if (lowerName.includes('party') || lowerName.includes('celebration')) return 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=300&fit=crop';
  if (lowerName.includes('kids') || lowerName.includes('children')) return 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop';
  if (lowerName.includes('dance') || lowerName.includes('ballet')) return 'https://images.unsplash.com/photo-1594736797933-d0e3b5ee0bf9?w=400&h=300&fit=crop';
  if (lowerName.includes('superhero') || lowerName.includes('hero')) return 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&h=300&fit=crop';
  if (lowerName.includes('cultural') || lowerName.includes('traditional')) return 'https://images.unsplash.com/photo-1524863479829-916d8e77f114?w=400&h=300&fit=crop';
  // Default costume image
  return 'https://images.unsplash.com/photo-1583196344000-916dd2b51a79?w=400&h=300&fit=crop';
};

export function CategorySection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const productGroups = await booqableAPI.getProductGroups();

      const categoryData: Category[] = productGroups.map((group, index) => ({
        id: group.id,
        name: group.name,
        slug: group.slug,
        image: group.image || getImageForCategory(group.name),
        icon: getIconForCategory(group.name),
        itemCount: group.product_count || 0,
        featured: index < 3, // Make first 3 categories featured
      }));

      setCategories(categoryData);
      console.log(`Loaded ${categoryData.length} categories from Booqable`);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load categories from Booqable');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const featuredCategories = categories.filter(cat => cat.featured);
  const otherCategories = categories.filter(cat => !cat.featured);

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Shop by Category
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover the perfect costume for every occasion, from weddings to parties, 
            kids' events to themed celebrations.
          </p>
        </div>

        {/* Featured Categories - Large Cards */}
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="mx-auto h-12 w-12 text-muted-foreground animate-spin mb-4" />
            <p className="text-muted-foreground">Loading categories from Booqable...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No categories found.</p>
            <button onClick={loadCategories} className="text-brand-purple hover:underline">Try again</button>
          </div>
        ) : (
          <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {featuredCategories.map((category) => (
            <Link
              key={category.id}
              to={`/category/${category.slug}`}
              className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <div className="aspect-[4/3] relative">
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                
                {/* Content Overlay */}
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <div className="text-center">
                    <div className="text-4xl mb-2">{category.icon}</div>
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                      {category.name}
                    </h3>
                    <p className="text-white/90 text-sm mb-4">
                      {category.itemCount}+ costumes available
                    </p>
                    <div className="inline-flex items-center text-brand-gold font-semibold group-hover:translate-x-1 transition-transform duration-300">
                      <span>Explore Collection</span>
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Other Categories - Compact Grid */}
        {otherCategories.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {otherCategories.map((category) => (
            <Link
              key={category.id}
              to={`/category/${category.slug}`}
              className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105 p-6 text-center"
            >
              <div className="mb-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-brand-purple-light to-brand-emerald-light flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
                  {category.icon}
                </div>
              </div>
              <h3 className="font-semibold text-foreground mb-2 text-sm md:text-base">
                {category.name}
              </h3>
              <p className="text-xs text-muted-foreground">
                {category.itemCount} items
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
            to="/categories"
            className="inline-flex items-center px-8 py-3 bg-brand-purple text-white font-semibold rounded-full hover:bg-brand-purple-dark transition-colors duration-300"
          >
            View All Categories
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
