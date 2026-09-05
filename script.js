// Mobile Navigation Toggle
const hamburger = document.getElementById('hamburger');
const navLinks = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('active');
});

// Close mobile menu when a link is clicked
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
    });
});

// Sticky Navbar Background on Scroll
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Desktop Hover to Play YouTube Shorts Preview
const ytVideos = document.querySelectorAll('.yt-video');
ytVideos.forEach(container => {
    const iframe = container.querySelector('iframe');
    const baseSrc = container.getAttribute('data-src');
    
    container.addEventListener('mouseenter', () => {
        if(window.innerWidth > 768) {
            iframe.src = baseSrc + "?autoplay=1&mute=1&loop=1";
        }
    });

    container.addEventListener('mouseleave', () => {
        if(window.innerWidth > 768) {
            iframe.src = baseSrc;
        }
    });
});

// Video Click Focus Interaction
const videosContainer = document.querySelector('.videos-container');
const allVideoCards = document.querySelectorAll('.video-card');

if (videosContainer && allVideoCards.length > 0) {
    allVideoCards.forEach(card => {
        card.addEventListener('click', (e) => {
            // Unfocus if clicking same card
            if (card.classList.contains('focused')) {
                card.classList.remove('focused');
                videosContainer.classList.remove('has-focus');
            } else {
                allVideoCards.forEach(c => c.classList.remove('focused'));
                card.classList.add('focused');
                videosContainer.classList.add('has-focus');
                
                card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        });
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.videos-container')) {
            allVideoCards.forEach(c => c.classList.remove('focused'));
            videosContainer.classList.remove('has-focus');
        }
    });
}
