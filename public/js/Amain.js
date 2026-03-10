/* ==============================================
   Amain.js  —  Svlent Home Page JS
   ============================================== */

'use strict';

// ── Navbar scroll ─────────────────────────────────────────
const navbar   = document.getElementById('navbar');
const backToTop = document.getElementById('backToTop');

window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
    backToTop.classList.toggle('visible', window.scrollY > 400);
}, { passive: true });

// ── Mobile menu ───────────────────────────────────────────
const mobileToggle = document.getElementById('mobileToggle');
const navMenu      = document.getElementById('navMenu');

mobileToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    mobileToggle.classList.toggle('active');
});

// Close menu on link click
navMenu.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        mobileToggle.classList.remove('active');
    });
});

// ── Back to top ───────────────────────────────────────────
backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ── Scroll reveal ─────────────────────────────────────────
// Elements that should animate in when they enter the viewport
const revealEls = document.querySelectorAll(
    '.how-step, .bento-card, .flv-item, .feature-strip .strip-item'
);

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
            // Stagger each element slightly
            setTimeout(() => {
                entry.target.style.opacity    = '1';
                entry.target.style.transform  = 'translateY(0)';
            }, entry.target.dataset.delay || 0);
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

revealEls.forEach((el, i) => {
    el.style.opacity   = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity .55s ease, transform .55s ease';
    el.dataset.delay   = i * 60;   // stagger: 60ms apart
    revealObserver.observe(el);
});

// ── Active nav on scroll ──────────────────────────────────
const sections = document.querySelectorAll('section[id]');
const navLinks  = document.querySelectorAll('.nav-link');

const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const id = entry.target.id;
            navLinks.forEach(link => {
                link.classList.toggle('active', link.getAttribute('href') === '#' + id);
            });
        }
    });
}, { rootMargin: '-40% 0px -55% 0px' });

sections.forEach(s => sectionObserver.observe(s));

// ── Smooth scroll for hash links ─────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            e.preventDefault();
            window.scrollTo({ top: target.offsetTop - 80, behavior: 'smooth' });
        }
    });
});

// ── Init ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    console.log('Svlent loaded.');
});