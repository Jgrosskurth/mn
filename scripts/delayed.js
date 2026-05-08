// Intersection observer for scroll-triggered animations
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.timeline > div, .cards.impact > ul > li, .pillars > div > div').forEach((el) => {
  el.classList.add('animate');
  observer.observe(el);
});
