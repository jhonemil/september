let currentLayoutId = 1; // Default to Option 1
let cleanupPreviousLayout = null;
let allImages = []; // Hold all 260 image records fetched from Supabase

// Auto Play state
let autoplayInterval = null;
let isAutoplayActive = false;

async function loadCarousel() {
    logActivity('Page Visit', 'Carousel Page');
    
    // Load Music
    try {
        const { data: musicData } = await supabaseClient.from('bg_music').select('music_url').limit(1).single();
        if (musicData && musicData.music_url) {
            const audio = document.getElementById('bg-music');
            if (audio) {
                audio.src = musicData.music_url;
                audio.load();
            }
        }
    } catch(err) {
        console.error("Music database error:", err);
    }

    // Set up Controllers
    initMusicController();
    initAutoplayController();

    // Fetch images and render them
    try {
        const { data, error } = await supabaseClient.from('carousel_images').select('*').order('sort_order', { ascending: true });
        
        if (data && data.length > 0) {
            allImages = data;
            
            // Read the initial layout selection from database
            const activeLayout = await getActiveLayout();
            switchLayout(activeLayout);

            // Listen to real-time database changes
            subscribeToLayoutChange((newLayoutId) => {
                console.log("Database updated layout to:", newLayoutId);
                switchLayout(newLayoutId);
            });
        }
    } catch(err) {
        console.error("Database error loading images:", err);
    }
}

// Helper to create a single card element
function createCardElement(imgData) {
    const item = document.createElement('div');
    item.className = 'carousel-item';
    item.innerHTML = `
        <div class="carousel-box">
            <img src="${imgData.image_url}" loading="lazy" />
        </div>
        <div class="card-caption">${imgData.caption || ''}</div>
    `;
    return item;
}

// Handle layout switching
function switchLayout(layoutId) {
    if (cleanupPreviousLayout) {
        cleanupPreviousLayout();
        cleanupPreviousLayout = null;
    }

    currentLayoutId = layoutId;
    const wrapper = document.getElementById('gallery-wrapper');
    const carousel = document.querySelector('.carousel');
    carousel.innerHTML = ''; // Clear previous elements

    if (layoutId === 1) {
        // Option 1: Polaroid Card Stack (Virtualized)
        wrapper.className = 'gallery-wrapper layout-polaroid-stack';
        cleanupPreviousLayout = initPolaroidLayout();
    } else {
        // Fallback to original circular layout (Slice to top 15 images to prevent crashing browser)
        wrapper.className = 'gallery-wrapper layout-circular';
        
        const slicedData = allImages.slice(0, 15);
        slicedData.forEach(img => {
            carousel.appendChild(createCardElement(img));
        });
        
        const items = document.querySelectorAll('.carousel-item');
        cleanupPreviousLayout = initCircularLayout(items);
    }
}

// Global hook to trigger automated swiping from outside the layout logic
function triggerAutoSwipe() {
    if (currentLayoutId === 1) {
        if (typeof window.polaroidSwipeNext === 'function') {
            window.polaroidSwipeNext();
        }
    }
}

