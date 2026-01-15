// DOM Elements
const mobileToggle = document.getElementById('mobileToggle');
const mobileMenu = document.getElementById('mobileMenu');
const backToTop = document.getElementById('backToTop');
const notificationToast = document.getElementById('notificationToast');
const toastMessage = document.getElementById('toastMessage');
const toastClose = document.getElementById('toastClose');

// All register/login buttons
const loginButtons = [
    document.getElementById('loginBtn'),
    document.getElementById('mobileLoginBtn'),
    document.getElementById('heroDemoBtn'), // Demo button acts as login for now
    document.getElementById('ctaContactBtn') // Contact button acts as login for now
];

const registerButtons = [
    document.getElementById('registerBtn'),
    document.getElementById('mobileRegisterBtn'),
    document.getElementById('heroRegisterBtn'),
    document.getElementById('ctaRegisterBtn')
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initBackToTop();
    initToast();
    initStatsCounter();
    initFloatingCards();
    initOrbitAnimations();
    initScrollAnimations();
    initButtonEvents();
    
    // Show welcome toast
    setTimeout(() => {
        showToast('Welcome to EduTrack Teacher Portal! Start your free account today.');
    }, 1000);
});

// Mobile Menu Toggle
function initMobileMenu() {
    mobileToggle.addEventListener('click', () => {
        mobileMenu.style.display = mobileMenu.style.display === 'flex' ? 'none' : 'flex';
        mobileToggle.innerHTML = mobileMenu.style.display === 'flex' ? 
            '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
    });
    
    // Close mobile menu when clicking a link
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.style.display = 'none';
            mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
        });
    });
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!mobileMenu.contains(e.target) && !mobileToggle.contains(e.target)) {
            mobileMenu.style.display = 'none';
            mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
        }
    });
}

// Back to Top Button
function initBackToTop() {
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    });
    
    backToTop.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// Toast Notification System
function initToast() {
    toastClose.addEventListener('click', () => {
        notificationToast.classList.remove('show');
    });
    
    // Auto-hide toast after 5 seconds
    notificationToast.addEventListener('animationend', () => {
        if (notificationToast.classList.contains('show')) {
            setTimeout(() => {
                notificationToast.classList.remove('show');
            }, 5000);
        }
    });
}

function showToast(message) {
    toastMessage.textContent = message;
    notificationToast.classList.add('show');
}

// Animated Stats Counter
function initStatsCounter() {
    const stats = document.querySelectorAll('.stat-number');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const stat = entry.target;
                const target = parseInt(stat.getAttribute('data-count'));
                const duration = 2000; // 2 seconds
                const steps = 60;
                const increment = target / steps;
                let current = 0;
                
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= target) {
                        stat.textContent = target;
                        clearInterval(timer);
                    } else {
                        stat.textContent = Math.floor(current);
                    }
                }, duration / steps);
                
                observer.unobserve(stat);
            }
        });
    }, { threshold: 0.5 });
    
    stats.forEach(stat => observer.observe(stat));
}

// Floating Cards Animation
function initFloatingCards() {
    const cards = document.querySelectorAll('.floating-card');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.zIndex = '10';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.zIndex = '2';
        });
    });
}

// Orbit Animations
function initOrbitAnimations() {
    const orbits = document.querySelectorAll('.orbit');
    
    orbits.forEach(orbit => {
        // Pause animation on hover
        orbit.addEventListener('mouseenter', () => {
            orbit.style.animationPlayState = 'paused';
        });
        
        orbit.addEventListener('mouseleave', () => {
            orbit.style.animationPlayState = 'running';
        });
    });
}

// Scroll Animations
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.feature-card, .floating-card, .section-header');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });
    
    animatedElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(element);
    });
}

