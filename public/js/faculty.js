// Faculty Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
  initFacultyPage();
});

function initFacultyPage() {
  // Department navigation functionality
  const deptButtons = document.querySelectorAll('.dept-btn');
  const deptSections = document.querySelectorAll('.department-section');
  
  deptButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetDept = this.getAttribute('data-dept');
      
      // Update active button
      deptButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      
      // Show target department
      deptSections.forEach(section => {
        section.classList.remove('active');
        if (section.id === `${targetDept}-department`) {
          section.classList.add('active');
        }
      });
      
      // Scroll to department section
      const targetSection = document.getElementById(`${targetDept}-department`);
      if (targetSection) {
        targetSection.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // Add hover effects for faculty cards
  const facultyCards = document.querySelectorAll('.faculty-card');
  
  facultyCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.zIndex = '10';
    });
    
    card.addEventListener('mouseleave', function() {
      this.style.zIndex = '1';
    });
  });

  // Add search functionality (optional enhancement)
  addSearchFunctionality();
  
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

  console.log('Faculty page enhanced successfully!');
}

// Optional: Add search functionality for faculty
function addSearchFunctionality() {
  // Create search container
  const searchContainer = document.createElement('div');
  searchContainer.className = 'search-container';
  searchContainer.innerHTML = `
    <div class="search-box">
      <input type="text" id="faculty-search" placeholder="🔍 Search faculty members..." class="search-input">
      <button id="clear-search" class="clear-btn">✕</button>
    </div>
  `;
  
  // Insert search after department navigation
  const deptNav = document.querySelector('.department-nav');
  if (deptNav) {
    deptNav.parentNode.insertBefore(searchContainer, deptNav.nextSibling);
    
    // Add search styles
    const searchStyles = `
      .search-container {
        max-width: 500px;
        margin: 0 auto 3rem auto;
        padding: 0 1rem;
      }
      
      .search-box {
        position: relative;
        display: flex;
        align-items: center;
      }
      
      .search-input {
        width: 100%;
        padding: 1rem 1.5rem;
        background: var(--card-bg);
        border: 2px solid var(--emerald);
        border-radius: 50px;
        color: var(--text);
        font-size: 1rem;
        font-family: 'Inter', sans-serif;
        backdrop-filter: blur(10px);
      }
      
      .search-input:focus {
        outline: none;
        box-shadow: 0 0 0 3px rgba(46, 139, 87, 0.3);
      }
      
      .search-input::placeholder {
        color: var(--muted);
      }
      
      .clear-btn {
        position: absolute;
        right: 1rem;
        background: none;
        border: none;
        color: var(--muted);
        cursor: pointer;
        font-size: 1.2rem;
        padding: 0.5rem;
        border-radius: 50%;
        transition: all 0.3s ease;
      }
      
      .clear-btn:hover {
        background: var(--light-bg);
        color: var(--text);
      }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = searchStyles;
    document.head.appendChild(styleSheet);
    
    // Add search functionality
    const searchInput = document.getElementById('faculty-search');
    const clearBtn = document.getElementById('clear-search');
    
    if (searchInput && clearBtn) {
      searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        filterFaculty(searchTerm);
        
        // Show/hide clear button
        clearBtn.style.display = searchTerm ? 'block' : 'none';
      });
      
      clearBtn.addEventListener('click', function() {
        searchInput.value = '';
        filterFaculty('');
        this.style.display = 'none';
        searchInput.focus();
      });
    }
  }
}

// Filter faculty based on search term
function filterFaculty(searchTerm) {
  const facultyCards = document.querySelectorAll('.faculty-card');
  let hasResults = false;
  
  facultyCards.forEach(card => {
    const facultyName = card.querySelector('h3').textContent.toLowerCase();
    const facultyDept = card.querySelector('.faculty-department').textContent.toLowerCase();
    const facultyDesignation = card.querySelector('.faculty-designation').textContent.toLowerCase();
    
    const matches = facultyName.includes(searchTerm) || 
                   facultyDept.includes(searchTerm) || 
                   facultyDesignation.includes(searchTerm);
    
    if (matches || searchTerm === '') {
      card.style.display = 'block';
      hasResults = true;
    } else {
      card.style.display = 'none';
    }
  });
  
  // Show no results message if needed
  showNoResultsMessage(!hasResults && searchTerm !== '');
}

// Show/hide no results message
function showNoResultsMessage(show) {
  let noResultsMsg = document.querySelector('.no-results-message');
  
  if (show && !noResultsMsg) {
    noResultsMsg = document.createElement('div');
    noResultsMsg.className = 'no-results-message';
    noResultsMsg.innerHTML = `
      <div class="no-results-content">
        <div class="no-results-icon">🔍</div>
        <h3>No Faculty Members Found</h3>
        <p>Try adjusting your search terms or browse by department.</p>
      </div>
    `;
    
    // Add styles for no results message
    const noResultsStyles = `
      .no-results-message {
        text-align: center;
        padding: 3rem 2rem;
        background: var(--card-bg);
        border-radius: 20px;
        border: 2px solid var(--emerald);
        margin: 2rem 0;
      }
      
      .no-results-content .no-results-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
      }
      
      .no-results-content h3 {
        color: var(--emerald);
        margin-bottom: 1rem;
        font-size: 1.5rem;
      }
      
      .no-results-content p {
        color: var(--muted);
      }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = noResultsStyles;
    document.head.appendChild(styleSheet);
    
    const facultyCards = document.querySelector('.faculty-cards');
    if (facultyCards) {
      facultyCards.parentNode.insertBefore(noResultsMsg, facultyCards);
    }
  } else if (!show && noResultsMsg) {
    noResultsMsg.remove();
  }
}