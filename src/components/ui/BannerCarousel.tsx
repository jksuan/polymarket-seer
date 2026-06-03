'use client';

import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { motion } from 'motion/react';
import { Sparkles, Trophy, Flame } from 'lucide-react';

const bannerData = [
  {
    id: 1,
    title: 'WORLD CUP 2026',
    subtitle: 'PREDICT THE CHAMPION 🇺🇸🇲🇽🇨🇦',
    tag: 'HOT',
    color1: '#FFD700',
    color2: '#FF8C00',
    icon: <Trophy size={18} color="#FFD700" />,
    image: '/images/worldcup.png',
  },
  {
    id: 2,
    title: 'GROUP STAGE',
    subtitle: '48 TEAMS · 12 GROUPS · WHO SURVIVES?',
    tag: 'LIVE',
    color1: '#00F0FF',
    color2: '#007AFF',
    icon: <Sparkles size={18} color="#00F0FF" />,
    image: '/images/worldcup.png',
  },
  {
    id: 3,
    title: 'GOLDEN BOOT',
    subtitle: 'WHO SCORES THE MOST? BET NOW',
    tag: 'TRENDING',
    color1: '#ADFF2F',
    color2: '#00FF00',
    icon: <Flame size={18} color="#ADFF2F" />,
    image: '/images/worldcup2.png',
  },
];

export function BannerCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi, setSelectedIndex]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);

    const autoplay = setInterval(() => {
      if (emblaApi.canScrollNext()) {
        emblaApi.scrollNext();
      } else {
        emblaApi.scrollTo(0);
      }
    }, 4000);

    return () => clearInterval(autoplay);
  }, [emblaApi, onSelect]);

  return (
    <div className="relative mb-2 mx-auto w-full max-w-md overflow-hidden" ref={emblaRef}>
      <div className="flex" style={{ touchAction: 'pan-y' }}>
        {bannerData.map((banner, index) => (
          <div
            key={banner.id}
            style={{ 
              flex: '0 0 100%', 
              minWidth: 0, 
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="relative px-4 py-8 overflow-hidden h-56 flex flex-col justify-end"
              style={{
                backgroundColor: '#0D0518',
                backgroundImage: `linear-gradient(to top, rgba(13,5,24,1) 0%, rgba(13,5,24,0.6) 30%, rgba(13,5,24,0) 60%), url(${banner.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            >
              <div className="relative z-10 space-y-1 mb-2">
                <h3
                  className="leading-tight"
                  style={{
                    fontFamily: 'Inter',
                    fontWeight: 900,
                    fontSize: '22px',
                    color: '#FFF',
                    textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                    letterSpacing: '-0.5px',
                  }}
                >
                  {banner.title}
                </h3>
                <p
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.8)',
                    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                  }}
                >
                  {banner.subtitle}
                </p>
              </div>
            </motion.div>
          </div>
        ))}
      </div>
      
      {/* Indicators */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-20">
        {bannerData.map((_, i) => (
          <div
            key={i}
            className="transition-all duration-300"
            style={{
              width: selectedIndex === i ? '16px' : '4px',
              height: '4px',
              borderRadius: '2px',
              background: selectedIndex === i ? '#00F0FF' : 'rgba(255,255,255,0.2)',
              boxShadow: selectedIndex === i ? '0 0 8px #00F0FF' : 'none',
            }}
          />
        ))}
      </div>
    </div>
  );
}
