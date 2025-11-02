(function(){
  // Elements - Only authentication functionality remains
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const userInfo = document.getElementById('user-info');
  const authModal = document.getElementById('auth-modal');
  const authForm = document.getElementById('auth-form');
  const authTitle = document.getElementById('auth-title');
  const authError = document.getElementById('auth-error');
  const authSubmit = document.getElementById('auth-submit');
  const authCancel = document.getElementById('auth-cancel');
  const toggleToRegister = document.getElementById('toggle-to-register');
  const openAuthLinks = document.querySelectorAll('#open-auth, #login-btn');
  const authLinkToggle = {}; // track register vs login

  function showAuthModal(mode){
    if(!authModal) return;
    authModal.classList.remove('hidden');
    authError.textContent='';
    if(mode === 'register'){
      authTitle.textContent = 'Register';
      authSubmit.textContent = 'Register';
      authLinkToggle.mode = 'register';
    } else {
      authTitle.textContent = 'Login';
      authSubmit.textContent = 'Login';
      authLinkToggle.mode = 'login';
    }
  }
  
  function hideAuthModal(){ 
    if(authModal) authModal.classList.add('hidden'); 
  }

  // Attach handlers
  if(openAuthLinks) openAuthLinks.forEach(el => { 
    if(el) el.addEventListener('click', (e)=>{ 
      e.preventDefault(); 
      showAuthModal('login'); 
    }) 
  });
  
  if(toggleToRegister) toggleToRegister.addEventListener('click', (e)=>{ 
    e.preventDefault(); 
    showAuthModal('register'); 
  });
  
  if(authCancel) authCancel.addEventListener('click', (e)=>{ 
    e.preventDefault(); 
    hideAuthModal(); 
  });
  
  if(loginBtn) loginBtn.addEventListener('click', (e)=>{ 
    e.preventDefault(); 
    showAuthModal('login'); 
  });
  
  if(logoutBtn) logoutBtn.addEventListener('click', async (e)=>{
    e.preventDefault();
    await fetch('/api/logout', { method:'POST', credentials:'include' });
    refreshAuthUI();
    location.reload();
  });

  async function refreshAuthUI(){
    const res = await fetch('/api/me', { credentials:'include' });
    const data = await res.json();
    if(data && data.user){
      if(loginBtn) loginBtn.classList.add('hidden');
      if(logoutBtn) logoutBtn.classList.remove('hidden');
      if(userInfo){ 
        userInfo.classList.remove('hidden'); 
        userInfo.textContent = 'Logged in as ' + data.user.username; 
      }
    } else {
      if(loginBtn) loginBtn.classList.remove('hidden');
      if(logoutBtn) logoutBtn.classList.add('hidden');
      if(userInfo){ 
        userInfo.classList.add('hidden'); 
        userInfo.textContent = ''; 
      }
    }
  }

  if(authForm){
    authForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const fd = new FormData(authForm);
      const payload = { 
        username: fd.get('username'), 
        password: fd.get('password') 
      };
      const mode = authLinkToggle.mode || 'login';
      const url = mode === 'register' ? '/api/register' : '/api/login';
      const res = await fetch(url, { 
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify(payload), 
        credentials: 'include' 
      });
      
      if(res.ok){
        const j = await res.json();
        hideAuthModal();
        refreshAuthUI();
        // reload to ensure pages (forum) update
        location.reload();
      } else {
        const err = await res.json();
        authError.textContent = err.error || 'Auth failed';
      }
    });
  }

  // Wire toggle links in case multiple pages have them
  document.addEventListener('click', (e)=>{
    if(e.target && e.target.id === 'open-auth'){ 
      e.preventDefault(); 
      showAuthModal('login'); 
    }
  });

  // Initial check
  refreshAuthUI();

  // Collapsible functionality
  var coll = document.getElementsByClassName("collapsible");
  var i;

  for (i = 0; i < coll.length; i++) {
    coll[i].addEventListener("click", function() {
      this.classList.toggle("active");
      var content = this.nextElementSibling;
      if (content.style.maxHeight){
        content.style.maxHeight = null;
      } else {
        content.style.maxHeight = content.scrollHeight + "px";
      } 
    });
  }

  // ===== MOBILE DROPDOWN FIX =====
  const dropdowns = document.querySelectorAll('.dropdown');
  
  dropdowns.forEach(dropdown => {
    dropdown.addEventListener('click', function(e) {
      // Only apply mobile behavior on screens 768px or smaller
      if (window.innerWidth <= 768) {
        e.preventDefault();
        e.stopPropagation();
        
        // Toggle this dropdown
        this.classList.toggle('active');
        
        // Close other dropdowns
        dropdowns.forEach(otherDropdown => {
          if (otherDropdown !== this) {
            otherDropdown.classList.remove('active');
          }
        });
      }
    });
  });
  
  // Close dropdowns when clicking outside (mobile only)
  document.addEventListener('click', function(e) {
    if (window.innerWidth <= 768) {
      if (!e.target.closest('.dropdown')) {
        dropdowns.forEach(dropdown => {
          dropdown.classList.remove('active');
        });
      }
    }
  });

  // Close dropdowns when window is resized to desktop size
  window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
      dropdowns.forEach(dropdown => {
        dropdown.classList.remove('active');
      });
    }
  });

})();


