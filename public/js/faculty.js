// Faculty Page JavaScript - Complete Fixed Version
document.addEventListener('DOMContentLoaded', function() {
    initFacultyPage();
});

function initFacultyPage() {
    console.log('Initializing faculty page...');
    
    // Initialize department navigation
    initDepartmentNavigation();
    
    // Initialize faculty cards with proper sizing and alignment
    initFacultyCards();
    
    // Initialize search functionality
    initSearchFunctionality();
    
    // Initialize smooth scrolling
    initSmoothScrolling();
    
    // Force initial layout calculation
    forceLayoutRecalculation();
}

function initDepartmentNavigation() {
    const deptButtons = document.querySelectorAll('.dept-btn');
    const deptSections = document.querySelectorAll('.department-section');
    
    if (deptButtons.length === 0 || deptSections.length === 0) {
        console.warn('Department navigation elements not found');
        return;
    }
    
    deptButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetDept = this.getAttribute('data-dept');
            
            if (!targetDept) {
                console.error('No data-dept attribute found on button');
                return;
            }
            
            // Update active button
            deptButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
            });
            this.classList.add('active');
            this.setAttribute('aria-selected', 'true');
            
            // Show target department
            deptSections.forEach(section => {
                section.classList.remove('active');
                section.setAttribute('aria-hidden', 'true');
                
                if (section.id === `${targetDept}-department`) {
                    section.classList.add('active');
                    section.setAttribute('aria-hidden', 'false');
                }
            });
            
            // Scroll to department section with smooth behavior
            const targetSection = document.getElementById(`${targetDept}-department`);
            if (targetSection) {
                setTimeout(() => {
                    targetSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }, 100);
            }
            
            // Re-initialize cards for the new department
            setTimeout(() => {
                initFacultyCards();
            }, 200);
            
            console.log(`Switched to ${targetDept} department`);
        });
    });
    
    console.log('Department navigation initialized');
}

function initFacultyCards() {
    const facultyCards = document.querySelectorAll('.faculty-card');
    
    if (facultyCards.length === 0) {
        console.warn('No faculty cards found');
        return;
    }
    
    facultyCards.forEach((card, index) => {
        // Ensure proper card sizing and alignment
        card.style.minHeight = '200px';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.justifyContent = 'center';
        card.style.alignItems = 'center';
        card.style.textAlign = 'center';
        
        // Fix badge text content and positioning
        const badge = card.querySelector('.faculty-badge');
        if (badge) {
            // Ensure full text is displayed without truncation
            badge.style.whiteSpace = 'nowrap';
            badge.style.overflow = 'visible';
            badge.style.textOverflow = 'clip';
            badge.style.maxWidth = 'none';
            badge.style.zIndex = '10';
            
            // Fix specific badge texts to show full position names
            const badgeText = badge.textContent.trim();
            if (badgeText.includes('Head Of Department')) {
                badge.textContent = 'Head of Department';
            }
            if (badgeText.includes('Assistant Professor')) {
                badge.textContent = 'Assistant Professor';
            }
            if (badgeText.includes('Associate Professor')) {
                badge.textContent = 'Associate Professor';
            }
            if (badgeText.includes('Professor')) {
                badge.textContent = 'Professor';
            }
            if (badgeText.includes('Director')) {
                badge.textContent = 'Director';
            }
            if (badgeText.includes('Principal')) {
                badge.textContent = 'Principal';
            }
        }
        
        // Ensure center alignment for all text content
        const facultyInfo = card.querySelector('.faculty-info');
        if (facultyInfo) {
            facultyInfo.style.textAlign = 'center';
            facultyInfo.style.display = 'flex';
            facultyInfo.style.flexDirection = 'column';
            facultyInfo.style.alignItems = 'center';
            facultyInfo.style.justifyContent = 'center';
            facultyInfo.style.width = '100%';
        }
        
        // Ensure individual text elements are centered
        const facultyName = card.querySelector('h3');
        const facultyDesignation = card.querySelector('.faculty-designation');
        const facultyDepartment = card.querySelector('.faculty-department');
        
        if (facultyName) {
            facultyName.style.textAlign = 'center';
            facultyName.style.width = '100%';
            facultyName.style.padding = '0 1rem';
            facultyName.style.marginBottom = '0.5rem';
        }
        
        if (facultyDesignation) {
            facultyDesignation.style.textAlign = 'center';
            facultyDesignation.style.width = '100%';
            facultyDesignation.style.padding = '0 1rem';
            facultyDesignation.style.marginBottom = '0.5rem';
        }
        
        if (facultyDepartment) {
            facultyDepartment.style.textAlign = 'center';
            facultyDepartment.style.width = '100%';
            facultyDepartment.style.padding = '0 1rem';
        }
        
        // Add hover effects
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px)';
            this.style.zIndex = '10';
            this.style.boxShadow = '0 20px 40px rgba(46, 139, 87, 0.4)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.zIndex = '1';
            this.style.boxShadow = '0 15px 35px rgba(46, 139, 87, 0.3)';
        });
        
        // Add loading animation with delay
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 50);
    });
    
    console.log(`Initialized ${facultyCards.length} faculty cards with fixed alignment`);
}

