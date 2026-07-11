const header = document.querySelector('[data-header]');
const menuButton = document.querySelector('.menu-button');
const mobileNav = document.getElementById('mobile-nav');
const year = document.getElementById('year');

if (year) year.textContent = new Date().getFullYear();

function syncHeader() {
  header?.classList.toggle('is-scrolled', window.scrollY > 12);
}

syncHeader();
window.addEventListener('scroll', syncHeader, { passive: true });

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  mobileNav.hidden = isOpen;
  document.body.classList.toggle('nav-open', !isOpen);
});

mobileNav?.addEventListener('click', (event) => {
  if (!event.target.closest('a')) return;
  mobileNav.hidden = true;
  menuButton?.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('nav-open');
});

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealItems = document.querySelectorAll('.reveal');

if (prefersReducedMotion || !('IntersectionObserver' in window)) {
  revealItems.forEach((item) => item.classList.add('is-visible'));
} else {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });

  revealItems.forEach((item) => observer.observe(item));
}