// Q&A Collapsible Functionality
document.addEventListener('DOMContentLoaded', function() {
  const qaQuestions = document.querySelectorAll('.qa-question');
  
  qaQuestions.forEach(question => {
    question.addEventListener('click', function() {
      // Toggle active class on question
      this.classList.toggle('active');
      
      // Toggle active class on answer
      const answer = this.nextElementSibling;
      answer.classList.toggle('active');
      
      // Close other questions if needed (optional)
      // qaQuestions.forEach(otherQuestion => {
      //   if (otherQuestion !== this) {
      //     otherQuestion.classList.remove('active');
      //     otherQuestion.nextElementSibling.classList.remove('active');
      //   }
      // });
    });
  });
});










// About Page Enhanced JavaScript
document.addEventListener('DOMContentLoaded', function() {
  // Initialize animations and interactions
  initAboutPage();
});

function initAboutPage() {
  // Add intersection observer for scroll animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        entry.target.style.transition = 'all 0.8s ease';
      }
    });
  }, observerOptions);

  // Observe all about sections
  const aboutSections = document.querySelectorAll('.about-section');
  aboutSections.forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(30px)';
    observer.observe(section);
  });

  // Observe hero content
  const heroContent = document.querySelector('.hero-content');
  if (heroContent) {
    heroContent.style.opacity = '0';
    heroContent.style.transform = 'translateY(20px)';
    heroContent.style.transition = 'all 1s ease';
    setTimeout(() => {
      heroContent.style.opacity = '1';
      heroContent.style.transform = 'translateY(0)';
    }, 300);
  }

  // Add special animation for credits button
  const creditsButton = document.querySelector('.credits-button');
  if (creditsButton) {
    creditsButton.style.opacity = '0';
    creditsButton.style.transform = 'scale(0.8)';
    creditsButton.style.transition = 'all 0.6s ease 0.3s';
    
    setTimeout(() => {
      creditsButton.style.opacity = '1';
      creditsButton.style.transform = 'scale(1)';
    }, 800);
  }

  // Add hover effects for interactive elements
  const interactiveElements = document.querySelectorAll('.feature-item, .vision-card, .platform-card, .tech-stat');
  
  interactiveElements.forEach(element => {
    element.addEventListener('mouseenter', function() {
      this.style.zIndex = '10';
    });
    
    element.addEventListener('mouseleave', function() {
      this.style.zIndex = '1';
    });
  });

  // Enhanced CTA button interactions
  const ctaButtons = document.querySelectorAll('.cta-button');
  
  ctaButtons.forEach(button => {
    // Add ripple effect
    button.addEventListener('click', function(e) {
      const ripple = document.createElement('span');
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.cssText = 'position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.6); transform: scale(0); animation: ripple 0.6s linear; width: ' + size + 'px; height: ' + size + 'px; left: ' + x + 'px; top: ' + y + 'px;';
      
      this.appendChild(ripple);
      
      setTimeout(() => {
        ripple.remove();
      }, 600);
    });

    // Add loading state
    button.addEventListener('click', function(e) {
      if (this.href && !this.href.includes('#')) {
        const originalText = this.innerHTML;
        this.innerHTML = '<span class="loading-spinner"></span>Loading...';
        this.style.pointerEvents = 'none';
        this.style.opacity = '0.8';
        
        // Simulate loading for demo purposes
        setTimeout(() => {
          this.innerHTML = originalText;
          this.style.pointerEvents = 'auto';
          this.style.opacity = '1';
        }, 2000);
      }
    });
  });

  // Add CSS for animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes ripple {
      to {
        transform: scale(4);
        opacity: 0;
      }
    }
    
    .loading-spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-right: 8px;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  // Smooth scrolling for anchor links
  const smoothScrollLinks = document.querySelectorAll('a[href^="#"]');
  
  smoothScrollLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // Performance optimization: Lazy load images
  const images = document.querySelectorAll('img[data-src]');
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.getAttribute('data-src');
        img.classList.remove('lazy');
        imageObserver.unobserve(img);
      }
    });
  });

  images.forEach(img => imageObserver.observe(img));

  // Add viewport checker for elements
  const viewportChecker = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
      }
    });
  }, { threshold: 0.3 });

  // Observe all interactive elements
  const allInteractiveElements = document.querySelectorAll('.feature-item, .vision-card, .platform-card, .tech-stat, .cta-button');
  allInteractiveElements.forEach(el => viewportChecker.observe(el));

  console.log('About page enhanced successfully!');
}

