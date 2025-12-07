/**
 * Main Application Script
 * Handles interaction and state management for the Emoji Trends Explorer
 */

const App = {
  selectedEmojis: new Set(),
  loadedData: new Map(), // Cache loaded data: emojiName -> data array
  rankingsData: null, // Cache for ALL emojis
  chartContainer: '#visualization',
  gridContainer: 'emoji-grid',
  currentGranularity: 'month', // Default to month
  filters: {
    year: 'all',
  },
  currentCategoryFilter: 'all',
  itemsToShow: 300, // Pagination state

  // Spotlight Configuration
  spotlightConfig: {
    santa: { title: 'Santa' },
    rainbow: { title: 'Rainbow' },
    snake: { title: 'Snake' },
    graduation_cap: { title: 'Graduation Cap' },
    ballot_box_with_ballot: { title: 'Ballot Box With Ballot' },
  },

  // Spotlight State
  currentSpotlightIndex: 0,

  /**
   * Initialize the application
   */
  async init() {
    console.log('Initializing Emoji Trends Explorer...');

    // Populate dropdown
    this.populateDropdown();

    // Initialize Select2 with custom templating
    $('#emoji-selector').select2({
      placeholder: '🔍 Search for emojis (e.g. airplane, joy)',
      allowClear: true,
      width: '100%',
      templateResult: this.formatEmojiOption,
      templateSelection: this.formatEmojiSelection,
    });

    // Initialize Year Filter Select2
    $('#year-filter').select2({
      minimumResultsForSearch: Infinity, // Hide search box for years unless many
      width: '150px', // Fixed width or 'style'
      dropdownAutoWidth: true,
    });

    // Initialize Category Filter Select2
    $('#category-filter').select2({
      placeholder: 'Filter by Category',
      width: '250px',
      minimumResultsForSearch: 5,
    });

    // Initialize Country Selectors
    $('#country-selector-a').select2({
      width: '200px',
      minimumResultsForSearch: Infinity,
    });
    $('#country-selector-b').select2({
      width: '200px',
      minimumResultsForSearch: Infinity,
    });

    // Event Listeners
    $('#emoji-selector').on('change', (e) =>
      this.handleSelectionChange($(e.target).val())
    );
    $('#clear-btn').on('click', () => {
      $('#emoji-selector').val(null).trigger('change');
    });

    // Granularity buttons
    $('.granularity-controls .btn-pill').on('click', (e) => {
      const btn = $(e.target);
      const granularity = btn.data('granularity');

      // Update UI
      $('.granularity-controls .btn-pill').removeClass('active');
      btn.addClass('active');

      // Update state
      this.currentGranularity = granularity;
      this.updateFilterVisibility();
      this.updateVisualizationContext();
    });

    // Filter Listeners (Select2 uses change event)
    $('#year-filter').on('change', (e) => {
      this.filters.year = e.target.value;
      this.updateVisualizationContext();
    });

    // Category Filter Listener
    $('#category-filter').on('change', (e) => {
      this.currentCategoryFilter = e.target.value;
      this.itemsToShow = 300; // Reset pagination on filter change
      this.renderFilteredGrid();
    });

    // Modal Close
    $('.close-modal').on('click', () => {
      $('#emoji-modal').fadeOut();
    });

    $(window).on('click', (e) => {
      if ($(e.target).is('#emoji-modal')) {
        $('#emoji-modal').fadeOut();
      }
    });

    // Initialize Intro Animation
    this.initIntroAnimation();

    // Initialize Intro Text Animation
    this.initIntroTextAnimation();

    // Load rankings immediately since it's now visible
    this.loadRankings();

    // Initialize Country View
    this.initCountryView();

    // Initialize Spotlight Charts (Now empty/lazy)
    this.initSpotlightCharts();

    // Initialize Spotlight Carousel
    this.initSpotlightCarousel();

    // Initialize Spotlight Interaction
    this.initSpotlightInteraction();

    // Initialize Timeline
    if (typeof Timeline !== 'undefined') {
      Timeline.init();
    }

    // Window resize handler for carousel height
    $(window).on('resize', () => this.updateSpotlightHeight());
  },

  /**
   * Initialize Spotlight Interaction (Reveal Analysis)
   */
  initSpotlightInteraction() {
    $(document).on('click', '.reveal-btn', (e) => {
      const btn = $(e.currentTarget);
      const interactionDiv = btn.closest('.spotlight-interaction');
      const block = btn.closest('.spotlight-block');
      const wrapper = block.find('.spotlight-reveal-wrapper');

      // Hide interaction prompt
      interactionDiv.fadeOut();

      // Show wrapper with animation, then render chart
      wrapper
        .hide()
        .removeClass('hidden-spotlight-content')
        .fadeIn(400, () => {
          // Render chart after element is visible and has dimensions
          const id = btn.data('id');
          const containerId = btn.data('container');
          const container = document.getElementById(containerId);

          // Only render if empty to avoid duplicates
          if (container && container.innerHTML.trim() === '') {
            this.renderSpotlightChart(id, containerId);
          }

          // Update height immediately after content becomes visible
          this.updateSpotlightHeight();
        });

      // Also update height periodically during fade or immediately to catch start
      setTimeout(() => this.updateSpotlightHeight(), 50);
    });
  },

  /**
   * Render a specific spotlight chart
   */
  async renderSpotlightChart(id, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<div class="loading-spinner">Loading chart...</div>';
    this.updateSpotlightHeight(); // Update for spinner

    const config = this.spotlightConfig[id];
    if (!config) return;

    const rawData = await DataLoader.loadEmojiTimeSeries(id);
    if (!rawData || rawData.length === 0) {
      container.innerHTML =
        '<p style="text-align:center; padding: 20px;">Data not available</p>';
      this.updateSpotlightHeight();
      return;
    }

    // Aggregate by month for better trend visibility in spotlight
    const aggregatedData = DataLoader.aggregateData(rawData, 'month');

    const chartData = [
      {
        name: config.title,
        emojiChar: DataLoader.getEmojiChar(id),
        values: aggregatedData,
      },
    ];

    // Clear spinner
    container.innerHTML = '';

    Visualizations.createTimeSeriesChart('#' + containerId, chartData, {
      width: container.clientWidth,
      height: 400,
      granularity: 'month',
      context: { year: 'all' },
      colors: ['#ff6b6b'], // Use primary color
    });

    // Final height update after chart render
    this.updateSpotlightHeight();
  },

  /**
   * Initialize Spotlight Carousel
   */
  initSpotlightCarousel() {
    const track = document.getElementById('spotlight-track');
    const prevBtn = document.getElementById('spotlight-prev');
    const nextBtn = document.getElementById('spotlight-next');

    if (!track || !prevBtn || !nextBtn) return;

    const slides = track.children;
    const totalSlides = slides.length;
    const dots = document.querySelectorAll('#spotlight-dots .dot');

    // Initial height set
    // Use setTimeout to ensure layout is stable
    setTimeout(() => this.updateSpotlightHeight(), 100);

    const updateCarousel = () => {
      const translateX = -(this.currentSpotlightIndex * 100);
      track.style.transform = `translateX(${translateX}%)`;

      // Update dots
      dots.forEach((dot, index) => {
        if (index === this.currentSpotlightIndex) dot.classList.add('active');
        else dot.classList.remove('active');
      });

      // Update container height for current slide
      this.updateSpotlightHeight();
    };

    nextBtn.addEventListener('click', () => {
      this.currentSpotlightIndex =
        (this.currentSpotlightIndex + 1) % totalSlides;
      updateCarousel();
    });

    prevBtn.addEventListener('click', () => {
      this.currentSpotlightIndex =
        (this.currentSpotlightIndex - 1 + totalSlides) % totalSlides;
      updateCarousel();
    });

    // Dot navigation
    dots.forEach((dot) => {
      dot.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        if (!isNaN(index)) {
          this.currentSpotlightIndex = index;
          updateCarousel();
        }
      });
    });
  },

  /**
   * Dynamically update the carousel container height to match active slide
   */
  updateSpotlightHeight() {
    const track = document.getElementById('spotlight-track');
    if (!track) return;

    const container = track.parentElement; // .carousel-container
    const slides = track.children;
    const activeSlide = slides[this.currentSpotlightIndex];

    if (activeSlide && container) {
      const height = activeSlide.offsetHeight;
      if (height > 0) {
        container.style.height = `${height}px`;
      }
    }
  },

  /**
   * Initialize Spotlight Charts - Deprecated/Lazy
   * Now handled by renderSpotlightChart on demand
   */
  async initSpotlightCharts() {
    // No-op: Charts are rendered when user clicks "Reveal"
  },

  /**
   * Initialize Country View
   */
  async initCountryView() {
    const selectorA = $('#country-selector-a');
    const selectorB = $('#country-selector-b');

    // Initial Load
    await Promise.all([
      this.loadAndRenderCountry(
        selectorA.val(),
        'country-chart-a',
        'title-country-a'
      ),
      this.loadAndRenderCountry(
        selectorB.val(),
        'country-chart-b',
        'title-country-b'
      ),
    ]);

    // Listeners
    selectorA.on('change', async (e) => {
      await this.loadAndRenderCountry(
        e.target.value,
        'country-chart-a',
        'title-country-a'
      );
    });

    selectorB.on('change', async (e) => {
      await this.loadAndRenderCountry(
        e.target.value,
        'country-chart-b',
        'title-country-b'
      );
    });
  },

  async loadAndRenderCountry(countryCode, containerId, titleId) {
    const container = document.getElementById(containerId);
    const title = document.getElementById(titleId);
    if (!container) return;

    container.innerHTML = '<div class="loading-spinner">Loading...</div>';

    // Flag mapping
    const flags = {
      US: '🇺🇸',
      AU: '🇦🇺',
      BR: '🇧🇷',
      DE: '🇩🇪',
      FR: '🇫🇷',
      GB: '🇬🇧',
      IN: '🇮🇳',
      JP: '🇯🇵',
      PH: '🇵🇭',
    };

    // Full name mapping
    const names = {
      US: 'United States',
      AU: 'Australia',
      BR: 'Brazil',
      DE: 'Germany',
      FR: 'France',
      GB: 'Great Britain',
      IN: 'India',
      JP: 'Japan',
      PH: 'Philippines',
    };

    if (title) {
      title.innerHTML = `Top 20 emojis in ${names[countryCode]} ${flags[countryCode]} (${countryCode})`;
    }

    const data = await DataLoader.loadCountryData(countryCode);

    if (data && data.length > 0) {
      Visualizations.renderCountryChart(containerId, data, countryCode);
    } else {
      container.innerHTML =
        '<div style="text-align:center; padding: 20px; color: red;">Failed to load data.</div>';
    }
  },

  /**
   * Handle Intro Animation (iMessage Scroll)
   */
  initIntroAnimation() {
    const section = document.querySelector('.intro-section');
    const typingInput = document.getElementById('typing-input');
    const sendBtn = document.getElementById('send-btn');
    const sentMessage = document.getElementById('sent-message');
    const textToType = 'omg 👀🤩';

    if (!section || !typingInput || !sendBtn || !sentMessage) return;

    const handleScroll = () => {
      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Calculate how far we've scrolled through the section
      // rect.top starts at >0 (if header is above) and goes negative.
      // When rect.top is 0, we are at the start.
      // When rect.bottom is viewportHeight, we are at the end.

      const totalScrollDistance = section.offsetHeight - viewportHeight;
      // Scrolled amount = -rect.top (assuming section starts at top of viewport or we subtract initial offset)
      // Since section is after header, let's look at window.scrollY relative to section.offsetTop

      const sectionTop = section.offsetTop;
      const scrollY = window.scrollY;

      // Adjust start point so animation begins when section hits top or slightly before?
      // Since it's sticky, we want it to start animating as we scroll DOWN through the sticky area.

      let progress = (scrollY - sectionTop + 100) / totalScrollDistance; // +100 offset to start slightly earlier
      progress = Math.max(0, Math.min(1, progress));

      // Animation Stages
      // 0.0 - 0.6: Typing
      // 0.6 - 0.7: Pause / Button Active
      // 0.7 - 0.8: Send (Bubble appears, Input clears)
      // 0.8 - 1.0: Message stays sent

      if (progress < 0.6) {
        const typeProgress = progress / 0.6;
        // Use Array.from to correctly handle emoji characters (surrogate pairs)
        const chars = Array.from(textToType);
        const charCount = Math.floor(typeProgress * chars.length);
        typingInput.textContent = chars.slice(0, charCount).join('');

        sendBtn.classList.remove('active');
        sentMessage.style.opacity = '0';
        sentMessage.style.transform = 'translateY(20px)';
      } else if (progress < 0.75) {
        // Text fully typed, button active
        typingInput.textContent = textToType;
        sendBtn.classList.add('active');
        sentMessage.style.opacity = '0';
        sentMessage.style.transform = 'translateY(20px)';
      } else {
        // Sent
        typingInput.textContent = '';
        sendBtn.classList.remove('active'); // Button goes back to inactive state or disappears
        sentMessage.style.opacity = '1';
        sentMessage.style.transform = 'translateY(0)';
      }
    };

    window.addEventListener('scroll', handleScroll);
    // Initial call
    handleScroll();
  },

  /**
   * Handle Intro Text Section Fade-in Animation
   */
  initIntroTextAnimation() {
    const paragraphs = document.querySelectorAll('.intro-paragraph');

    if (paragraphs.length === 0) return;

    const observerOptions = {
      threshold: 0.3, // Trigger when 30% of the paragraph is visible
      rootMargin: '0px 0px -50px 0px',
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in-text');
          // Unobserve after animation is triggered
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    // Observe each paragraph individually for better scroll-based animation
    paragraphs.forEach((paragraph) => {
      observer.observe(paragraph);
    });
  },

  /**
   * Load Rankings Data
   */
  async loadRankings() {
    const grid = document.getElementById(this.gridContainer);
    grid.innerHTML =
      '<div class="loading-spinner">Loading emoji library...</div>';

    // Fetch FULL list now
    this.rankingsData = await DataLoader.fetchFullEmojiList();

    if (this.rankingsData && this.rankingsData.length > 0) {
      // Populate Category Filter
      this.populateCategoryFilter(this.rankingsData);

      // Render Initial Grid
      this.renderFilteredGrid();
    } else {
      grid.innerHTML =
        '<div class="loading-spinner">Failed to load rankings. Please try again later.</div>';
    }
  },

  /**
   * Populate Category Filter Dropdown
   */
  populateCategoryFilter(data) {
    const categories = new Set(data.map((e) => e.category).filter(Boolean));
    const sortedCategories = Array.from(categories).sort();

    const select = document.getElementById('category-filter');
    // Keep "All Categories"
    while (select.options.length > 1) {
      select.remove(1);
    }

    sortedCategories.forEach((cat) => {
      const option = document.createElement('option');
      option.value = cat;
      option.text = cat;
      select.appendChild(option);
    });
  },

  /**
   * Render Grid based on current filters
   */
  renderFilteredGrid() {
    if (!this.rankingsData) return;

    const grid = document.getElementById(this.gridContainer);
    grid.innerHTML = ''; // Clear
    let filtered = this.rankingsData;

    // Apply Category Filter
    if (this.currentCategoryFilter !== 'all') {
      filtered = filtered.filter(
        (e) => e.category === this.currentCategoryFilter
      );
    }

    // Pagination Limit
    const displayData = filtered.slice(0, this.itemsToShow);

    if (displayData.length === 0) {
      grid.innerHTML =
        '<p style="text-align:center; grid-column: 1/-1;">No emojis found for this category.</p>';
      return;
    }

    Visualizations.renderEmojiGrid(this.gridContainer, displayData, (emoji) =>
      this.openEmojiDetails(emoji)
    );

    // Add "Load More" button if truncated
    if (filtered.length > this.itemsToShow) {
      const buttonContainer = document.createElement('div');
      buttonContainer.style.gridColumn = '1 / -1';
      buttonContainer.style.textAlign = 'center';
      buttonContainer.style.padding = '20px';

      const loadMoreBtn = document.createElement('button');
      loadMoreBtn.textContent = 'Load More Emojis';
      loadMoreBtn.className = 'btn btn-secondary'; // Reusing existing button style
      loadMoreBtn.style.minWidth = '200px';

      loadMoreBtn.onclick = () => {
        this.itemsToShow += 300;
        // Capture scroll position
        const scrollPos = window.scrollY;
        this.renderFilteredGrid();
        // Restore scroll (renderFilteredGrid clears innerHTML which might jump)
        // Actually, simply appending would be better, but re-rendering is simpler for now.
        // The browser might handle scroll restoration if height increases.
      };

      buttonContainer.appendChild(loadMoreBtn);

      const countInfo = document.createElement('div');
      countInfo.style.marginTop = '10px';
      countInfo.style.color = '#999';
      countInfo.textContent = `Showing ${displayData.length} of ${filtered.length}`;
      buttonContainer.appendChild(countInfo);

      grid.appendChild(buttonContainer);
    }
  },

  /**
   * Open Emoji Details Modal
   */
  async openEmojiDetails(emoji) {
    const modal = $('#emoji-modal');
    const modalBody = 'modal-body';

    // Show modal immediately (content will update)
    modal.fadeIn();

    // Fetch details
    const details = await DataLoader.fetchEmojiDetails(emoji.id);

    // Render details
    Visualizations.renderModalContent(modalBody, details || emoji);
  },

  /**
   * Update visibility of filter dropdowns based on granularity
   */
  updateFilterVisibility() {
    const yearFilter = $('#year-filter');
    const yearFilterContainer = yearFilter.next('.select2-container'); // Select2 container

    // Reset filters on granularity change for smoother UX
    this.filters.year = 'all';
    yearFilter.val('all').trigger('change.select2');

    if (this.currentGranularity === 'year') {
      // Hide Year filter in Yearly view
      yearFilterContainer.hide();
    } else {
      // Monthly: Show Year filter
      yearFilterContainer.show();
    }
  },

  /**
   * Populate the year filter dropdown based on selected emojis
   */
  populateYearFilter() {
    // Collect all years from loaded data
    const years = new Set();

    // Use all loaded data if selection logic fails, or specific selection
    const sources =
      this.selectedEmojis.size > 0
        ? Array.from(this.selectedEmojis)
        : Array.from(this.loadedData.keys());

    sources.forEach((emoji) => {
      const data = this.loadedData.get(emoji);
      if (data && Array.isArray(data)) {
        data.forEach((d) => {
          // Robust date check
          if (d.date && d.date instanceof Date && !isNaN(d.date)) {
            years.add(d.date.getFullYear());
          }
        });
      }
    });

    const sortedYears = Array.from(years).sort((a, b) => b - a); // Descending
    const select = document.getElementById('year-filter');

    if (!select) return;

    // Preserve current selection if possible
    const currentVal = $(select).val(); // Use jQuery val() for consistency

    // Clear options (keep first "All Years")
    while (select.options.length > 1) {
      select.remove(1);
    }

    sortedYears.forEach((year) => {
      const option = document.createElement('option');
      option.value = year;
      option.text = year;
      select.appendChild(option);
    });

    // Restore value if valid, else default to 'all'
    if (currentVal !== 'all' && sortedYears.includes(Number(currentVal))) {
      $(select).val(currentVal).trigger('change.select2'); // Update Select2
      this.filters.year = currentVal;
    } else {
      $(select).val('all').trigger('change.select2'); // Update Select2
      this.filters.year = 'all';
    }
  },

  /**
   * Format the dropdown option with emoji
   */
  formatEmojiOption(state) {
    if (!state.id) return state.text;
    const emojiChar = DataLoader.getEmojiChar(state.element.value);
    return $(
      `<span><span style="font-size: 1.5em; margin-right: 10px;">${emojiChar}</span> ${state.text}</span>`
    );
  },

  /**
   * Format the selected item tag
   */
  formatEmojiSelection(state) {
    if (!state.id) return state.text;
    const emojiChar = DataLoader.getEmojiChar(state.element.value);
    return $(`<span>${emojiChar} ${state.text}</span>`);
  },

  /**
   * Populate the emoji selector dropdown
   */
  populateDropdown() {
    const selector = document.getElementById('emoji-selector');
    DataLoader.emojiList.forEach((emoji) => {
      const option = document.createElement('option');
      option.value = emoji;
      // Format name: "pile_of_poo" -> "Pile Of Poo"
      const name = emoji
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      option.text = name;
      selector.appendChild(option);
    });
  },

  /**
   * Handle changes in emoji selection
   */
  async handleSelectionChange(selectedValues) {
    console.log('handleSelectionChange triggered with:', selectedValues);
    const currentSelection = selectedValues || [];
    this.selectedEmojis = new Set(currentSelection);

    // Update header display
    this.updateHeaderDisplay(currentSelection);

    // Identify new emojis to load
    const toLoad = currentSelection.filter(
      (emoji) => !this.loadedData.has(emoji)
    );

    // Load new data if any
    if (toLoad.length > 0) {
      for (const emoji of toLoad) {
        const data = await DataLoader.loadEmojiTimeSeries(emoji);
        this.loadedData.set(emoji, data);
      }
    }

    // Always update available years based on current selection
    try {
      this.populateYearFilter();
    } catch (err) {
      console.error('Error populating year filter:', err);
    }

    this.updateVisualizationContext();
  },

  /**
   * Filter and Aggregate data, then update chart
   */
  updateVisualizationContext() {
    const currentSelection = Array.from(this.selectedEmojis);

    // Filter data for visualization and apply aggregation
    const displayData = currentSelection.map((emoji) => {
      const rawData = this.loadedData.get(emoji);

      // 1. Filter raw data
      let filteredData = rawData;
      if (this.filters.year !== 'all') {
        filteredData = filteredData.filter(
          (d) => d.date.getFullYear() === parseInt(this.filters.year)
        );
      }

      // 2. Aggregate data
      // If the user wants to see specific dates in tooltip, we should NOT aggregate to month
      // effectively using 'day' granularity for data, but 'month' for axis ticks?
      // OR we just switch to 'day' granularity when a Year is selected?

      // Let's interpret the request: "Remove daily control... click on month [implied: select year?]... see specific dates"
      // This implies: Default view = Monthly aggregation.
      // Filtered by Year view = Daily aggregation (so you can see specific dates).

      let effectiveGranularity = this.currentGranularity;

      if (this.currentGranularity === 'month' && this.filters.year !== 'all') {
        effectiveGranularity = 'day';
      }

      const aggregatedData = DataLoader.aggregateData(
        filteredData,
        effectiveGranularity
      );

      return {
        name: emoji
          .split('_')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
        emojiChar: DataLoader.getEmojiChar(emoji),
        values: aggregatedData,
        // Pass the actual granularity used for this dataset
        granularity: effectiveGranularity,
      };
    });

    // We need to pass the effective granularity to the chart config too,
    // but it might vary per dataset if we did it per-emoji (we don't).
    // So let's determine global effective granularity.
    let globalEffectiveGranularity = this.currentGranularity;
    if (this.currentGranularity === 'month' && this.filters.year !== 'all') {
      globalEffectiveGranularity = 'day';
    }

    this.updateVisualization(displayData, globalEffectiveGranularity);
  },

  /**
   * Update the fun header with selected emojis
   */
  updateHeaderDisplay(selectedEmojis) {
    const container = document.getElementById('selected-emojis-display');
    const title = document.getElementById('chart-title');

    container.innerHTML = '';

    if (!selectedEmojis || selectedEmojis.length === 0) {
      title.textContent = 'Select emojis to start! ✨';
      return;
    }

    title.textContent = 'Usage Trends Over Time';

    selectedEmojis.forEach((emoji) => {
      const char = DataLoader.getEmojiChar(emoji);
      const span = document.createElement('span');
      span.className = 'header-emoji-item';
      span.textContent = char;
      span.title = emoji;
      container.appendChild(span);
    });
  },

  /**
   * Update the chart with current data
   */
  updateVisualization(data, effectiveGranularity) {
    const placeholder = document.getElementById('placeholder');
    const chartDiv = document.querySelector(this.chartContainer);

    // Use effective granularity if provided, else default to current
    const granularity = effectiveGranularity || this.currentGranularity;

    if (data.length === 0) {
      placeholder.style.display = 'block';
      chartDiv.innerHTML = ''; // Clear chart
      return;
    }

    if (data.every((d) => d.values.length === 0)) {
      // If filters result in no data
      chartDiv.innerHTML =
        "<div style='text-align:center; padding-top: 100px; color: #666;'>No data available for this time range</div>";
      placeholder.style.display = 'none';
      return;
    }

    placeholder.style.display = 'none';

    // Prepare context object for axis labels
    const context = {
      granularity: granularity,
      year: this.filters.year,
    };

    Visualizations.createTimeSeriesChart(this.chartContainer, data, {
      width: chartDiv.clientWidth,
      height: 500,
      granularity: granularity,
      context: context, // Pass context for dynamic labels
    });
  },
};

// Initialize when DOM is ready
$(document).ready(() => {
  App.init();
});
