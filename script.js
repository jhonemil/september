// Enhanced JavaScript with smoother animations
$(document).ready(function() {
    let isOpen = false;
    const $heartContainer = $('.heart-container');
    const $message = $('.message');
    const $container = $('.container');

    $heartContainer.on('click', function() {
        if (!isOpen) {
            $heartContainer.css({
                'transform': 'translateX(-50%) scale(0.8)',
                'top': '85%'
            });
            $container.css('background', 'var(--primary-pink)');
            $message.addClass('active');
            $heartContainer.find('.heart').css('animation', 'heartbeat 1.2s ease-in-out infinite');
        } else {
            $heartContainer.css({
                'transform': 'translateX(-50%)',
                'top': '30%'
            });
            $container.css('background', '');
            $message.removeClass('active');
            $heartContainer.find('.heart').css('animation', '');
        }
        isOpen = !isOpen;
    });

    // Enhanced hover effect with CSS transition
    $heartContainer.hover(
        () => $heartContainer.find('.heart').css('transform', 'scale(1.1)'),
        () => $heartContainer.find('.heart').css('transform', 'scale(1)')
    );
});