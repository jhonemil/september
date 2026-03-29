let progress = 0;
let startX = 0;
let isDown = false;
const speedWheel = 0.002;
const speedDrag = -0.01;

async function loadCarousel() {
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

    try {
        const { data, error } = await supabaseClient.from('carousel_images').select('*').order('sort_order', { ascending: true });
        
        if (data && data.length > 0) {
            const carousel = document.querySelector('.carousel');
            carousel.innerHTML = '';
            
            data.forEach(img => {
                const item = document.createElement('div');
                item.className = 'carousel-item';
                item.innerHTML = `
                    <div class="carousel-box">
                        <!-- Use the DB image url -->
                        <img src="${img.image_url}" />
                    </div>
                `;
                carousel.appendChild(item);
            });
        }
    } catch(err) {
        console.error("Database error:", err);
    }

    // Initialize circular slide logic after loading items
    const $items = document.querySelectorAll('.carousel-item');
    const $cursors = document.querySelectorAll('.cursor');
    const N = $items.length || 1; 

    // Guard if entirely empty
    if(N === 0) return;

    const displayItems = (item, index, currentProgress) => {
        let distance = index - currentProgress;
        
        distance = ((distance % N) + N) % N;
        if (distance > N / 2) {
            distance -= N;
        }

        // Force visual layout scale to mimic original 10-item template exactly
        const visualScale = 10;
        
        // Compute reliable robust transparency fading
        const opacity = 1 - (Math.abs(distance) * 0.28);
        const zIndex = 100 - Math.abs(Math.round(distance));
        
        item.style.setProperty('--zIndex', zIndex);
        item.style.setProperty('--active', distance / visualScale);
        item.style.setProperty('--opacity', opacity);
    };

    const animate = () => {
        progress = ((progress % N) + N) % N; 
        $items.forEach((item, index) => displayItems(item, index, progress));
    };
    animate();

    $items.forEach((item, i) => {
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
        if (e.type === 'mousemove') {
            $cursors.forEach(($cursor) => {
                $cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
            });
        }
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

    document.addEventListener('wheel', handleWheel);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchstart', handleMouseDown);
    document.addEventListener('touchmove', handleMouseMove);
    document.addEventListener('touchend', handleMouseUp);
}

// Boot the dynamic loader
loadCarousel();