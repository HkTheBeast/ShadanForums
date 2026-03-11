/* ==============================================
   Amain.js  —  Svlent Home Page JS
   ============================================== */
'use strict';

const navbar    = document.getElementById('navbar');
const backToTop = document.getElementById('backToTop');

// ── Navbar scroll ──────────────────────────────────────────
window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
    backToTop.classList.toggle('visible', window.scrollY > 400);
}, { passive: true });

// ── Hamburger nav ──────────────────────────────────────────
function initHamburger() {
    const btn   = document.getElementById('navHamburger');
    const links = document.getElementById('navLinks');
    if (!btn || !links) return;

    btn.addEventListener('click', () => {
        btn.classList.toggle('open');
        links.classList.toggle('open');
    });

    links.querySelectorAll('.nav-link-btn').forEach(link => {
        link.addEventListener('click', () => {
            btn.classList.remove('open');
            links.classList.remove('open');
        });
    });

    document.addEventListener('click', e => {
        if (!btn.contains(e.target) && !links.contains(e.target)) {
            btn.classList.remove('open');
            links.classList.remove('open');
        }
    });
}

// ── Back to top ────────────────────────────────────────────
backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ── Scroll reveal ──────────────────────────────────────────
const revealEls = document.querySelectorAll(
    '.how-step, .bento-card, .flv-item, .feature-strip .strip-item, .planner-pill, .planner-mock'
);

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.style.opacity   = '1';
                entry.target.style.transform = 'translateY(0)';
            }, parseInt(entry.target.dataset.delay) || 0);
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

revealEls.forEach((el, i) => {
    el.style.opacity    = '0';
    el.style.transform  = 'translateY(24px)';
    el.style.transition = 'opacity .55s ease, transform .55s ease';
    el.dataset.delay    = i * 55;
    revealObserver.observe(el);
});

// ── Smooth scroll for hash links ───────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            e.preventDefault();
            window.scrollTo({ top: target.offsetTop - 80, behavior: 'smooth' });
        }
    });
});

// ── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initHamburger();
    console.log('Svlent loaded.');
});