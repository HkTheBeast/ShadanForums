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




























// Subject Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
  initSubjectPage();
});

function initSubjectPage() {
 // Q&A Collapsible Functionality - COMPLETELY FIXED
function initQAFunctionality() {
  const qaItems = document.querySelectorAll('.qa-item');
  
  qaItems.forEach(item => {
    const question = item.querySelector('.qa-question');
    const answer = item.querySelector('.qa-answer');
    const toggleIcon = question.querySelector('.toggle-icon');
    
    question.addEventListener('click', function() {
      // Close all other answers
      qaItems.forEach(otherItem => {
        if (otherItem !== item) {
          const otherQuestion = otherItem.querySelector('.qa-question');
          const otherAnswer = otherItem.querySelector('.qa-answer');
          const otherToggle = otherQuestion.querySelector('.toggle-icon');
          
          otherQuestion.classList.remove('active');
          otherAnswer.classList.remove('active');
          otherToggle.textContent = '+';
        }
      });
      
      // Toggle current item
      const isActive = question.classList.contains('active');
      
      if (isActive) {
        // Close current answer
        question.classList.remove('active');
        answer.classList.remove('active');
        toggleIcon.textContent = '+';
      } else {
        // Open current answer
        question.classList.add('active');
        answer.classList.add('active');
        toggleIcon.textContent = '−';
      }
    });
  });
  
  console.log('Q&A functionality initialized');
}

// Subject Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
  initSubjectPage();
});

function initSubjectPage() {
  // Initialize Q&A functionality
  initQAFunctionality();

  // Image zoom functionality
  const subjectImages = document.querySelectorAll('.syllabus-image, .lab-image');
  
  subjectImages.forEach(img => {
    img.addEventListener('click', function() {
      this.classList.toggle('zoomed');
      
      if (this.classList.contains('zoomed')) {
        this.style.transform = 'scale(1.8)';
        this.style.zIndex = '1000';
        this.style.position = 'relative';
        this.style.cursor = 'zoom-out';
      } else {
        this.style.transform = 'scale(1)';
        this.style.zIndex = '1';
        this.style.cursor = 'zoom-in';
      }
    });
    
    // Close zoom when clicking outside
    document.addEventListener('click', function(e) {
      if (!img.contains(e.target) && img.classList.contains('zoomed')) {
        img.classList.remove('zoomed');
        img.style.transform = 'scale(1)';
        img.style.zIndex = '1';
        img.style.cursor = 'zoom-in';
      }
    });
  });

  // Download button functionality - FIXED
  const downloadBtn = document.querySelector('.download-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', function(e) {
      // Prevent default only if we're handling the download manually
      e.preventDefault();
      
      // Get the download URL from href attribute
      const downloadUrl = this.getAttribute('href');
      const fileName = this.getAttribute('download') || 'OOPS_Notes.pdf';
      
      // Add loading state
      const originalText = this.innerHTML;
      this.innerHTML = '<span class="loading-spinner"></span> Downloading...';
      this.style.pointerEvents = 'none';
      this.style.opacity = '0.8';
      
      // Create a temporary anchor for download
      setTimeout(() => {
        try {
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Track download
          trackDownload(fileName);
          
          // Show success message
          this.innerHTML = '<span class="success-icon">✓</span> Downloaded!';
        } catch (error) {
          // Show error message
          this.innerHTML = '<span class="error-icon">✗</span> Failed!';
          console.error('Download failed:', error);
        }
        
        // Reset button after 2 seconds
        setTimeout(() => {
          this.innerHTML = originalText;
          this.style.pointerEvents = 'auto';
          this.style.opacity = '1';
        }, 2000);
      }, 1000);
    });
  }

  // Add scroll animations
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

  // Observe all cards and sections
  const animatedElements = document.querySelectorAll('.feature-card, .faculty-card, .notes-card, .overview-card');
  animatedElements.forEach(element => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(30px)';
    observer.observe(element);
  });

  console.log('Subject page enhanced successfully!');
}

