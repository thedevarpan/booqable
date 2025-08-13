import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface HeroSlide {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  cta: string;
  ctaLink: string;
  badge?: string;
}

const heroSlides: HeroSlide[] = [
  {
    id: 1,
    title: "Wedding Season Special",
    subtitle: "Up to 50% OFF",
    description: "Stunning bridal & groom costumes for your perfect day",
    image: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&h=600&fit=crop",
    cta: "Shop Wedding Collection",
    ctaLink: "/category/wedding-costumes",
    badge: "Limited Time",
  },
  {
    id: 2,
    title: "Halloween Collection",
    subtitle: "Spooky & Fun",
    description: "From scary to cute - find your perfect Halloween costume",
    image: "https://images.unsplash.com/photo-1509557965043-3b16baaf2f58?w=800&h=600&fit=crop",
    cta: "Explore Halloween",
    ctaLink: "/category/halloween-costumes",
    badge: "New Arrivals",
  },
  {
    id: 3,
    title: "Kids Party Favorites",
    subtitle: "Starting £299/day",
    description: "Superhero, princess, and character costumes your kids will love",
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop",
    cta: "Shop Kids Costumes",
    ctaLink: "/category/kids-costumes",
    badge: "Best Sellers",
  },
];

export function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToPrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  return (
    <section className="relative w-full h-[500px] md:h-[600px] overflow-hidden">
      {/* Slider Container */}
      <div className="relative w-full h-full">
        {heroSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-700 ease-in-out",
              index === currentSlide ? "opacity-100" : "opacity-0"
            )}
          >
            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${slide.image})` }}
            >
              <div className="absolute inset-0 bg-black/40" />
            </div>

            {/* Content */}
            <div className="relative z-10 h-full flex items-center">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className="max-w-2xl">
                  {slide.badge && (
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-brand-gold text-white mb-4">
                      <Star className="w-3 h-3 mr-1" />
                      {slide.badge}
                    </div>
                  )}
                  
                  <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight">
                    {slide.title}
                  </h1>
                  
                  <p className="text-xl md:text-2xl text-brand-gold font-semibold mb-4">
                    {slide.subtitle}
                  </p>
                  
                  <p className="text-lg text-white/90 mb-8 max-w-lg">
                    {slide.description}
                  </p>
                  
                  <Button
                    size="lg"
                    className="bg-brand-purple hover:bg-brand-purple-dark text-white px-8 py-3 text-lg font-semibold rounded-full transition-all duration-300 transform hover:scale-105"
                    onClick={() => window.location.href = slide.ctaLink}
                  >
                    {slide.cta}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={goToPrevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all duration-300"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        onClick={goToNextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all duration-300"
        aria-label="Next slide"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
        {heroSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={cn(
              "w-3 h-3 rounded-full transition-all duration-300",
              index === currentSlide
                ? "bg-brand-gold scale-110"
                : "bg-white/50 hover:bg-white/70"
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Promotional Banner */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-brand-emerald to-brand-emerald-dark text-white py-3 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center text-center space-y-2 sm:space-y-0 sm:space-x-6">
            <div className="flex items-center space-x-2">
              <Star className="w-4 h-4 text-brand-gold" />
              <span className="font-semibold">5000+ Happy Customers</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-white/30" />
            <div className="flex items-center space-x-2">
              <span className="font-semibold">Same Day Delivery Available</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-white/30" />
            <div className="flex items-center space-x-2">
              <span className="font-semibold">Easy Returns & Exchanges</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
