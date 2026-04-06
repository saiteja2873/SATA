import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import santorini from "@assets/generated_images/Santorini_Greece_attraction_2db60e3b.png";
import heroBeach from "@assets/generated_images/Hero_beach_destination_panorama_c0b7d71f.png";
import eiffelTower from "@assets/generated_images/Eiffel_Tower_attraction_photo_976726da.png";
import machuPicchu from "@assets/generated_images/Machu_Picchu_attraction_photo_668a9cd9.png";
import tajMahal from "@assets/generated_images/Taj_Mahal_attraction_photo_6e604541.png";

const slides = [
  { src: heroBeach, alt: "Tropical beach destination", caption: "Discover Stunning Beaches" },
  { src: tajMahal, alt: "Taj Mahal, India", caption: "Explore Iconic Landmarks" },
  { src: santorini, alt: "Santorini, Greece", caption: "Wander Through Beautiful Cities" },
  { src: machuPicchu, alt: "Machu Picchu, Peru", caption: "Uncover Ancient Wonders" },
  { src: eiffelTower, alt: "Eiffel Tower, Paris", caption: "Experience World-Class Attractions" },
];

export default function HeroSection() {
  const [current, setCurrent] = useState(0);
  const [, navigate] = useLocation();

  const next = useCallback(() => setCurrent((i) => (i + 1) % slides.length), []);
  const prev = useCallback(() => setCurrent((i) => (i - 1 + slides.length) % slides.length), []);

  // Auto-advance every 5 seconds
  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <div className="relative h-[85vh] w-full overflow-hidden rounded-xl">
      {/* Carousel images */}
      {slides.map((slide, idx) => (
        <img
          key={idx}
          src={slide.src}
          alt={slide.alt}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
            idx === current ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-3">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`h-3 cursor-pointer rounded-full transition-all hover:bg-white/80 ${
              idx === current ? "w-9 bg-white" : "w-3 bg-white/50"
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
        <h1 className="mb-4 font-accent text-5xl font-bold text-white md:text-6xl">
          Plan Your Smart Journey
        </h1>
        <p className="mb-4 text-xl font-medium text-white/90 transition-opacity duration-700">
          {slides[current].caption}
        </p>
        <p className="mb-8 max-w-2xl text-lg text-white/80">
          Travel insights with crowd forecasting, optimized routes, and cultural recommendations
        </p>

        <Button
          size="lg"
          onClick={() => navigate("/recommendations")}
          className="h-12 px-10 text-base backdrop-blur-sm"
          data-testid="button-cta"
        >
          Explore Recommendations
        </Button>
      </div>
    </div>
  );
}