// Utility function for download tracking
function trackDownload(fileName) {
  console.log(`Downloaded: ${fileName}`);
  
  // You can add analytics tracking here
  if (typeof gtag !== 'undefined') {
    gtag('event', 'download', {
      'event_category': 'Subject Materials',
      'event_label': fileName
    });
  }
}

// Add CSS for animations and states
const style = document.createElement('style');
style.textContent = `
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
  
  .success-icon {
    display: inline-block;
    margin-right: 8px;
    font-weight: bold;
    animation: bounce 0.5s ease;
  }
  
  .error-icon {
    display: inline-block;
    margin-right: 8px;
    font-weight: bold;
    color: var(--crimson);
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes bounce {
    0%, 20%, 60%, 100% { transform: translateY(0); }
    40% { transform: translateY(-5px); }
    80% { transform: translateY(-2px); }
  }
`;
document.head.appendChild(style);

// Mobile Dropdown Fix
(function(){
  const dropdowns = document.querySelectorAll('.dropdown');
  
  dropdowns.forEach(dropdown => {
    dropdown.addEventListener('click', function(e) {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        e.stopPropagation();
        
        this.classList.toggle('active');
        
        dropdowns.forEach(otherDropdown => {
          if (otherDropdown !== this) {
            otherDropdown.classList.remove('active');
          }
        });
      }
    });
  });
  
  document.addEventListener('click', function(e) {
    if (window.innerWidth <= 768) {
      if (!e.target.closest('.dropdown')) {
        dropdowns.forEach(dropdown => {
          dropdown.classList.remove('active');
        });
      }
    }
  });

  window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
      dropdowns.forEach(dropdown => {
        dropdown.classList.remove('active');
      });
    }
  });
})();
  // Image zoom functionality
  const subjectImages = document.querySelectorAll('.syllabus-image, .lab-image');
  
  subjectImages.forEach(img => {
    img.addEventListener('click', function() {
      this.classList.toggle('zoomed');
      
      if (this.classList.contains('zoomed')) {
        this.style.transform = 'scale(1.8)';
        this.style.zIndex = '1000';
        this.style.position = 'relative';
        this.style.cursor = 'zoom-out';
      } else {
        this.style.transform = 'scale(1)';
        this.style.zIndex = '1';
        this.style.cursor = 'zoom-in';
      }
    });
    
    // Close zoom when clicking outside
    document.addEventListener('click', function(e) {
      if (!img.contains(e.target) && img.classList.contains('zoomed')) {
        img.classList.remove('zoomed');
        img.style.transform = 'scale(1)';
        img.style.zIndex = '1';
        img.style.cursor = 'zoom-in';
      }
    });
  });

  // Download button functionality - FIXED
  const downloadBtn = document.querySelector('.download-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', function(e) {
      // Prevent default only if we're handling the download manually
      e.preventDefault();
      
      // Get the download URL from href attribute
      const downloadUrl = this.getAttribute('href');
      const fileName = this.getAttribute('download') || 'OOPS_Notes.pdf';
      
      // Add loading state
      const originalText = this.innerHTML;
      this.innerHTML = '<span class="loading-spinner"></span> Downloading...';
      this.style.pointerEvents = 'none';
      this.style.opacity = '0.8';
      
      // Create a temporary anchor for download
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Track download
        trackDownload(fileName);
        
        // Show success message
        this.innerHTML = '<span class="success-icon">✓</span> Downloaded!';
        
        // Reset button after 2 seconds
        setTimeout(() => {
          this.innerHTML = originalText;
          this.style.pointerEvents = 'auto';
          this.style.opacity = '1';
        }, 2000);
      }, 1000);
    });
  }

  // Add scroll animations
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

  // Observe all cards and sections
  const animatedElements = document.querySelectorAll('.feature-card, .faculty-card, .notes-card, .overview-card');
  animatedElements.forEach(element => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(30px)';
    observer.observe(element);
  });

  console.log('Subject page enhanced successfully!');
}

// Utility function for download tracking
function trackDownload(fileName) {
  console.log(`Downloaded: ${fileName}`);
  
  // You can add analytics tracking here
  if (typeof gtag !== 'undefined') {
    gtag('event', 'download', {
      'event_category': 'Subject Materials',
      'event_label': fileName
    });
  }
}

