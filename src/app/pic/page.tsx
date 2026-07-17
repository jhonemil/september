/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabaseClient, subscribeToLayoutChange } from '@/lib/supabase';
import { fetchBgMusic, fetchCarouselImages, fetchActiveLayout, saveActivityLog } from '@/app/actions';

interface CarouselImage {
  id: string | number;
  image_url: string;
  caption?: string;
  created_at?: string;
  sort_order?: number | null;
}

export default function PicPage() {
  const [allImages, setAllImages] = useState<CarouselImage[]>([]);
  const [activeLayout, setActiveLayoutState] = useState<number>(3); // Default layout initially
  const [isPlayingMusic, setIsPlayingMusic] = useState<boolean>(false);
  const [isAutoplayActive, setIsAutoplayActive] = useState<boolean>(false);
  const [musicUrl, setMusicUrl] = useState<string>('');
  const [activeDateText, setActiveDateText] = useState<string>('');
  const [isDateVisible, setIsDateVisible] = useState<boolean>(false);

  // Pull-to-refresh state
  const [pullText, setPullText] = useState<string>('Pull to refresh...');
  const [pullStyle, setPullStyle] = useState<React.CSSProperties>({ top: '-80px' });
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Refs for tracking DOM elements & interactive variables
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const carouselContainerRef = useRef<HTMLDivElement | null>(null);
  const cursor1Ref = useRef<HTMLDivElement | null>(null);
  const cursor2Ref = useRef<HTMLDivElement | null>(null);
  const autoplayIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = async () => {
    // Log visit
    saveActivityLog('Page Visit', 'Carousel Page').catch(err => {
      console.error("saveActivityLog 'Page Visit' failed:", err);
    });

    // Fetch Music
    try {
      const music = await fetchBgMusic();
      if (music) {
        setMusicUrl(music);
      }
    } catch (err) {
      console.error("Error fetching background music:", err);
    }

    // Fetch Images
    try {
      const imagesData = await fetchCarouselImages();
      if (imagesData && imagesData.length > 0) {
        setAllImages(imagesData);
      }
    } catch (err) {
      console.error("Error fetching carousel images:", err);
    }

    // Fetch active layout settings
    try {
      const initialLayout = await fetchActiveLayout();
      setActiveLayoutState(initialLayout);
    } catch (err) {
      console.error("Error fetching active layout:", err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);

    // Listen to real-time database changes
    const channel = subscribeToLayoutChange((newLayoutId) => {
      console.log("Database updated layout to:", newLayoutId);
      setActiveLayoutState(newLayoutId);
    });

    // Custom cursor trail handler
    const handleMouseMove = (e: MouseEvent) => {
      if (cursor1Ref.current && cursor2Ref.current) {
        const x = e.clientX;
        const y = e.clientY;
        cursor1Ref.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        cursor2Ref.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
    };
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', handleMouseMove);
      if (channel) supabaseClient.removeChannel(channel);
      if (autoplayIntervalRef.current) clearInterval(autoplayIntervalRef.current);
    };
  }, []);

  // Update audio element src when musicUrl changes
  useEffect(() => {
    if (audioRef.current && musicUrl) {
      audioRef.current.src = musicUrl;
      audioRef.current.load();
      if (isPlayingMusic) {
        audioRef.current.play().catch(e => console.log("Audio play blocked by browser:", e));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicUrl]);

  // Autoplay Trigger: swipes next
  const triggerAutoSwipe = useRef<() => void>(() => {});

  useEffect(() => {
    if (isAutoplayActive) {
      autoplayIntervalRef.current = setInterval(() => {
        if (triggerAutoSwipe.current) {
          triggerAutoSwipe.current();
        }
      }, 3000);
    } else {
      if (autoplayIntervalRef.current) {
        clearInterval(autoplayIntervalRef.current);
        autoplayIntervalRef.current = null;
      }
    }
    return () => {
      if (autoplayIntervalRef.current) {
        clearInterval(autoplayIntervalRef.current);
      }
    };
  }, [isAutoplayActive, allImages, activeLayout]);

  const toggleMusic = () => {
    if (!audioRef.current) return;
    if (isPlayingMusic) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => console.error("Play failed:", err));
    }
    setIsPlayingMusic(!isPlayingMusic);
    saveActivityLog('Music Toggle', isPlayingMusic ? 'Pause Music' : 'Play Music');
  };

  const toggleAutoplay = () => {
    setIsAutoplayActive(!isAutoplayActive);
    saveActivityLog('Autoplay Toggle', !isAutoplayActive ? 'Enable Autoplay' : 'Disable Autoplay');
  };

  // Pull-to-refresh listener
  useEffect(() => {
    let startY = 0;
    let currentY = 0;
    let isPulling = false;

    const handleTouchStart = (e: TouchEvent) => {
      // Only allow pull-to-refresh if we are at the top of the window
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        isPulling = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling) return;
      currentY = e.touches[0].clientY;
      const pullDist = currentY - startY;

      if (pullDist > 0) {
        // Drag limit factor
        const cappedDist = Math.min(pullDist * 0.4, 90);
        setPullStyle({ top: `${cappedDist - 80}px`, transform: `rotate(${pullDist * 1.5}deg)` });
        
        if (pullDist > 150) {
          setPullText('Release to refresh...');
        } else {
          setPullText('Pull to refresh...');
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling) return;
      isPulling = false;
      const pullDist = currentY - startY;

      if (pullDist > 150 && !isRefreshing) {
        setIsRefreshing(true);
        setPullText('Refreshing...');
        setPullStyle({ top: '20px' });
        
        // Reload data
        await loadData();
        
        setTimeout(() => {
          setIsRefreshing(false);
          setPullText('Pull to refresh...');
          setPullStyle({ top: '-80px' });
        }, 1000);
      } else {
        setPullStyle({ top: '-80px' });
      }
      startY = 0;
      currentY = 0;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isRefreshing]);

  // Helper to format date display
  const updateDateDisplay = (created_at: string | undefined) => {
    if (created_at) {
      const date = new Date(created_at);
      setActiveDateText(
        date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      );
      setIsDateVisible(true);
    } else {
      setIsDateVisible(false);
    }
  };

  // ----------------------------------------------------
  // LAYOUT RENDERER LOGIC
  // ----------------------------------------------------
  
  // Render Polaroid Stack Layout (Layout 1)
  const renderPolaroidStack = () => {
    return <PolaroidStackLayout images={allImages} updateDateDisplay={updateDateDisplay} triggerAutoSwipeRef={triggerAutoSwipe} />;
  };

  // Render Filmstrip Layout (Layout 2)
  const renderFilmstrip = () => {
    return <FilmstripLayout images={allImages} updateDateDisplay={updateDateDisplay} triggerAutoSwipeRef={triggerAutoSwipe} />;
  };

  // Render Cylinder Layout (Layout 3)
  const renderCylinder = () => {
    return <CylinderLayout images={allImages} updateDateDisplay={updateDateDisplay} triggerAutoSwipeRef={triggerAutoSwipe} />;
  };

  // Render Circular Fallback Layout (Layout 4)
  const renderCircular = () => {
    return <CircularLayout images={allImages} updateDateDisplay={updateDateDisplay} triggerAutoSwipeRef={triggerAutoSwipe} />;
  };

  return (
    <div className="pic-body">
      {/* Bokeh Background */}
      <div className="bokeh-background">
        <span></span><span></span><span></span><span></span>
        <span></span><span></span><span></span><span></span>
      </div>

      {/* Pull to Refresh Indicator */}
      <div className={`pull-indicator ${isRefreshing ? 'refreshing' : ''}`} style={pullStyle}>
        <span className="pull-icon">⬇️</span>
        <span className="pull-text">{pullText}</span>
      </div>

      {/* Gallery Wrapper */}
      <div 
        ref={carouselContainerRef}
        className={`gallery-wrapper ${
          activeLayout === 1
            ? 'layout-polaroid-stack'
            : activeLayout === 2
            ? 'layout-filmstrip'
            : activeLayout === 3
            ? 'layout-cylinder'
            : 'layout-circular'
        }`}
      >
        {/* Date Display */}
        <div className={`active-date-display ${isDateVisible ? 'visible' : ''}`}>
          {activeDateText}
        </div>

        {/* Carousel Container */}
        <div className="carousel">
          {allImages.length > 0 && (
            <>
              {activeLayout === 1 && renderPolaroidStack()}
              {activeLayout === 2 && renderFilmstrip()}
              {activeLayout === 3 && renderCylinder()}
              {activeLayout !== 1 && activeLayout !== 2 && activeLayout !== 3 && renderCircular()}
            </>
          )}
        </div>
      </div>

      {/* Floating Controls */}
      <div className="controls-panel">
        <div 
          onClick={toggleAutoplay} 
          className={`control-btn pulse ${isAutoplayActive ? 'active-state' : ''}`} 
          title="Auto Play"
        >
          <span className="control-icon">{isAutoplayActive ? '⏸️' : '▶️'}</span>
        </div>
        <div 
          onClick={toggleMusic} 
          className={`control-btn pulse ${isPlayingMusic ? 'active-state' : ''}`} 
          title="Play Music"
        >
          <span className="control-icon">🎵</span>
        </div>
      </div>

      {/* Audio Element */}
      <audio ref={audioRef} loop />

      {/* Custom Cursor Trail */}
      <div ref={cursor1Ref} className="cursor"></div>
      <div ref={cursor2Ref} className="cursor cursor2"></div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SUB-LAYOUT COMPONENTS WITH DRAGGING LOGIC
// ----------------------------------------------------------------------

interface LayoutProps {
  images: CarouselImage[];
  updateDateDisplay: (created_at: string | undefined) => void;
  triggerAutoSwipeRef: React.MutableRefObject<() => void>;
}

// 1. Polaroid Stack Layout (Tinder style)
function PolaroidStackLayout({ images, updateDateDisplay, triggerAutoSwipeRef }: LayoutProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const activeCardRef = useRef<HTMLDivElement | null>(null);

  const swipeNext = () => {
    const topCard = activeCardRef.current;
    if (!topCard) return;

    topCard.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.6s';
    topCard.style.transform = `translate(-${window.innerWidth}px, 40px) rotate(-12deg)`;
    topCard.style.opacity = '0';

    setTimeout(() => {
      setActiveIndex(prev => (prev + 1) % images.length);
    }, 400);
  };

  useEffect(() => {
    triggerAutoSwipeRef.current = swipeNext;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images, activeIndex]);

  useEffect(() => {
    if (images[activeIndex]) {
      updateDateDisplay(images[activeIndex].created_at);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, images]);

  const handleStart = (clientX: number, clientY: number) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: clientX, y: clientY };
    if (activeCardRef.current) {
      activeCardRef.current.style.transition = 'none';
    }
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDraggingRef.current || !activeCardRef.current) return;
    const currentX = clientX - dragStartRef.current.x;
    const currentY = clientY - dragStartRef.current.y;
    const rotation = currentX * 0.08;
    activeCardRef.current.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${rotation}deg)`;
  };

  const handleEnd = (clientX: number, clientY: number) => {
    if (!isDraggingRef.current || !activeCardRef.current) return;
    isDraggingRef.current = false;
    const currentX = clientX - dragStartRef.current.x;
    const currentY = clientY - dragStartRef.current.y;

    const threshold = 120;
    activeCardRef.current.style.transition = 'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.35s';

    if (Math.abs(currentX) > threshold || Math.abs(currentY) > threshold) {
      const throwX = currentX > 0 ? window.innerWidth : -window.innerWidth;
      const throwY = currentY * 1.5;
      activeCardRef.current.style.transform = `translate(${throwX}px, ${throwY}px) rotate(${currentX * 0.1}deg)`;
      activeCardRef.current.style.opacity = '0';

      setTimeout(() => {
        setActiveIndex(prev => (prev + 1) % images.length);
      }, 300);
    } else {
      activeCardRef.current.style.transform = 'translate(0, 0) scale(1) rotate(0deg)';
    }
  };

  // Render 3 virtualized cards in the stack
  const visibleCards = [];
  const cardsToRender = Math.min(images.length, 3);
  for (let i = 0; i < cardsToRender; i++) {
    const idx = (activeIndex + i) % images.length;
    visibleCards.push({ data: images[idx], offsetIndex: i });
  }

  return (
    <>
      {visibleCards.reverse().map(({ data, offsetIndex }) => {
        const isFront = offsetIndex === 0;
        
        let cardStyle: React.CSSProperties = {};
        if (isFront) {
          cardStyle = {
            zIndex: 100,
            transform: 'translate(0, 0) scale(1) rotate(0deg)',
            opacity: 1,
            pointerEvents: 'auto',
          };
        } else if (offsetIndex === 1) {
          cardStyle = {
            zIndex: 99,
            transform: 'translate(5px, 10px) scale(0.95) rotate(-3deg)',
            opacity: 0.9,
            pointerEvents: 'none',
          };
        } else {
          cardStyle = {
            zIndex: 98,
            transform: 'translate(-5px, 20px) scale(0.9) rotate(3deg)',
            opacity: 0.8,
            pointerEvents: 'none',
          };
        }

        return (
          <div
            key={data.id}
            ref={isFront ? activeCardRef : null}
            className="carousel-item"
            style={cardStyle}
            onMouseDown={isFront ? (e) => handleStart(e.clientX, e.clientY) : undefined}
            onMouseMove={isFront ? (e) => handleMove(e.clientX, e.clientY) : undefined}
            onMouseUp={isFront ? (e) => handleEnd(e.clientX, e.clientY) : undefined}
            onTouchStart={isFront ? (e) => handleStart(e.touches[0].clientX, e.touches[0].clientY) : undefined}
            onTouchMove={isFront ? (e) => handleMove(e.touches[0].clientX, e.touches[0].clientY) : undefined}
            onTouchEnd={isFront ? (e) => handleEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY) : undefined}
          >
            <div className="carousel-box">
              <img src={data.image_url} alt="" />
            </div>
            <div className="card-caption">{data.caption || ''}</div>
          </div>
        );
      })}
    </>
  );
}

// 2. Parallax Filmstrip Layout (Layout 2)
function FilmstripLayout({ images, updateDateDisplay, triggerAutoSwipeRef }: LayoutProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef(0);
  const isDraggingRef = useRef(false);
  const currentDragXRef = useRef(0);

  const cardWidth = 280;
  const gap = 30;

  const updateParallax = () => {
    if (!trackRef.current) return;
    const cards = trackRef.current.querySelectorAll('.carousel-item');
    const screenCenterX = window.innerWidth / 2;

    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const cardCenterX = rect.left + rect.width / 2;
      const parallaxOffset = (cardCenterX - screenCenterX) * -0.15;
      const img = card.querySelector('img');
      if (img) {
        img.style.transform = `translateX(${parallaxOffset}px) scale(1.15)`;
      }
    });
  };

  const swipeNext = () => {
    if (!trackRef.current) return;
    trackRef.current.style.transition = 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)';
    const shiftX = -(cardWidth + gap);
    trackRef.current.style.transform = `translate(calc(-50% + ${shiftX}px), -50%)`;

    setTimeout(() => {
      if (trackRef.current) trackRef.current.style.transition = 'none';
      setActiveIndex(prev => (prev + 1) % images.length);
      currentDragXRef.current = 0;
    }, 500);
  };

  useEffect(() => {
    triggerAutoSwipeRef.current = swipeNext;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images, activeIndex]);

  useEffect(() => {
    updateParallax();
    if (images[activeIndex]) {
      updateDateDisplay(images[activeIndex].created_at);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, images]);

  const handleStart = (clientX: number) => {
    isDraggingRef.current = true;
    dragStartRef.current = clientX;
    if (trackRef.current) {
      trackRef.current.style.transition = 'none';
    }
  };

  const handleMove = (clientX: number) => {
    if (!isDraggingRef.current || !trackRef.current) return;
    currentDragXRef.current = clientX - dragStartRef.current;
    trackRef.current.style.transform = `translate(calc(-50% + ${currentDragXRef.current}px), -50%)`;
    updateParallax();
  };

  const handleEnd = () => {
    if (!isDraggingRef.current || !trackRef.current) return;
    isDraggingRef.current = false;
    const currentDragX = currentDragXRef.current;

    trackRef.current.style.transition = 'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)';
    const swipeThreshold = 80;

    if (currentDragX < -swipeThreshold) {
      // Swipe left -> Next card
      const shiftX = -(cardWidth + gap);
      trackRef.current.style.transform = `translate(calc(-50% + ${shiftX}px), -50%)`;
      setTimeout(() => {
        if (trackRef.current) trackRef.current.style.transition = 'none';
        setActiveIndex(prev => (prev + 1) % images.length);
        currentDragXRef.current = 0;
      }, 400);
    } else if (currentDragX > swipeThreshold) {
      // Swipe right -> Prev card
      const shiftX = (cardWidth + gap);
      trackRef.current.style.transform = `translate(calc(-50% + ${shiftX}px), -50%)`;
      setTimeout(() => {
        if (trackRef.current) trackRef.current.style.transition = 'none';
        setActiveIndex(prev => ((prev - 1 + images.length) % images.length));
        currentDragXRef.current = 0;
      }, 400);
    } else {
      // Snap back
      trackRef.current.style.transform = 'translate(-50%, -50%)';
      currentDragXRef.current = 0;
      setTimeout(() => {
        updateParallax();
      }, 400);
    }
  };

  // Virtualized list of 5 cards around activeIndex
  const visibleCards = [];
  const range = 2;
  for (let i = -range; i <= range; i++) {
    const idx = ((activeIndex + i) % images.length + images.length) % images.length;
    visibleCards.push({ data: images[idx], offset: i });
  }

  return (
    <div
      className="filmstrip-track-wrapper"
      style={{ width: '100%', height: '100%', position: 'absolute', pointerEvents: 'auto' }}
      onMouseDown={(e) => handleStart(e.clientX)}
      onMouseMove={(e) => handleMove(e.clientX)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={(e) => handleStart(e.touches[0].clientX)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
      onTouchEnd={handleEnd}
    >
      <div 
        ref={trackRef} 
        className="filmstrip-track"
        style={{ transform: 'translate(-50%, -50%)' }}
      >
        {visibleCards.map(({ data, offset }) => {
          const isActive = offset === 0;
          return (
            <div
              key={`${data.id}-${offset}`}
              className={`carousel-item ${isActive ? 'active-card' : ''}`}
            >
              <div className="carousel-box">
                <img src={data.image_url} alt="" />
              </div>
              <div className="card-caption">{data.caption || ''}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 3. Cylinder 3D Layout (Layout 3)
function CylinderLayout({ images, updateDateDisplay, triggerAutoSwipeRef }: LayoutProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef(0);
  const isDraggingRef = useRef(false);
  const rotYRef = useRef(0);
  const lastXRef = useRef(0);
  const velocityYRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  
  // Use a selection of 16 images for the cylinder
  const cylinderImages = images.slice(0, 16);
  const N = cylinderImages.length || 1;
  const cardWidth = 240;
  const radius = Math.round((cardWidth / 2) / Math.tan(Math.PI / N));

  // Determine active card based on rotation
  const getActiveCardIdx = (rot: number) => {
    let normalizedRot = (-rot) % 360;
    if (normalizedRot < 0) normalizedRot += 360;
    const anglePerCard = 360 / N;
    return Math.round(normalizedRot / anglePerCard) % N;
  };

  const updateActiveCardClass = (rot: number) => {
    if (!trackRef.current) return;
    const idx = getActiveCardIdx(rot);
    const items = trackRef.current.querySelectorAll('.carousel-item');
    items.forEach((item, index) => {
      if (index === idx) {
        item.classList.add('active-card');
        updateDateDisplay(cylinderImages[index]?.created_at);
      } else {
        item.classList.remove('active-card');
      }
    });
  };

  const swipeNext = () => {
    const targetRotY = rotYRef.current - (360 / N);
    
    let startTime: number | null = null;
    const duration = 800;
    const startRotation = rotYRef.current;
    
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      
      rotYRef.current = startRotation + (targetRotY - startRotation) * ease;
      if (trackRef.current) {
        trackRef.current.style.transform = `translate3d(-50%, -50%, -120px) rotateY(${rotYRef.current}deg)`;
      }
      updateActiveCardClass(rotYRef.current);
      
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      }
    };
    
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    triggerAutoSwipeRef.current = swipeNext;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  useEffect(() => {
    // Slow auto rotation in background
    const interval = setInterval(() => {
      if (!isDraggingRef.current) {
        rotYRef.current -= 0.15;
        if (trackRef.current) {
          trackRef.current.style.transform = `translate3d(-50%, -50%, -120px) rotateY(${rotYRef.current}deg)`;
        }
        updateActiveCardClass(rotYRef.current);
      }
    }, 16);

    // Initial setting of active card class
    setTimeout(() => updateActiveCardClass(0), 100);

    return () => {
      clearInterval(interval);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  const handleStart = (clientX: number) => {
    isDraggingRef.current = true;
    dragStartRef.current = clientX;
    lastXRef.current = clientX;
    velocityYRef.current = 0;
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
  };

  const handleMove = (clientX: number) => {
    if (!isDraggingRef.current || !trackRef.current) return;
    
    // Smooth dragging modifier
    rotYRef.current = rotYRef.current + (clientX - lastXRef.current) * 0.25;
    velocityYRef.current = clientX - lastXRef.current;
    lastXRef.current = clientX;

    trackRef.current.style.transform = `translate3d(-50%, -50%, -120px) rotateY(${rotYRef.current}deg)`;
    updateActiveCardClass(rotYRef.current);
  };

  const handleEnd = () => {
    if (!isDraggingRef.current || !trackRef.current) return;
    isDraggingRef.current = false;

    // Apply inertia physics
    const physicsTick = () => {
      if (isDraggingRef.current) return;
      rotYRef.current += velocityYRef.current * 0.15;
      velocityYRef.current *= 0.92;

      if (trackRef.current) {
        trackRef.current.style.transform = `translate3d(-50%, -50%, -120px) rotateY(${rotYRef.current}deg)`;
      }
      updateActiveCardClass(rotYRef.current);

      if (Math.abs(velocityYRef.current) > 0.1) {
        animationFrameRef.current = requestAnimationFrame(physicsTick);
      } else {
        // Snap to nearest card
        const anglePerCard = 360 / N;
        const nearestCardIdx = Math.round(rotYRef.current / anglePerCard);
        const targetRotY = nearestCardIdx * anglePerCard;
        
        let snapStartTime: number | null = null;
        const snapStartRotation = rotYRef.current;
        const snapDuration = 400;

        const snapStep = (timestamp: number) => {
          if (isDraggingRef.current) return;
          if (!snapStartTime) snapStartTime = timestamp;
          const progress = Math.min((timestamp - snapStartTime) / snapDuration, 1);
          const ease = 1 - Math.pow(1 - progress, 3);
          
          rotYRef.current = snapStartRotation + (targetRotY - snapStartRotation) * ease;
          if (trackRef.current) {
            trackRef.current.style.transform = `translate3d(-50%, -50%, -120px) rotateY(${rotYRef.current}deg)`;
          }
          updateActiveCardClass(rotYRef.current);

          if (progress < 1) {
            animationFrameRef.current = requestAnimationFrame(snapStep);
          }
        };
        animationFrameRef.current = requestAnimationFrame(snapStep);
      }
    };
    animationFrameRef.current = requestAnimationFrame(physicsTick);
  };

  return (
    <div
      className="cylinder-track-wrapper"
      style={{ width: '100%', height: '100%', position: 'absolute', pointerEvents: 'auto' }}
      onMouseDown={(e) => handleStart(e.clientX)}
      onMouseMove={(e) => handleMove(e.clientX)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={(e) => handleStart(e.touches[0].clientX)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
      onTouchEnd={handleEnd}
    >
      <div 
        ref={trackRef} 
        className="cylinder-track"
        style={{ transform: 'translate3d(-50%, -50%, -120px) rotateY(0deg)' }}
      >
        {cylinderImages.map((data, index) => {
          const angle = index * (360 / N);
          const transformString = `rotateY(${angle}deg) translateZ(${radius}px)`;
          return (
            <div
              key={data.id}
              className="carousel-item"
              style={{
                transform: transformString,
                WebkitTransform: transformString,
              }}
            >
              <div className="carousel-box">
                <img src={data.image_url} alt="" />
              </div>
              <div className="card-caption">{data.caption || ''}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 4. Circular 3D Layout (Fallback / Layout 4)
function CircularLayout({ images, updateDateDisplay, triggerAutoSwipeRef }: LayoutProps) {
  const [progress, setProgress] = useState(0);
  const dragStartRef = useRef(0);
  const isDraggingRef = useRef(false);

  const slicedImages = images.slice(0, 15);
  const N = slicedImages.length || 1;
  const speedDrag = -0.01;

  const swipeNext = () => {
    setProgress(prev => prev + 1);
  };

  useEffect(() => {
    triggerAutoSwipeRef.current = swipeNext;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  useEffect(() => {
    // Auto slide slowly every 2 seconds
    const interval = setInterval(() => {
      if (!isDraggingRef.current) {
        setProgress(prev => prev + 1);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = (clientX: number) => {
    isDraggingRef.current = true;
    dragStartRef.current = clientX;
  };

  const handleMove = (clientX: number) => {
    if (!isDraggingRef.current) return;
    const deltaX = clientX - dragStartRef.current;
    setProgress(prev => prev + deltaX * speedDrag);
    dragStartRef.current = clientX;
  };

  const handleEnd = () => {
    isDraggingRef.current = false;
  };

  return (
    <div
      className="circular-track-wrapper"
      style={{ width: '100%', height: '100%', position: 'absolute', pointerEvents: 'auto' }}
      onMouseDown={(e) => handleStart(e.clientX)}
      onMouseMove={(e) => handleMove(e.clientX)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={(e) => handleStart(e.touches[0].clientX)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
      onTouchEnd={handleEnd}
    >
      {slicedImages.map((data, index) => {
        let distance = index - progress;
        distance = ((distance % N) + N) % N;
        if (distance > N / 2) {
          distance -= N;
        }

        const isActive = Math.abs(distance) < 0.5;
        if (isActive) {
          // Sync date in background
          setTimeout(() => updateDateDisplay(data.created_at), 50);
        }

        const visualScale = 10;
        const opacity = 1 - (Math.abs(distance) * 0.28);
        const zIndex = 100 - Math.abs(Math.round(distance));

        const x = `calc(${distance / visualScale} * 800%)`;
        const y = `calc(${distance / visualScale} * 200%)`;
        const rot = `calc(${distance / visualScale} * 120deg)`;

        const cardStyle = {
          '--zIndex': zIndex,
          '--active': distance / visualScale,
          '--opacity': opacity,
          zIndex: zIndex,
          transform: `translate(${x}, ${y}) rotate(${rot})`,
        } as React.CSSProperties;

        return (
          <div
            key={data.id}
            className={`carousel-item ${isActive ? 'active-card' : ''}`}
            style={cardStyle}
            onClick={() => setProgress(index)}
          >
            <div className="carousel-box" style={{ opacity: opacity }}>
              <img src={data.image_url} alt="" />
            </div>
            <div className="card-caption">{data.caption || ''}</div>
          </div>
        );
      })}
    </div>
  );
}