// Button Event Handlers
function initButtonEvents() {
    // Login buttons
    loginButtons.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                showToast('Login functionality will be added in the next phase!');
                // For now, just show a toast
                console.log('Login button clicked - to be implemented');
            });
        }
    });
    
    // Register buttons
    registerButtons.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                showToast('Registration functionality will be added in the next phase!');
                // For now, just show a toast
                console.log('Register button clicked - to be implemented');
            });
        }
    });
    
    // Demo button
    const demoBtn = document.getElementById('heroDemoBtn');
    if (demoBtn) {
        demoBtn.addEventListener('click', () => {
            showToast('Playing demo video...');
            // In a real implementation, this would open a modal with a video
            const demoModal = document.createElement('div');
            demoModal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2000;
            `;
            demoModal.innerHTML = `
                <div style="background: var(--dark-light); padding: 20px; border-radius: var(--radius-lg); max-width: 800px; width: 90%; position: relative;">
                    <button onclick="this.parentElement.parentElement.remove()" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: white; font-size: 24px; cursor: pointer;">×</button>
                    <h3 style="margin-bottom: 20px;">EduTrack Demo</h3>
                    <div style="background: var(--dark); padding: 40px; border-radius: var(--radius-md); text-align: center;">
                        <i class="fas fa-play-circle" style="font-size: 60px; color: var(--primary); margin-bottom: 20px;"></i>
                        <p>Demo video player would appear here</p>
                        <p style="color: var(--gray); font-size: 14px; margin-top: 20px;">In the full implementation, this would play an actual demo video</p>
                    </div>
                </div>
            `;
            document.body.appendChild(demoModal);
            
            // Close modal when clicking outside
            demoModal.addEventListener('click', (e) => {
                if (e.target === demoModal) {
                    demoModal.remove();
                }
            });
        });
    }
}

// Navbar scroll effect
let lastScroll = 0;
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    const currentScroll = window.pageYOffset;
    
    if (currentScroll <= 0) {
        navbar.style.transform = 'translateY(0)';
        return;
    }
    
    if (currentScroll > lastScroll && currentScroll > 100) {
        // Scrolling down
        navbar.style.transform = 'translateY(-100%)';
    } else {
        // Scrolling up
        navbar.style.transform = 'translateY(0)';
    }
    
    lastScroll = currentScroll;
});

// Add hover effect to feature cards
document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        const icon = this.querySelector('.feature-icon');
        icon.style.transform = 'scale(1.1) rotate(5deg)';
        icon.style.transition = 'transform 0.3s ease';
    });
    
    card.addEventListener('mouseleave', function() {
        const icon = this.querySelector('.feature-icon');
        icon.style.transform = 'scale(1) rotate(0)';
    });
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + / to focus search (placeholder for future)
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        showToast('Search functionality coming soon!');
    }
    
    // Escape key closes mobile menu
    if (e.key === 'Escape' && mobileMenu.style.display === 'flex') {
        mobileMenu.style.display = 'none';
        mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
    }
});

// Add ripple effect to buttons
document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.4);
            transform: scale(0);
            animation: ripple-animation 0.6s linear;
            width: ${size}px;
            height: ${size}px;
            top: ${y}px;
            left: ${x}px;
            pointer-events: none;
        `;
        
        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    });
});

// Add CSS for ripple animation
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);


// ================= AUTHENTICATION FUNCTIONS =================

// Check if user is logged in on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    initAuthForms();
});

// Check authentication status
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        
        if (data.isAuthenticated && data.user) {
            updateUIForLoggedInUser(data.user);
        } else {
            updateUIForLoggedOutUser();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
    }
}

// Update UI when user is logged in
function updateUIForLoggedInUser(user) {
    // Update navbar buttons
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const mobileLoginBtn = document.getElementById('mobileLoginBtn');
    const mobileRegisterBtn = document.getElementById('mobileRegisterBtn');
    
    if (loginBtn) {
        loginBtn.style.display = 'none';
    }
    if (registerBtn) {
        registerBtn.style.display = 'none';
    }
    if (mobileLoginBtn) {
        mobileLoginBtn.style.display = 'none';
    }
    if (mobileRegisterBtn) {
        mobileRegisterBtn.style.display = 'none';
    }
    
    // Add user profile to navbar
    const navActions = document.querySelector('.nav-actions');
    if (navActions && !document.querySelector('.user-profile')) {
        const userProfile = document.createElement('div');
        userProfile.className = 'user-profile';
        userProfile.innerHTML = `
            <i class="fas fa-user"></i>
            <span>${user.username}</span>
        `;
        
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'logout-btn';
        logoutBtn.innerHTML = `
            <i class="fas fa-sign-out-alt"></i>
            <span>Logout</span>
        `;
        logoutBtn.onclick = logoutUser;
        
        navActions.appendChild(userProfile);
        navActions.appendChild(logoutBtn);
    }
    
    // Update mobile menu
    const mobileActions = document.querySelector('.mobile-actions');
    if (mobileActions && !mobileActions.querySelector('.user-profile')) {
        mobileActions.innerHTML = '';
        
        const mobileUserProfile = document.createElement('div');
        mobileUserProfile.className = 'user-profile';
        mobileUserProfile.style.marginBottom = '10px';
        mobileUserProfile.innerHTML = `
            <i class="fas fa-user"></i>
            <span>${user.username}</span>
        `;
        
        const mobileLogoutBtn = document.createElement('button');
        mobileLogoutBtn.className = 'logout-btn mobile-btn';
        mobileLogoutBtn.style.width = '100%';
        mobileLogoutBtn.innerHTML = `
            <i class="fas fa-sign-out-alt"></i>
            <span>Logout</span>
        `;
        mobileLogoutBtn.onclick = logoutUser;
        
        mobileActions.appendChild(mobileUserProfile);
        mobileActions.appendChild(mobileLogoutBtn);
    }
}

