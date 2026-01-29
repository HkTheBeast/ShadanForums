// DOM Elements
const navbar = document.getElementById('navbar');
const mobileToggle = document.getElementById('mobileToggle');
const navMenu = document.querySelector('.nav-menu');
const backToTop = document.getElementById('backToTop');
const footerButtons = document.querySelectorAll('.footer-btn');

// Navbar Scroll Effect
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
    
    // Back to Top Button
    if (window.scrollY > 300) {
        backToTop.classList.add('visible');
    } else {
        backToTop.classList.remove('visible');
    }
});

// Mobile Menu Toggle
mobileToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    mobileToggle.classList.toggle('active');
    
    // Animate hamburger icon
    const spans = mobileToggle.querySelectorAll('span');
    if (navMenu.classList.contains('active')) {
        spans[0].style.transform = 'rotate(45deg) translate(6px, 6px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translate(6px, -6px)';
    } else {
        spans[0].style.transform = 'none';
        spans[1].style.opacity = '1';
        spans[2].style.transform = 'none';
    }
});

// Close mobile menu when clicking a link
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        mobileToggle.classList.remove('active');
        const spans = mobileToggle.querySelectorAll('span');
        spans[0].style.transform = 'none';
        spans[1].style.opacity = '1';
        spans[2].style.transform = 'none';
    });
});

// Back to Top Functionality
backToTop.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Footer Button Functionality (Placeholder)
footerButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
        console.log(`Footer button ${index + 1} clicked`);
        // Temporary animation feedback
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = '';
        }, 200);
        
        // Add your functionality here later
        // Example: window.location.href = 'page.html';
    });
});

// Smooth Scrolling for Navigation Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 80,
                behavior: 'smooth'
            });
            
            // Update active nav link
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
                link.querySelector('.nav-indicator').style.width = '4px';
            });
            this.classList.add('active');
            this.querySelector('.nav-indicator').style.width = '20px';
        }
    });
});

// Hover Effect for Feature Cards
const featureCards = document.querySelectorAll('.feature-card');
featureCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-10px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0) scale(1)';
    });
});

// Floating Cards Animation Enhancement
const floatingCards = document.querySelectorAll('.floating-card');
floatingCards.forEach((card, index) => {
    card.style.animationDelay = `${index * 0.5}s`;
});

// Feature Highlights Animation
const featureHighlights = document.querySelectorAll('.feature-highlight');
featureHighlights.forEach((highlight, index) => {
    highlight.style.animationDelay = `${index * 0.1}s`;
    highlight.style.opacity = '0';
    highlight.style.animation = 'fadeIn 0.5s ease forwards';
});

// Parallax Effect for Background (Optional)
window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    const background = document.querySelector('.background-image');
    if (background) {
        background.style.transform = `translateY(${scrolled * 0.05}px)`;
    }
});

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Svlent Classroom Hub loaded successfully');
    
    // Fade in animation
    document.body.style.opacity = '0';
    document.body.style.animation = 'fadeIn 0.8s ease forwards';
    
    // Check if background image loaded
    const bgImage = new Image();
    bgImage.src = '../images/svlent-bg.jpg';
    bgImage.onload = () => {
        console.log('Background image loaded successfully');
        document.querySelector('.background-image').style.opacity = '0.15';
    };
    bgImage.onerror = () => {
        console.warn('Background image failed to load, using fallback gradient');
        document.querySelector('.background-image').style.backgroundImage = 
            'linear-gradient(135deg, #0a192f, #1d2b53)';
    };
    
    // Add click animation to all buttons
    const allButtons = document.querySelectorAll('button, .btn-primary, .btn-secondary, .footer-btn');
    allButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            // Ripple effect
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
});

// Add CSS for ripple effect (dynamically)
const rippleStyles = document.createElement('style');
rippleStyles.textContent = `
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple-animation 0.6s linear;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    button, .btn-primary, .btn-secondary, .footer-btn {
        position: relative;
        overflow: hidden;
    }
`;
document.head.appendChild(rippleStyles);