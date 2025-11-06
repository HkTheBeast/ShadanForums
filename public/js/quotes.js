// Quotes Wall JavaScript with Backend Integration
document.addEventListener('DOMContentLoaded', function() {
    loadQuotes();
});

// Track user's liked quotes in localStorage to prevent multiple likes
function getLikedQuotes() {
    const liked = localStorage.getItem('likedQuotes');
    return liked ? JSON.parse(liked) : [];
}

function saveLikedQuote(quoteId) {
    const liked = getLikedQuotes();
    if (!liked.includes(quoteId)) {
        liked.push(quoteId);
        localStorage.setItem('likedQuotes', JSON.stringify(liked));
    }
}

function removeLikedQuote(quoteId) {
    let liked = getLikedQuotes();
    liked = liked.filter(id => id !== quoteId);
    localStorage.setItem('likedQuotes', JSON.stringify(liked));
}

function isQuoteLiked(quoteId) {
    return getLikedQuotes().includes(quoteId);
}

async function loadQuotes() {
    const quotesGrid = document.getElementById('quotes-grid');
    
    // Show loading state
    quotesGrid.innerHTML = '<div class="loading-state">Loading quotes...</div>';
    
    try {
        // Fetch quotes from your backend
        const response = await fetch('/api/quotes');
        const data = await response.json();
        
        if (!data.ok) {
            throw new Error(data.error || 'Failed to load quotes');
        }
        
        const quotes = data.quotes;
        
        // Clear loading state
        quotesGrid.innerHTML = '';
        
        // Create quote cards
        quotes.forEach(quote => {
            const quoteCard = createQuoteCard(quote);
            quotesGrid.appendChild(quoteCard);
        });
        
        updateTotalLikes(quotes);
        
    } catch (error) {
        console.error('Error loading quotes:', error);
        showErrorState(error.message);
    }
}

function createQuoteCard(quote) {
    const quoteCard = document.createElement('div');
    quoteCard.className = 'quote-card';
    
    const isLiked = isQuoteLiked(quote.id);
    
    quoteCard.innerHTML = `
        <div class="quote-image">
            <img src="${quote.image}" alt="${quote.name}" class="student-photo" onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQwIiBoZWlnaHQ9IjE0MCIgdmlld0JveD0iMCAwIDE0MCAxNDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNzAiIGN5PSI3MCIgcj0iNjgiIGZpbGw9IiMxNzIzMzAiIHN0cm9rZT0iIzJlOGI1NyIgc3Ryb2tlLXdpZHRoPSI0Ii8+PHRleHQgeD0iNzAiIHk9IjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjZTZlZWY4IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiPkF2YXRhcjwvdGV4dD48L3N2Zz4=';">
        </div>
        <div class="quote-content">
            <div class="quote-text">
                <p>${quote.quote}</p>
            </div>
            <div class="quote-author">
                <p>~ ${quote.name}</p>
            </div>
            <div class="quote-actions">
                <button class="like-btn ${isLiked ? 'liked' : ''}" data-quote-id="${quote.id}">
                    <span class="heart-icon">❤️</span>
                    <span class="like-count">${quote.likes}</span>
                </button>
            </div>
        </div>
    `;
    
    // Add like functionality
    const likeBtn = quoteCard.querySelector('.like-btn');
    likeBtn.addEventListener('click', function() {
        handleLike(quote.id, this);
    });
    
    return quoteCard;
}

async function handleLike(quoteId, likeBtn) {
    // Check if already liked
    const isLiked = likeBtn.classList.contains('liked');
    
    if (isLiked) {
        // User already liked this quote, show message
        showNotification('You already liked this quote!');
        return;
    }
    
    // Disable button to prevent multiple clicks
    likeBtn.disabled = true;
    
    try {
        // Send like to server
        const response = await fetch('/api/quotes/like', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ quoteId: quoteId })
        });
        
        const data = await response.json();
        
        if (!data.ok) {
            throw new Error(data.error || 'Failed to like quote');
        }
        
        // Update UI
        likeBtn.classList.add('liked');
        const likeCount = likeBtn.querySelector('.like-count');
        likeCount.textContent = data.quote.likes;
        
        // Save to localStorage
        saveLikedQuote(quoteId);
        
        // Update total likes
        await updateTotalLikesFromServer();
        
        // Show success notification
        showNotification('Quote liked! ❤️');
        
    } catch (error) {
        console.error('Error liking quote:', error);
        showNotification('Failed to like quote. Please try again.', 'error');
    } finally {
        // Re-enable button
        likeBtn.disabled = false;
    }
}

async function updateTotalLikesFromServer() {
    try {
        const response = await fetch('/api/quotes');
        const data = await response.json();
        
        if (data.ok) {
            updateTotalLikes(data.quotes);
        }
    } catch (error) {
        console.error('Error updating total likes:', error);
    }
}

function updateTotalLikes(quotes) {
    const totalLikes = quotes.reduce((sum, quote) => sum + quote.likes, 0);
    const totalLikesElement = document.getElementById('total-likes');
    if (totalLikesElement) {
        totalLikesElement.textContent = totalLikes;
    }
}

function showNotification(message, type = 'success') {
    // Remove any existing notifications
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#ff6b6b' : '#2e8b57'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        font-weight: 600;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function showErrorState(errorMessage) {
    const quotesGrid = document.getElementById('quotes-grid');
    quotesGrid.innerHTML = `
        <div class="error-state">
            <div class="error-icon">⚠️</div>
            <h3>Unable to Load Quotes</h3>
            <p>${errorMessage || 'There was a problem loading the quotes. Please try again.'}</p>
            <button class="retry-btn" onclick="loadQuotes()">Retry</button>
        </div>
    `;
}

// Add animation styles to document
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
    
    .loading-state {
        grid-column: 1 / -1;
        text-align: center;
        padding: 4rem 2rem;
        color: var(--emerald);
        font-size: 1.3rem;
        font-weight: 600;
    }
    
    .like-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;
document.head.appendChild(style);

// Initialize quotes when page loads
loadQuotes();