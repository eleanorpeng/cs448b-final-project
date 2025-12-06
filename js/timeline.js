/**
 * Timeline Scroll Logic
 * Handles the sticky timeline interaction using IntersectionObserver
 */

const Timeline = {
  init() {
    const triggers = document.querySelectorAll('.scroll-trigger');
    const progressLine = document.getElementById('timeline-progress-bar');

    if (!triggers.length) return;

    const observerOptions = {
      root: null, // viewport
      rootMargin: '-45% 0px -45% 0px', // Trigger when element is in middle 10% of screen
      thresgld: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const era = entry.target.dataset.trigger;
          this.activateEra(era);
        }
      });
    }, observerOptions);

    triggers.forEach((trigger) => observer.observe(trigger));

    // Initialize first era active
    this.activateEra('1980');
  },

  activateEra(era) {
    // 1. Update Dots
    document.querySelectorAll('.timeline-node').forEach((node) => {
      node.classList.remove('active');
      if (node.dataset.era === era) {
        node.classList.add('active');
      }
    });

    // 2. Update Content Cards
    document.querySelectorAll('.timeline-card').forEach((card) => {
      card.classList.remove('active');
    });
    const activeCard = document.getElementById(`card-${era}`);
    if (activeCard) activeCard.classList.add('active');

    // 3. Update Line Progress
    // Simple mapping: 1980=0%, 1990=33%, 2010=66%, 2015=100%
    const progressLine = document.getElementById('timeline-progress-bar');
    if (progressLine) {
      let height = '0%';
      switch (era) {
        case '1980':
          height = '0%';
          break;
        case '1990':
          height = '33%';
          break;
        case '2010':
          height = '66%';
          break;
        case '2015':
          height = '100%';
          break;
      }
      progressLine.style.height = height;
    }
  },
};