function initSearchFunctionality() {
    // Create search container
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    searchContainer.innerHTML = `
        <div class="search-box">
            <input type="text" id="faculty-search" placeholder="🔍 Search faculty members..." 
                   class="search-input" aria-label="Search faculty members">
            <button id="clear-search" class="clear-btn" aria-label="Clear search">✕</button>
        </div>
    `;
    
    // Insert search after department navigation
    const deptNav = document.querySelector('.department-nav');
    if (deptNav) {
        deptNav.parentNode.insertBefore(searchContainer, deptNav.nextSibling);
        addSearchStyles();
        setupSearchEventListeners();
    } else {
        console.warn('Department navigation not found for search placement');
    }
}

function addSearchStyles() {
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
            transition: all 0.3s ease;
        }
        
        .search-input:focus {
            outline: none;
            box-shadow: 0 0 0 3px rgba(46, 139, 87, 0.3);
            border-color: var(--sea-green);
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
            display: none;
        }
        
        .clear-btn:hover {
            background: var(--light-bg);
            color: var(--text);
        }
        
        .clear-btn:focus {
            outline: none;
            box-shadow: 0 0 0 2px var(--emerald);
        }
        
        .no-results-message {
            text-align: center;
            padding: 3rem 2rem;
            background: var(--card-bg);
            border-radius: 20px;
            border: 2px solid var(--emerald);
            margin: 2rem 0;
            grid-column: 1 / -1;
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
        
        .search-results-counter {
            text-align: center;
            color: var(--emerald);
            font-weight: 600;
            margin-bottom: 1rem;
            font-size: 0.9rem;
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = searchStyles;
    document.head.appendChild(styleSheet);
}

function setupSearchEventListeners() {
    const searchInput = document.getElementById('faculty-search');
    const clearBtn = document.getElementById('clear-search');
    
    if (!searchInput || !clearBtn) {
        console.warn('Search elements not found');
        return;
    }
    
    // Search input event
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        filterFacultyCardsWithSearch(searchTerm);
        
        // Show/hide clear button
        clearBtn.style.display = searchTerm ? 'block' : 'none';
        
        // Update URL without page reload (for sharing searches)
        updateSearchURL(searchTerm);
    });
    
    // Clear button event
    clearBtn.addEventListener('click', function() {
        searchInput.value = '';
        filterFacultyCardsWithSearch('');
        this.style.display = 'none';
        searchInput.focus();
        updateSearchURL('');
    });
    
    // Keyboard shortcuts
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            this.value = '';
            filterFacultyCardsWithSearch('');
            clearBtn.style.display = 'none';
        }
    });
    
    // Check for initial search term in URL
    const urlParams = new URLSearchParams(window.location.search);
    const initialSearch = urlParams.get('search');
    if (initialSearch) {
        searchInput.value = initialSearch;
        filterFacultyCardsWithSearch(initialSearch);
        clearBtn.style.display = 'block';
    }
    
    console.log('Search functionality initialized');
}

function filterFacultyCardsWithSearch(searchTerm) {
    const facultyCards = document.querySelectorAll('.faculty-card');
    const activeDepartment = document.querySelector('.department-section.active');
    let hasResults = false;
    let visibleCount = 0;
    
    if (!activeDepartment) {
        console.warn('No active department section found');
        return;
    }
    
    facultyCards.forEach(card => {
        // Only search within active department
        if (!activeDepartment.contains(card)) {
            card.style.display = 'none';
            return;
        }
        
        const facultyName = card.querySelector('h3')?.textContent.toLowerCase() || '';
        const facultyDept = card.querySelector('.faculty-department')?.textContent.toLowerCase() || '';
        const facultyDesignation = card.querySelector('.faculty-designation')?.textContent.toLowerCase() || '';
        
        const matches = facultyName.includes(searchTerm) || 
                       facultyDept.includes(searchTerm) || 
                       facultyDesignation.includes(searchTerm);
        
        if (matches || searchTerm === '') {
            card.style.display = 'flex';
            card.style.opacity = '1';
            // Ensure center alignment is maintained after search
            card.style.justifyContent = 'center';
            card.style.alignItems = 'center';
            card.style.textAlign = 'center';
            hasResults = true;
            visibleCount++;
            
            // Add highlight effect for search matches
            if (searchTerm && matches) {
                card.style.animation = 'highlightPulse 0.6s ease';
                setTimeout(() => {
                    card.style.animation = '';
                }, 600);
            }
        } else {
            card.style.display = 'none';
            card.style.opacity = '0';
        }
    });
    
    // Show/hide no results message
    showNoResultsMessage(!hasResults && searchTerm !== '');
    
    // Update search results counter
    updateSearchResultsCounter(visibleCount, searchTerm);
    
    // Force layout recalculation after filtering
    setTimeout(() => {
        forceCardsLayoutRecalculation();
    }, 50);
}