// Update UI when user is logged out
function updateUIForLoggedOutUser() {
    // Show login/register buttons
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const mobileLoginBtn = document.getElementById('mobileLoginBtn');
    const mobileRegisterBtn = document.getElementById('mobileRegisterBtn');
    
    if (loginBtn) {
        loginBtn.style.display = 'flex';
    }
    if (registerBtn) {
        registerBtn.style.display = 'flex';
    }
    if (mobileLoginBtn) {
        mobileLoginBtn.style.display = 'flex';
    }
    if (mobileRegisterBtn) {
        mobileRegisterBtn.style.display = 'flex';
    }
    
    // Remove user profile from navbar
    const userProfile = document.querySelector('.user-profile');
    const logoutBtn = document.querySelector('.logout-btn');
    
    if (userProfile) userProfile.remove();
    if (logoutBtn) logoutBtn.remove();
}

// Initialize authentication forms
function initAuthForms() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        
        // Auto-fill demo credentials for testing
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        if (usernameInput && passwordInput) {
            usernameInput.value = 'teacher123';
            passwordInput.value = 'password123';
        }
    }
    
    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
        
        // Password validation
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.addEventListener('input', validatePassword);
        }
        
        // Username validation
        const usernameInput = document.getElementById('username');
        if (usernameInput) {
            usernameInput.addEventListener('input', validateUsername);
        }
        
        // Confirm password validation
        const confirmPasswordInput = document.getElementById('confirmPassword');
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', validateConfirmPassword);
        }
    }
}

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    
    const form = e.target;
    const username = form.querySelector('#username').value.trim();
    const password = form.querySelector('#password').value;
    const submitBtn = form.querySelector('#submitBtn');
    const btnText = submitBtn.querySelector('#btnText');
    const loadingSpinner = submitBtn.querySelector('#loadingSpinner');
    
    // Clear previous errors
    clearErrors(form);
    
    // Validation
    if (!username || !password) {
        showError('usernameError', 'Username and password are required');
        return;
    }
    
    // Disable form and show loading
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    loadingSpinner.style.display = 'block';
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Success', 'Login successful!', 'success');
            
            // Wait a bit before redirecting
            setTimeout(() => {
                window.location.href = data.redirect || '/home';
            }, 1000);
        } else {
            showError('passwordError', data.message || 'Login failed');
            submitBtn.disabled = false;
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('passwordError', 'Network error. Please try again.');
        submitBtn.disabled = false;
    } finally {
        btnText.style.display = 'block';
        loadingSpinner.style.display = 'none';
    }
}

// Handle registration form submission
async function handleRegister(e) {
    e.preventDefault();
    
    const form = e.target;
    const username = form.querySelector('#username').value.trim();
    const password = form.querySelector('#password').value;
    const confirmPassword = form.querySelector('#confirmPassword').value;
    const submitBtn = form.querySelector('#submitBtn');
    const btnText = submitBtn.querySelector('#btnText');
    const loadingSpinner = submitBtn.querySelector('#loadingSpinner');
    
    // Clear previous errors
    clearErrors(form);
    
    // Validation
    if (!username || !password || !confirmPassword) {
        showError('usernameError', 'All fields are required');
        return;
    }
    
    if (password !== confirmPassword) {
        showError('confirmPasswordError', 'Passwords do not match');
        return;
    }
    
    if (password.length < 8) {
        showError('passwordError', 'Password must be at least 8 characters');
        return;
    }
    
    if (username.length < 3) {
        showError('usernameError', 'Username must be at least 3 characters');
        return;
    }
    
    // Username format validation
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
        showError('usernameError', 'Username can only contain letters, numbers, and underscores');
        return;
    }
    
    // Password complexity validation
    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(password)) {
        showError('passwordError', 'Password must contain at least one letter and one number');
        return;
    }
    
    // Disable form and show loading
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    loadingSpinner.style.display = 'block';
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password, confirmPassword })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Success', 'Registration successful!', 'success');
            
            // Wait a bit before redirecting
            setTimeout(() => {
                window.location.href = data.redirect || '/home';
            }, 1000);
        } else {
            showError('usernameError', data.message || 'Registration failed');
            submitBtn.disabled = false;
        }
    } catch (error) {
        console.error('Registration error:', error);
        showError('usernameError', 'Network error. Please try again.');
        submitBtn.disabled = false;
    } finally {
        btnText.style.display = 'block';
        loadingSpinner.style.display = 'none';
    }
}