// Mobile Dropdown Fix
(function(){
  const dropdowns = document.querySelectorAll('.dropdown');
  
  dropdowns.forEach(dropdown => {
    dropdown.addEventListener('click', function(e) {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        e.stopPropagation();
        
        this.classList.toggle('active');
        
        dropdowns.forEach(otherDropdown => {
          if (otherDropdown !== this) {
            otherDropdown.classList.remove('active');
          }
        });
      }
    });
  });
  
  document.addEventListener('click', function(e) {
    if (window.innerWidth <= 768) {
      if (!e.target.closest('.dropdown')) {
        dropdowns.forEach(dropdown => {
          dropdown.classList.remove('active');
        });
      }
    }
  });

  window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
      dropdowns.forEach(dropdown => {
        dropdown.classList.remove('active');
      });
    }
  });
})();
// PDF Viewer Enhancement with Scroll Fix
function initPDFViewer() {
  const pdfPreview = document.querySelector('.pdf-preview');
  
  if (pdfPreview) {
    // Add loading state for PDF
    pdfPreview.addEventListener('load', function() {
      console.log('PDF loaded successfully');
      // Ensure PDF is scrollable
      this.style.height = '450px';
      this.style.overflow = 'auto';
    });
    
    pdfPreview.addEventListener('error', function() {
      console.error('Failed to load PDF');
      const container = this.parentElement;
      container.innerHTML = `
        <div class="pdf-placeholder">
          <div class="pdf-icon">📄</div>
          <h3>PDF Preview Not Available</h3>
          <p>The notes PDF could not be loaded in the preview. Please download the file to view it.</p>
          <div class="file-info">
            <span class="file-size">~2.5 MB</span>
            <span class="file-pages">45 Pages</span>
          </div>
        </div>
      `;
    });
    
    // Force PDF to be scrollable
    setTimeout(() => {
      if (pdfPreview.contentDocument) {
        pdfPreview.style.overflow = 'auto';
      }
    }, 1000);
  }
}

// Enhanced Image Zoom with Smaller Default Sizes
function initImageZoom() {
  const subjectImages = document.querySelectorAll('.syllabus-image, .lab-image, .answer-content img');
  
  subjectImages.forEach(img => {
    // Set smaller default sizes
    if (img.classList.contains('syllabus-image')) {
      img.style.maxWidth = '600px';
    } else if (img.classList.contains('lab-image')) {
      img.style.maxWidth = '500px';
    } else {
      img.style.maxWidth = '400px';
    }
    
    img.addEventListener('click', function() {
      const isZoomed = this.classList.contains('zoomed');
      
      // Remove zoom from all other images
      subjectImages.forEach(otherImg => {
        if (otherImg !== this && otherImg.classList.contains('zoomed')) {
          otherImg.classList.remove('zoomed');
          otherImg.style.transform = 'scale(1)';
          otherImg.style.maxWidth = '';
          otherImg.style.zIndex = '1';
          otherImg.style.position = 'relative';
          otherImg.style.cursor = 'zoom-in';
        }
      });
      
      if (!isZoomed) {
        // Zoom in
        this.classList.add('zoomed');
        this.style.transform = 'scale(1.5)';
        this.style.maxWidth = '90vw';
        this.style.zIndex = '1000';
        this.style.position = 'fixed';
        this.style.top = '50%';
        this.style.left = '50%';
        this.style.transform = 'translate(-50%, -50%) scale(1.2)';
        this.style.cursor = 'zoom-out';
        this.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.5)';
      } else {
        // Zoom out
        this.classList.remove('zoomed');
        this.style.transform = 'scale(1)';
        this.style.maxWidth = '';
        this.style.zIndex = '1';
        this.style.position = 'relative';
        this.style.top = 'auto';
        this.style.left = 'auto';
        this.style.transform = 'none';
        this.style.cursor = 'zoom-in';
        this.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
      }
    });
    
    // Close zoom when clicking outside
    document.addEventListener('click', function(e) {
      if (!img.contains(e.target) && img.classList.contains('zoomed')) {
        img.classList.remove('zoomed');
        img.style.transform = 'scale(1)';
        img.style.maxWidth = '';
        img.style.zIndex = '1';
        img.style.position = 'relative';
        img.style.top = 'auto';
        img.style.left = 'auto';
        img.style.transform = 'none';
        img.style.cursor = 'zoom-in';
        img.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
      }
    });
    
    // Close zoom with Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && img.classList.contains('zoomed')) {
        img.classList.remove('zoomed');
        img.style.transform = 'scale(1)';
        img.style.maxWidth = '';
        img.style.zIndex = '1';
        img.style.position = 'relative';
        img.style.top = 'auto';
        img.style.left = 'auto';
        img.style.transform = 'none';
        img.style.cursor = 'zoom-in';
        img.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
      }
    });
  });
}