function showNoResultsMessage(show) {
    let noResultsMsg = document.querySelector('.no-results-message');
    const activeDepartment = document.querySelector('.department-section.active');
    
    if (!activeDepartment) return;
    
    if (show && !noResultsMsg) {
        noResultsMsg = document.createElement('div');
        noResultsMsg.className = 'no-results-message';
        noResultsMsg.innerHTML = `
            <div class="no-results-content">
                <div class="no-results-icon">🔍</div>
                <h3>No Faculty Members Found</h3>
                <p>Try adjusting your search terms or browse by department.</p>
                <button id="clear-search-results" class="cta-button secondary" style="margin-top: 1rem;">
                    Clear Search
                </button>
            </div>
        `;
        
        activeDepartment.querySelector('.faculty-cards').appendChild(noResultsMsg);
        
        // Add event listener to clear search button
        document.getElementById('clear-search-results').addEventListener('click', function() {
            const searchInput = document.getElementById('faculty-search');
            if (searchInput) {
                searchInput.value = '';
                filterFacultyCardsWithSearch('');
                document.getElementById('clear-search').style.display = 'none';
            }
        });
    } else if (!show && noResultsMsg) {
        noResultsMsg.remove();
    }
}

function updateSearchResultsCounter(visibleCount, searchTerm) {
    // Remove existing counter
    const existingCounter = document.querySelector('.search-results-counter');
    if (existingCounter) {
        existingCounter.remove();
    }
    
    if (searchTerm && visibleCount > 0) {
        const counter = document.createElement('div');
        counter.className = 'search-results-counter';
        counter.textContent = `Showing ${visibleCount} result${visibleCount !== 1 ? 's' : ''} for "${searchTerm}"`;
        
        const searchContainer = document.querySelector('.search-container');
        if (searchContainer) {
            searchContainer.appendChild(counter);
        }
    }
}

function updateSearchURL(searchTerm) {
    const url = new URL(window.location);
    if (searchTerm) {
        url.searchParams.set('search', searchTerm);
    } else {
        url.searchParams.delete('search');
    }
    window.history.replaceState({}, '', url);
}

function initSmoothScrolling() {
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
}

function forceLayoutRecalculation() {
    // Force proper layout calculation on page load
    setTimeout(() => {
        const facultyGrids = document.querySelectorAll('.faculty-cards');
        const departmentSections = document.querySelectorAll('.department-section');
        
        facultyGrids.forEach(grid => {
            if (grid) {
                // Trigger layout recalculation
                grid.style.display = 'none';
                void grid.offsetHeight; // Force reflow
                grid.style.display = 'grid';
            }
        });
        
        departmentSections.forEach(section => {
            if (section) {
                section.style.transform = 'translateZ(0)';
            }
        });
        
        console.log('Layout recalculation forced');
    }, 200);
}

function forceCardsLayoutRecalculation() {
    const facultyCards = document.querySelectorAll('.faculty-card');
    facultyCards.forEach(card => {
        void card.offsetHeight; // Force reflow for each card
    });
}

// Add highlight animation for search matches
const highlightAnimation = `
    @keyframes highlightPulse {
        0% { 
            box-shadow: 0 0 0 0 rgba(46, 139, 87, 0.7);
            transform: scale(1);
        }
        50% { 
            box-shadow: 0 0 0 10px rgba(46, 139, 87, 0.3);
            transform: scale(1.02);
        }
        100% { 
            box-shadow: 0 0 0 0 rgba(46, 139, 87, 0);
            transform: scale(1);
        }
    }
    
    /* Ensure badge text is always fully visible */
    .faculty-badge {
        white-space: nowrap !important;
        overflow: visible !important;
        text-overflow: clip !important;
        max-width: none !important;
    }
    
    /* Ensure text alignment is always centered */
    .faculty-info,
    .faculty-info h3,
    .faculty-designation,
    .faculty-department {
        text-align: center !important;
    }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = highlightAnimation;
document.head.appendChild(styleSheet);

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        initFacultyPage,
        filterFacultyCardsWithSearch,
        initDepartmentNavigation
    };
}

console.log('Faculty page JavaScript loaded successfully with alignment fixes');