// Password validation
function validatePassword() {
    const password = this.value;
    const errorElement = document.getElementById('passwordError');
    const requirements = document.querySelectorAll('.requirement');
    
    if (!password) {
        errorElement.textContent = '';
        requirements.forEach(req => req.classList.remove('valid'));
        return;
    }
    
    // Check requirements
    const hasLength = password.length >= 8;
    const hasLetter = /[A-Za-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    // Update requirement indicators
    if (requirements.length >= 3) {
        requirements[0].classList.toggle('valid', hasLength);
        requirements[1].classList.toggle('valid', hasLetter);
        requirements[2].classList.toggle('valid', hasNumber);
    }
    
    // Clear error if requirements are met
    if (hasLength && hasLetter && hasNumber) {
        errorElement.textContent = '';
    }
}

// Username validation
function validateUsername() {
    const username = this.value;
    const errorElement = document.getElementById('usernameError');
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    
    if (!username) {
        errorElement.textContent = '';
        return;
    }
    
    if (username.length < 3) {
        errorElement.textContent = 'Username must be at least 3 characters';
    } else if (!usernameRegex.test(username)) {
        errorElement.textContent = 'Username can only contain letters, numbers, and underscores';
    } else {
        errorElement.textContent = '';
    }
}

// Confirm password validation
function validateConfirmPassword() {
    const confirmPassword = this.value;
    const password = document.getElementById('password').value;
    const errorElement = document.getElementById('confirmPasswordError');
    
    if (!confirmPassword) {
        errorElement.textContent = '';
        return;
    }
    
    if (confirmPassword !== password) {
        errorElement.textContent = 'Passwords do not match';
    } else {
        errorElement.textContent = '';
    }
}

// Clear all form errors
function clearErrors(form) {
    const errorElements = form.querySelectorAll('.error-message');
    errorElements.forEach(el => {
        el.textContent = '';
    });
}

// Show error message
function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'flex';
    }
}

// Logout user
function logoutUser() {
    window.location.href = '/logout';
}

// Show notification
function showNotification(title, message, type = 'info') {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        </div>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

// Update existing button event handlers to use auth system
function initButtonEvents() {
    // Login buttons - redirect to login page
    const loginButtons = [
        document.getElementById('loginBtn'),
        document.getElementById('mobileLoginBtn'),
        document.getElementById('heroDemoBtn')
    ].filter(btn => btn);
    
    loginButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (e.target.closest('button').id !== 'heroDemoBtn') {
                e.preventDefault();
                window.location.href = '/login';
            }
        });
    });
    
    // Register buttons - redirect to register page
    const registerButtons = [
        document.getElementById('registerBtn'),
        document.getElementById('mobileRegisterBtn'),
        document.getElementById('heroRegisterBtn'),
        document.getElementById('ctaRegisterBtn')
    ].filter(btn => btn);
    
    registerButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/register';
        });
    });
    
    // Demo button shows demo modal
    const demoBtn = document.getElementById('heroDemoBtn');
    if (demoBtn) {
        demoBtn.addEventListener('click', (e) => {
            if (!e.target.closest('button').dataset.preventAuth) {
                e.preventDefault();
                showNotification('Demo', 'This would show a demo video in the full implementation.', 'info');
            }
        });
    }
}

// Initialize all event handlers when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initButtonEvents();
        checkAuthStatus();
        initAuthForms();
    });
} else {
    initButtonEvents();
    checkAuthStatus();
    initAuthForms();
}