// Updated Subject Page Initialization
function initSubjectPage() {
  // Initialize Q&A functionality
  initQAFunctionality();

  // Initialize PDF viewer
  initPDFViewer();

  // Initialize image zoom with smaller sizes
  initImageZoom();

  // Download button functionality
  const downloadBtn = document.querySelector('.download-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', function(e) {
      e.preventDefault();
      
      const downloadUrl = this.getAttribute('href');
      const fileName = this.getAttribute('download') || 'OOPS_Notes.pdf';
      
      const originalText = this.innerHTML;
      this.innerHTML = '<span class="loading-spinner"></span> Downloading...';
      this.style.pointerEvents = 'none';
      this.style.opacity = '0.8';
      
      setTimeout(() => {
        try {
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          trackDownload(fileName);
          this.innerHTML = '<span class="success-icon">✓</span> Downloaded!';
        } catch (error) {
          this.innerHTML = '<span class="error-icon">✗</span> Failed!';
          console.error('Download failed:', error);
        }
        
        setTimeout(() => {
          this.innerHTML = originalText;
          this.style.pointerEvents = 'auto';
          this.style.opacity = '1';
        }, 2000);
      }, 1000);
    });
  }

  // Add scroll animations
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

  const animatedElements = document.querySelectorAll('.feature-card, .faculty-card, .notes-card, .overview-card');
  animatedElements.forEach(element => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(30px)';
    observer.observe(element);
  });

  console.log('Subject page enhanced successfully!');
}




















// ===== NEW MOBILE DROPDOWN JS =====
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 NEW MOBILE DROPDOWN SYSTEM');
  
  const mobileDropdowns = document.querySelectorAll('.mobile-dropdown');
  
  mobileDropdowns.forEach(dropdown => {
    const button = dropdown.querySelector('.mobile-dropdown-btn');
    const menu = dropdown.querySelector('.mobile-dropdown-menu');
    
    if (button && menu) {
      button.addEventListener('click', function(e) {
        e.stopPropagation();
        
        // Close all other dropdowns
        mobileDropdowns.forEach(other => {
          if (other !== dropdown) {
            other.classList.remove('open');
          }
        });
        
        // Toggle this dropdown
        dropdown.classList.toggle('open');
        console.log('📱 Dropdown toggled:', dropdown.classList.contains('open'));
      });
      
      // Close when clicking links
      const links = menu.querySelectorAll('.mobile-dropdown-link');
      links.forEach(link => {
        link.addEventListener('click', function() {
          dropdown.classList.remove('open');
        });
      });
    }
  });
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', function() {
    mobileDropdowns.forEach(dropdown => {
      dropdown.classList.remove('open');
    });
  });
});














// About Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
  initAboutPage();
});

function initAboutPage() {
  // Initialize animations and interactions
  addScrollAnimations();
  addImageZoom();
  addInteractiveElements();
  console.log('About page enhanced successfully!');
}

function addScrollAnimations() {
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
}