// Utility function for analytics tracking
function trackEvent(category, action, label) {
  if (typeof gtag !== 'undefined') {
    gtag('event', action, {
      'event_category': category,
      'event_label': label
    });
  }
  console.log('Event tracked:', category, action, label);
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initAboutPage, trackEvent };
} 
















// Timetable Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
  initTimetablePage();
});

function initTimetablePage() {
  // Add image zoom functionality
  const timetableImages = document.querySelectorAll('.timetable-image');
  
  timetableImages.forEach(img => {
    img.addEventListener('click', function() {
      this.classList.toggle('zoomed');
      
      if (this.classList.contains('zoomed')) {
        this.style.transform = 'scale(1.8)';
        this.style.zIndex = '1000';
        this.style.position = 'relative';
      } else {
        this.style.transform = 'scale(1)';
        this.style.zIndex = '1';
      }
    });
    
    // Close zoom when clicking outside
    document.addEventListener('click', function(e) {
      if (!img.contains(e.target) && img.classList.contains('zoomed')) {
        img.classList.remove('zoomed');
        img.style.transform = 'scale(1)';
        img.style.zIndex = '1';
      }
    });
  });

  // Add progress animation
  const progressFill = document.querySelector('.progress-fill');
  if (progressFill) {
    setTimeout(() => {
      progressFill.style.width = '53%';
    }, 500);
  }

  // Add download tracking
  const downloadButtons = document.querySelectorAll('.download-btn');
  
  downloadButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      const fileName = this.querySelector('.btn-text').textContent;
      console.log(`Downloading: ${fileName}`);
      
      // You can add analytics tracking here
      // trackDownload(fileName);
    });
  });

  // Add smooth scrolling for anchor links
  const smoothScrollLinks = document.querySelectorAll('a[href^="#"]');
  
  smoothScrollLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // Add hover effects for cards
  const timetableCards = document.querySelectorAll('.timetable-card');
  
  timetableCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.zIndex = '10';
    });
    
    card.addEventListener('mouseleave', function() {
      this.style.zIndex = '1';
    });
  });

  // Add loading animation for images
  const imageContainers = document.querySelectorAll('.image-container');
  
  imageContainers.forEach(container => {
    const img = container.querySelector('img');
    if (img) {
      img.style.opacity = '0';
      img.style.transition = 'opacity 0.5s ease';
      
      img.onload = function() {
        this.style.opacity = '1';
      };
      
      // Fallback in case image is already loaded
      if (img.complete) {
        img.style.opacity = '1';
      }
    }
  });

  console.log('Timetable page enhanced successfully!');
}

// Utility function for download tracking
function trackDownload(fileName) {
  if (typeof gtag !== 'undefined') {
    gtag('event', 'download', {
      'event_category': 'Timetable',
      'event_label': fileName
    });
  }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initTimetablePage, trackDownload };
}