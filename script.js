$(document).ready(function() {
    logActivity('Site Visit', 'Home Page');
    let isOpen = false;
    const $heartContainer = $('.heart-container');
    const $message = $('.message');
    const $container = $('.container');

    // Bind click events immediately so the heart is always clickable
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

    $('.btn').on('click', function() {
        logActivity('Button Click', 'Things to Remember');
    });

    $heartContainer.hover(
        () => $heartContainer.find('.heart').css('transform', 'scale(1.1)'),
        () => $heartContainer.find('.heart').css('transform', 'scale(1)')
    );

    // Fetch the dynamic message from Supabase in the background
    async function getMessage() {
        try {
            const { data, error } = await supabaseClient.from('letter_content').select('message').limit(1).single();
            if (data && data.message) {
                $('#message-body').text(data.message);
            } else {
                $('#message-body').text("Couldn't read message. Make sure Database is set up.");
            }
        } catch(err) {
            console.error(err);
        }
    }
    
    getMessage();
});