// ----------------------------------------------------
// Option 1: Polaroid Stack (Tinder-style swipe, Virtualized)
// ----------------------------------------------------
function initPolaroidLayout() {
    const container = document.querySelector('.carousel');
    let activeIndex = 0; // Current top card index in allImages
    let cardElements = []; // Store currently rendered DOM elements (max 3)
    
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;

    // Render/Update the visible card stack (always keep top 3 cards in DOM)
    function updateStackDOM() {
        container.innerHTML = '';
        cardElements = [];

        // We only render 3 cards at a time
        const cardsToRender = Math.min(allImages.length, 3);
        
        for (let i = 0; i < cardsToRender; i++) {
            const imgIndex = (activeIndex + i) % allImages.length;
            const card = createCardElement(allImages[imgIndex]);
            container.appendChild(card);
            cardElements.push(card);
        }

        arrangeStack();
    }

    // Apply CSS transform styling based on stack order
    function arrangeStack() {
        cardElements.forEach((item, index) => {
            // Index 0 is the front card, Index 2 is the back card
            const zIndex = 100 - index;
            item.style.zIndex = zIndex;
            
            if (index === 0) {
                // Front active card
                item.style.transform = 'translate(0, 0) scale(1) rotate(0deg)';
                item.style.opacity = '1';
                item.style.pointerEvents = 'auto';
            } else if (index === 1) {
                // Second card (peek from behind)
                item.style.transform = 'translate(5px, 10px) scale(0.95) rotate(-3deg)';
                item.style.opacity = '0.9';
                item.style.pointerEvents = 'none';
            } else if (index === 2) {
                // Third card
                item.style.transform = 'translate(-5px, 20px) scale(0.9) rotate(3deg)';
                item.style.opacity = '0.8';
                item.style.pointerEvents = 'none';
            }
        });
    }

    // Expose programmatic swiper to window object
    window.polaroidSwipeNext = function() {
        const topCard = cardElements[0];
        if (!topCard) return;

        // Smoothly slide off to the left
        topCard.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.6s';
        topCard.style.transform = `translate(-${window.innerWidth}px, 40px) rotate(-12deg)`;
        topCard.style.opacity = '0';

        setTimeout(() => {
            activeIndex = (activeIndex + 1) % allImages.length;
            updateStackDOM();
        }, 400);
    };

    // Initialize the DOM stack
    updateStackDOM();

    function onStart(e) {
        const topCard = cardElements[0];
        if (!topCard) return;

        // ONLY drag if the touch/click is on the top card
        if (!topCard.contains(e.target)) return;

        isDragging = true;
        const touch = e.touches ? e.touches[0] : e;
        startX = touch.clientX;
        startY = touch.clientY;
        
        topCard.style.transition = 'none';
    }

    function onMove(e) {
        if (!isDragging) return;
        const topCard = cardElements[0];
        if (!topCard) return;

        const touch = e.touches ? e.touches[0] : e;
        currentX = touch.clientX - startX;
        currentY = touch.clientY - startY;

        const rotation = currentX * 0.08; // slightly softer rotation
        topCard.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${rotation}deg)`;
    }

    function onEnd() {
        if (!isDragging) return;
        isDragging = false;
        
        const topCard = cardElements[0];
        if (!topCard) return;

        topCard.style.transition = 'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.35s';

        const threshold = 120;
        if (Math.abs(currentX) > threshold || Math.abs(currentY) > threshold) {
            // Throw card away
            const throwX = currentX > 0 ? window.innerWidth : -window.innerWidth;
            const throwY = currentY * 1.5;
            topCard.style.transform = `translate(${throwX}px, ${throwY}px) rotate(${currentX * 0.1}deg)`;
            topCard.style.opacity = '0';

            // Reset Autoplay timer if running to avoid double-swipe overlap
            if (isAutoplayActive) {
                clearInterval(autoplayInterval);
                autoplayInterval = setInterval(() => {
                    triggerAutoSwipe();
                }, 3000);
            }

            // Swap index and redraw after transition completes
            setTimeout(() => {
                activeIndex = (activeIndex + 1) % allImages.length;
                updateStackDOM();
            }, 300);
        } else {
            // Snap back to center
            topCard.style.transform = 'translate(0, 0) scale(1) rotate(0deg)';
        }

        currentX = 0;
        currentY = 0;
    }

    // Bind event listeners to document
    document.addEventListener('mousedown', onStart);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onEnd);

    // Return cleanup routine
    return () => {
        window.polaroidSwipeNext = null;
        document.removeEventListener('mousedown', onStart);
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('touchstart', onStart);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
    };
}

// ----------------------------------------------------
// Original Layout: Circular 3D Carousel (Slice-safe)
// ----------------------------------------------------
function initCircularLayout(items) {
    let progress = 0;
    let startX = 0;
    let isDown = false;
    const speedWheel = 0.002;
    const speedDrag = -0.01;
    const N = items.length || 1;

    const displayItems = (item, index, currentProgress) => {
        let distance = index - currentProgress;
        distance = ((distance % N) + N) % N;
        if (distance > N / 2) {
            distance -= N;
        }

        const visualScale = 10;
        const opacity = 1 - (Math.abs(distance) * 0.28);
        const zIndex = 100 - Math.abs(Math.round(distance));
        
        item.style.setProperty('--zIndex', zIndex);
        item.style.setProperty('--active', distance / visualScale);
        item.style.setProperty('--opacity', opacity);
        
        // Compute circular styling transforms
        const x = `calc(var(--active) * 800%)`;
        const y = `calc(var(--active) * 200%)`;
        const rot = `calc(var(--active) * 120deg)`;
        item.style.transform = `translate(${x}, ${y}) rotate(${rot})`;
    };

    const animate = () => {
        progress = ((progress % N) + N) % N; 
        items.forEach((item, index) => displayItems(item, index, progress));
    };

    animate();

    // Click to focus item
    items.forEach((item, i) => {
        item.addEventListener('click', () => {
            progress = i;
            animate();
        });
    });

    const handleWheel = e => {
        progress += e.deltaY * speedWheel;
        animate();
    };

    const handleMouseMove = (e) => {
        if (!isDown) return;
        const x = e.clientX || (e.touches && e.touches[0].clientX) || 0;
        progress += (x - startX) * speedDrag;
        startX = x;
        animate();
    };

    const handleMouseDown = e => {
        isDown = true;
        startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    };

    const handleMouseUp = () => {
        isDown = false;
    };

    // Auto-slide every 2 seconds
    const interval = setInterval(() => {
        if (!isDown) {
            progress += 1;
            animate();
        }
    }, 2000);

    document.addEventListener('wheel', handleWheel);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchstart', handleMouseDown, { passive: true });
    document.addEventListener('touchmove', handleMouseMove, { passive: true });
    document.addEventListener('touchend', handleMouseUp);

    return () => {
        clearInterval(interval);
        document.removeEventListener('wheel', handleWheel);
        document.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchstart', handleMouseDown);
        document.removeEventListener('touchmove', handleMouseMove);
        document.removeEventListener('touchend', handleMouseUp);
    };
}

// ----------------------------------------------------
// Autoplay & Slide Controller
// ----------------------------------------------------
function initAutoplayController() {
    const autoplayBtn = document.getElementById('autoplay-control');
    if (!autoplayBtn) return;

    autoplayBtn.addEventListener('click', () => {
        isAutoplayActive = !isAutoplayActive;
        
        if (isAutoplayActive) {
            autoplayBtn.classList.add('active-state');
            autoplayBtn.querySelector('.control-icon').textContent = '⏸️';
            
            // Auto swipe every 3 seconds
            autoplayInterval = setInterval(() => {
                triggerAutoSwipe();
            }, 3000);
        } else {
            autoplayBtn.classList.remove('active-state');
            autoplayBtn.querySelector('.control-icon').textContent = '▶️';
            
            if (autoplayInterval) {
                clearInterval(autoplayInterval);
                autoplayInterval = null;
            }
        }
    });
}

// ----------------------------------------------------
// Floating Music Controller & Audio Autoplay Setup
// ----------------------------------------------------
function initMusicController() {
    const audio = document.getElementById('bg-music');
    const musicControl = document.getElementById('music-control');
    if (!audio || !musicControl) return;

    musicControl.addEventListener('click', () => {
        if (audio.paused) {
            audio.play().then(() => {
                musicControl.classList.remove('pulse');
                musicControl.classList.add('active-state');
            }).catch(err => console.error("Playback failed:", err));
        } else {
            audio.pause();
            musicControl.classList.remove('active-state');
            musicControl.classList.add('pulse');
        }
    });

    // Touch/click body to unlock audio autoplay
    const triggerAutoplay = () => {
        if (audio.paused) {
            audio.play().then(() => {
                musicControl.classList.remove('pulse');
                musicControl.classList.add('active-state');
                document.removeEventListener('click', triggerAutoplay);
                document.removeEventListener('touchstart', triggerAutoplay);
            }).catch(() => {});
        }
    };

    document.addEventListener('click', triggerAutoplay);
    document.addEventListener('touchstart', triggerAutoplay);
}

// Cursor movement logic
const cursors = document.querySelectorAll('.cursor');
document.addEventListener('mousemove', (e) => {
    cursors.forEach((cursor) => {
        cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    });
});

// Boot the dynamic loader
loadCarousel();