function addImageZoom() {
  // Add image zoom functionality
  const images = document.querySelectorAll('.responsive-image');
  
  images.forEach(img => {
    img.addEventListener('click', function() {
      this.classList.toggle('zoomed');
      
      if (this.classList.contains('zoomed')) {
        this.style.transform = 'scale(1.5)';
        this.style.zIndex = '1000';
        this.style.position = 'relative';
        this.style.cursor = 'zoom-out';
      } else {
        this.style.transform = 'scale(1)';
        this.style.zIndex = '1';
        this.style.cursor = 'zoom-in';
      }
    });
    
    // Close zoom when clicking outside
    document.addEventListener('click', function(e) {
      if (!img.contains(e.target) && img.classList.contains('zoomed')) {
        img.classList.remove('zoomed');
        img.style.transform = 'scale(1)';
        img.style.zIndex = '1';
        img.style.cursor = 'zoom-in';
      }
    });
  });
}

function addInteractiveElements() {
  // Add hover effects for interactive elements
  const interactiveElements = document.querySelectorAll('.feature-item, .vision-card');
  
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
        }, 1500);
      }
    });
  });

  // Add CSS for animations
  const style = document.createElement('style');
  style.textContent = `
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
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initAboutPage };
}














// More Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
  initMorePage();
});

function initMorePage() {
  // Initialize animations
  addScrollAnimations();
  addCardInteractions();
  addResourceTracking();
  console.log('More page enhanced successfully!');
}

function addScrollAnimations() {
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

  // Observe all resource cards
  const resourceCards = document.querySelectorAll('.resource-card');
  resourceCards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transitionDelay = `${index * 0.1}s`;
    observer.observe(card);
  });

  // Observe stats cards
  const statCards = document.querySelectorAll('.stat-card');
  statCards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transitionDelay = `${index * 0.15}s`;
    observer.observe(card);
  });
}

function addCardInteractions() {
  // Add enhanced hover effects for resource cards
  const resourceCards = document.querySelectorAll('.resource-card');
  
  resourceCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.zIndex = '10';
    });
    
    card.addEventListener('mouseleave', function() {
      this.style.zIndex = '1';
    });
    
    // Add click tracking
    const link = this.querySelector('.resource-link');
    if (link) {
      link.addEventListener('click', function(e) {
        const resourceName = this.closest('.resource-card').querySelector('h3').textContent;
        trackResourceClick(resourceName);
      });
    }
  });
}

function addResourceTracking() {
  // Track resource clicks for analytics
  const resourceLinks = document.querySelectorAll('.resource-link');
  
  resourceLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      const resourceName = this.closest('.resource-card').querySelector('h3').textContent;
      trackResourceClick(resourceName);
    });
  });
}

function trackResourceClick(resourceName) {
  console.log(`Resource accessed: ${resourceName}`);
  
  // You can add analytics tracking here
  if (typeof gtag !== 'undefined') {
    gtag('event', 'resource_click', {
      'event_category': 'More Page',
      'event_label': resourceName
    });
  }
}

// Enhanced loading animation for hero section
function initHeroAnimation() {
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
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initMorePage();
  initHeroAnimation();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initMorePage, trackResourceClick };
}










// Achievements Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
  initAchievementsPage();
});

function initAchievementsPage() {
  // Initialize animations
  addScrollAnimations();
  addAchievementInteractions();
  addCounterAnimations();
  console.log('Achievements page enhanced successfully!');
}

function addScrollAnimations() {
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
        
        // Animate numbers if it's a stat element
        if (entry.target.classList.contains('legacy-stat')) {
          animateCounter(entry.target);
        }
      }
    });
  }, observerOptions);

  // Observe all achievement categories
  const achievementCategories = document.querySelectorAll('.achievement-category');
  achievementCategories.forEach((category, index) => {
    category.style.opacity = '0';
    category.style.transform = 'translateY(30px)';
    category.style.transitionDelay = `${index * 0.1}s`;
    observer.observe(category);
  });

  // Observe legacy stats
  const legacyStats = document.querySelectorAll('.legacy-stat');
  legacyStats.forEach(stat => {
    stat.style.opacity = '0';
    stat.style.transform = 'translateY(20px)';
    observer.observe(stat);
  });
}

function addAchievementInteractions() {
  // Add enhanced hover effects for achievement items
  const achievementItems = document.querySelectorAll('.achievement-item');
  
  achievementItems.forEach(item => {
    item.addEventListener('mouseenter', function() {
      this.style.zIndex = '5';
    });
    
    item.addEventListener('mouseleave', function() {
      this.style.zIndex = '1';
    });
  });

  // Add click effects for company tags
  const companyTags = document.querySelectorAll('.company-tag');
  
  companyTags.forEach(tag => {
    tag.addEventListener('click', function() {
      this.style.transform = 'scale(0.95)';
      setTimeout(() => {
        this.style.transform = '';
      }, 150);
    });
  });
}

function addCounterAnimations() {
  // Animate the legacy stats numbers
  const legacyStats = document.querySelectorAll('.legacy-stat');
  
  legacyStats.forEach(stat => {
    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    
    observer.observe(stat);
  });
}

function animateCounter(statElement) {
  const numberElement = statElement.querySelector('.legacy-number');
  const originalText = numberElement.textContent;
  
  // Check if it's a number or year
  if (originalText.includes('+') || originalText.includes('-') || !isNaN(originalText.replace('%', ''))) {
    const number = parseInt(originalText.replace(/[^0-9]/g, ''));
    const isPercentage = originalText.includes('%');
    const isRange = originalText.includes('-');
    
    if (!isNaN(number)) {
      let current = 0;
      const increment = number / 30; // Animate over 30 steps
      const timer = setInterval(() => {
        current += increment;
        if (current >= number) {
          current = number;
          clearInterval(timer);
        }
        
        if (isRange && isPercentage) {
          numberElement.textContent = `70-${Math.floor(current)}%`;
        } else if (isPercentage) {
          numberElement.textContent = `${Math.floor(current)}%`;
        } else if (isRange) {
          numberElement.textContent = `70-${Math.floor(current)}`;
        } else {
          numberElement.textContent = Math.floor(current);
        }
      }, 50);
    }
  }
}

// Enhanced loading animation for hero section
function initHeroAnimation() {
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
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initAchievementsPage();
  initHeroAnimation();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initAchievementsPage, animateCounter };
}



// Campus Facilities Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
  initCampusPage();
});

function initCampusPage() {
  // Initialize animations
  addScrollAnimations();
  addImageZoom();
  addFacilityInteractions();
  console.log('Campus facilities page enhanced successfully!');
}

function addScrollAnimations() {
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

  // Observe all facility cards
  const facilityCards = document.querySelectorAll('.facility-card');
  facilityCards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transitionDelay = `${index * 0.1}s`;
    observer.observe(card);
  });

  // Observe showcase image
  const showcaseImage = document.querySelector('.showcase-image');
  if (showcaseImage) {
    showcaseImage.style.opacity = '0';
    showcaseImage.style.transform = 'scale(0.95)';
    showcaseImage.style.transition = 'all 0.8s ease 0.2s';
    observer.observe(showcaseImage);
  }
}

function addImageZoom() {
  // Add image zoom functionality for facility images
  const facilityImages = document.querySelectorAll('.facility-image img');
  
  facilityImages.forEach(img => {
    img.addEventListener('click', function() {
      this.classList.toggle('zoomed');
      
      if (this.classList.contains('zoomed')) {
        this.style.transform = 'scale(1.5)';
        this.style.zIndex = '1000';
        this.style.position = 'relative';
        this.style.cursor = 'zoom-out';
      } else {
        this.style.transform = 'scale(1)';
        this.style.zIndex = '1';
        this.style.cursor = 'zoom-in';
      }
    });
    
    // Close zoom when clicking outside
    document.addEventListener('click', function(e) {
      if (!img.contains(e.target) && img.classList.contains('zoomed')) {
        img.classList.remove('zoomed');
        img.style.transform = 'scale(1)';
        img.style.zIndex = '1';
        img.style.cursor = 'zoom-in';
      }
    });
  });
}

function addFacilityInteractions() {
  // Add enhanced hover effects for facility cards
  const facilityCards = document.querySelectorAll('.facility-card');
  
  facilityCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.zIndex = '10';
    });
    
    card.addEventListener('mouseleave', function() {
      this.style.zIndex = '1';
    });
  });

  // Add click tracking for highlights
  const highlightItems = document.querySelectorAll('.highlight-item');
  
  highlightItems.forEach(item => {
    item.addEventListener('click', function() {
      const highlightText = this.querySelector('.highlight-text').textContent;
      trackFacilityView(highlightText);
    });
  });
}

function trackFacilityView(facilityName) {
  console.log(`Facility viewed: ${facilityName}`);
  
  // You can add analytics tracking here
  if (typeof gtag !== 'undefined') {
    gtag('event', 'facility_view', {
      'event_category': 'Campus Facilities',
      'event_label': facilityName
    });
  }
}

// Enhanced loading animation for hero section
function initHeroAnimation() {
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
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initCampusPage();
  initHeroAnimation();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initCampusPage, trackFacilityView };
}











// FAQ Page JavaScript - SIMPLE & ISOLATED
document.addEventListener('DOMContentLoaded', function() {
    initFAQPage();
});

function initFAQPage() {
    console.log('Initializing FAQ page...');
    
    const questionBlocks = document.querySelectorAll('.faq-question-block');
    
    questionBlocks.forEach(block => {
        const questionBtn = block.querySelector('.faq-question-btn');
        const answerPanel = block.querySelector('.faq-answer-panel');
        const indicator = block.querySelector('.faq-indicator');
        
        questionBtn.addEventListener('click', function() {
            console.log('Question clicked');
            
            const isActive = questionBtn.classList.contains('active');
            
            // Close all other questions
            questionBlocks.forEach(otherBlock => {
                if (otherBlock !== block) {
                    const otherBtn = otherBlock.querySelector('.faq-question-btn');
                    const otherPanel = otherBlock.querySelector('.faq-answer-panel');
                    const otherIndicator = otherBlock.querySelector('.faq-indicator');
                    
                    otherBtn.classList.remove('active');
                    otherPanel.classList.remove('active');
                    otherIndicator.textContent = '+';
                }
            });
            
            // Toggle current question
            if (isActive) {
                // Close
                questionBtn.classList.remove('active');
                answerPanel.classList.remove('active');
                indicator.textContent = '+';
            } else {
                // Open
                questionBtn.classList.add('active');
                answerPanel.classList.add('active');
                indicator.textContent = '−';
            }
        });
    });
    
    console.log('FAQ page initialized with', questionBlocks.length, 'questions');
}

// Test function
function testFAQ() {
    const blocks = document.querySelectorAll('.faq-question-block');
    console.log('Testing FAQ - Found', blocks.length, 'question blocks');
    
    blocks.forEach((block, index) => {
        const btn = block.querySelector('.faq-question-btn');
        const panel = block.querySelector('.faq-answer-panel');
        console.log(`Block ${index + 1}:`, {
            hasButton: !!btn,
            hasPanel: !!panel,
            isActive: btn.classList.contains('active')
        });
    });
}

// Run test after initialization
setTimeout(testFAQ, 500);













// Viva Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
  initVivaPage();
});

function initVivaPage() {
  console.log('🚀 Initializing Viva Page...');
  
  // Initialize subject navigation
  initSubjectNavigation();
  
  // Initialize animations
  initVivaAnimations();
  
  // Initialize question interactions
  initQuestionInteractions();
  
  console.log('✅ Viva page initialized successfully!');
}

function initSubjectNavigation() {
  const subjectButtons = document.querySelectorAll('.viva-subject-btn');
  const subjectSections = document.querySelectorAll('.viva-subject-section');
  
  subjectButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetSubject = this.getAttribute('data-subject');
      
      // Remove active class from all buttons and sections
      subjectButtons.forEach(btn => btn.classList.remove('active'));
      subjectSections.forEach(section => section.classList.remove('active'));
      
      // Add active class to clicked button
      this.classList.add('active');
      
      // Show corresponding section
      const targetSection = document.getElementById(`viva-${targetSubject}-section`);
      if (targetSection) {
        targetSection.classList.add('active');
        
        // Track subject change for analytics
        trackSubjectChange(targetSubject);
      }
    });
  });
}

function initVivaAnimations() {
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

  // Observe all question items
  const questionItems = document.querySelectorAll('.viva-question-item');
  questionItems.forEach((item, index) => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(20px)';
    item.style.transitionDelay = `${index * 0.1}s`;
    observer.observe(item);
  });

  // Observe stats cards
  const statCards = document.querySelectorAll('.viva-stat-card');
  statCards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transitionDelay = `${index * 0.15}s`;
    observer.observe(card);
  });

  // Observe tip cards
  const tipCards = document.querySelectorAll('.viva-tip-card');
  tipCards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transitionDelay = `${index * 0.2}s`;
    observer.observe(card);
  });
}

function initQuestionInteractions() {
  const questionItems = document.querySelectorAll('.viva-question-item');
  
  questionItems.forEach(item => {
    // Add click to copy functionality
    item.addEventListener('click', function(e) {
      // Don't trigger if clicking on a button or link
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') return;
      
      // Toggle active state for visual feedback
      this.classList.toggle('viva-question-active');
      
      // Copy question and answer to clipboard
      copyQuestionToClipboard(this);
    });
    
    // Add hover effects
    item.addEventListener('mouseenter', function() {
      this.style.zIndex = '5';
    });
    
    item.addEventListener('mouseleave', function() {
      this.style.zIndex = '1';
    });
  });
}

function copyQuestionToClipboard(questionElement) {
  const questionHeader = questionElement.querySelector('.viva-question-header h3');
  const answerContent = questionElement.querySelector('.viva-answer-content');
  
  if (questionHeader && answerContent) {
    const questionText = questionHeader.textContent;
    const answerText = answerContent.textContent;
    const textToCopy = `Question: ${questionText}\n\nAnswer: ${answerText}`;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      // Show temporary success feedback
      showCopyFeedback(questionElement);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  }
}

function showCopyFeedback(element) {
  const originalBackground = element.style.background;
  
  // Highlight the element
  element.style.background = 'var(--light-bg)';
  element.style.borderColor = 'var(--crimson)';
  
  // Reset after 1 second
  setTimeout(() => {
    element.style.background = originalBackground;
    element.style.borderColor = 'var(--emerald)';
  }, 1000);
}

function trackSubjectChange(subject) {
  console.log(`Subject changed to: ${subject}`);
  
  // You can add analytics tracking here
  if (typeof gtag !== 'undefined') {
    gtag('event', 'subject_change', {
      'event_category': 'Viva Page',
      'event_label': subject
    });
  }
}

// Enhanced loading animation for hero section
function initHeroAnimation() {
  const heroContent = document.querySelector('.viva-hero-content');
  if (heroContent) {
    heroContent.style.opacity = '0';
    heroContent.style.transform = 'translateY(20px)';
    heroContent.style.transition = 'all 1s ease';
    
    setTimeout(() => {
      heroContent.style.opacity = '1';
      heroContent.style.transform = 'translateY(0)';
    }, 300);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initVivaPage();
  initHeroAnimation();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initVivaPage, trackSubjectChange };
}

// Mobile Dropdown Fix (reuse from main.js)
(function(){
  const dropdowns = document.querySelectorAll('.dropdown');
  
  dropdowns.forEach(dropdown => {
    dropdown.addEventListener('click', function(e) {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        e.stopPropagation();
        
        this.classList.toggle('active');
        
        dropdowns.forEach(otherDropdown => {
          if (otherDropdown !== this) {
            otherDropdown.classList.remove('active');
          }
        });
      }
    });
  });
  
  document.addEventListener('click', function(e) {
    if (window.innerWidth <= 768) {
      if (!e.target.closest('.dropdown')) {
        dropdowns.forEach(dropdown => {
          dropdown.classList.remove('active');
        });
      }
    }
  });

  window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
      dropdowns.forEach(dropdown => {
        dropdown.classList.remove('active');
      });
    }
  });
})();