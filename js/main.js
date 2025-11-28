/**
 * Main Application Script
 * Handles interaction and state management for the Emoji Trends Explorer
 */

const App = {
  selectedEmojis: new Set(),
  loadedData: new Map(), // Cache loaded data: emojiName -> data array
  rankingsData: null, // Cache for ALL emojis
  chartContainer: "#visualization",
  gridContainer: "emoji-grid",
  currentGranularity: "month", // Default to month
  filters: {
    year: "all",
  },
  currentCategoryFilter: "all",
  itemsToShow: 300, // Pagination state

  /**
   * Initialize the application
   */
  async init() {
    console.log("Initializing Emoji Trends Explorer...");

    // Populate dropdown
    this.populateDropdown();

    // Initialize Select2 with custom templating
    $("#emoji-selector").select2({
      placeholder: "🔍 Search for emojis (e.g. airplane, joy)",
      allowClear: true,
      width: "100%",
      templateResult: this.formatEmojiOption,
      templateSelection: this.formatEmojiSelection,
    });

    // Initialize Year Filter Select2
    $("#year-filter").select2({
      minimumResultsForSearch: Infinity, // Hide search box for years unless many
      width: "150px", // Fixed width or 'style'
      dropdownAutoWidth: true,
    });

    // Initialize Category Filter Select2
    $("#category-filter").select2({
      placeholder: "Filter by Category",
      width: "250px",
      minimumResultsForSearch: 5,
    });

    // Event Listeners
    $("#emoji-selector").on("change", (e) =>
      this.handleSelectionChange($(e.target).val())
    );
    $("#clear-btn").on("click", () => {
      $("#emoji-selector").val(null).trigger("change");
    });

    // Navigation Tabs
    $(".nav-tab").on("click", (e) => {
      const targetView = $(e.target).data("view");
      this.switchView(targetView);
    });

    // Granularity buttons
    $(".granularity-controls .btn-pill").on("click", (e) => {
      const btn = $(e.target);
      const granularity = btn.data("granularity");

      // Update UI
      $(".granularity-controls .btn-pill").removeClass("active");
      btn.addClass("active");

      // Update state
      this.currentGranularity = granularity;
      this.updateFilterVisibility();
      this.updateVisualizationContext();
    });

    // Filter Listeners (Select2 uses change event)
    $("#year-filter").on("change", (e) => {
      this.filters.year = e.target.value;
      this.updateVisualizationContext();
    });

    // Category Filter Listener
    $("#category-filter").on("change", (e) => {
      this.currentCategoryFilter = e.target.value;
      this.itemsToShow = 300; // Reset pagination on filter change
      this.renderFilteredGrid();
    });

    // Modal Close
    $(".close-modal").on("click", () => {
      $("#emoji-modal").fadeOut();
    });

    $(window).on("click", (e) => {
      if ($(e.target).is("#emoji-modal")) {
        $("#emoji-modal").fadeOut();
      }
    });
  },

  /**
   * Switch between Trends and Ranking views
   */
  async switchView(viewName) {
    // Update Tabs
    $(".nav-tab").removeClass("active");
    $(`.nav-tab[data-view="${viewName}"]`).addClass("active");

    // Toggle Sections
    if (viewName === "trends") {
      $("#view-trends").show();
      $("#view-ranking").hide();
    } else {
      $("#view-trends").hide();
      $("#view-ranking").fadeIn();

      // Load rankings if not already loaded
      if (!this.rankingsData) {
        await this.loadRankings();
      }
    }
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

    const select = document.getElementById("category-filter");
    // Keep "All Categories"
    while (select.options.length > 1) {
      select.remove(1);
    }

    sortedCategories.forEach((cat) => {
      const option = document.createElement("option");
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
    grid.innerHTML = ""; // Clear

    let filtered = this.rankingsData;

    // Apply Category Filter
    if (this.currentCategoryFilter !== "all") {
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
      const buttonContainer = document.createElement("div");
      buttonContainer.style.gridColumn = "1 / -1";
      buttonContainer.style.textAlign = "center";
      buttonContainer.style.padding = "20px";

      const loadMoreBtn = document.createElement("button");
      loadMoreBtn.textContent = "Load More Emojis";
      loadMoreBtn.className = "btn btn-secondary"; // Reusing existing button style
      loadMoreBtn.style.minWidth = "200px";

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

      const countInfo = document.createElement("div");
      countInfo.style.marginTop = "10px";
      countInfo.style.color = "#999";
      countInfo.textContent = `Showing ${displayData.length} of ${filtered.length}`;
      buttonContainer.appendChild(countInfo);

      grid.appendChild(buttonContainer);
    }
  },

  /**
   * Open Emoji Details Modal
   */
  async openEmojiDetails(emoji) {
    const modal = $("#emoji-modal");
    const modalBody = "modal-body";

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
    const yearFilter = $("#year-filter");
    const yearFilterContainer = yearFilter.next(".select2-container"); // Select2 container

    // Reset filters on granularity change for smoother UX
    this.filters.year = "all";
    yearFilter.val("all").trigger("change.select2"); // Trigger Select2 update

    if (this.currentGranularity === "year") {
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
    const select = document.getElementById("year-filter");

    if (!select) return;

    // Preserve current selection if possible
    const currentVal = $(select).val(); // Use jQuery val() for consistency

    // Clear options (keep first "All Years")
    while (select.options.length > 1) {
      select.remove(1);
    }

    sortedYears.forEach((year) => {
      const option = document.createElement("option");
      option.value = year;
      option.text = year;
      select.appendChild(option);
    });

    // Restore value if valid, else default to 'all'
    if (currentVal !== "all" && sortedYears.includes(Number(currentVal))) {
      $(select).val(currentVal).trigger("change.select2"); // Update Select2
      this.filters.year = currentVal;
    } else {
      $(select).val("all").trigger("change.select2"); // Update Select2
      this.filters.year = "all";
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
    const selector = document.getElementById("emoji-selector");
    DataLoader.emojiList.forEach((emoji) => {
      const option = document.createElement("option");
      option.value = emoji;
      // Format name: "pile_of_poo" -> "Pile Of Poo"
      const name = emoji
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      option.text = name;
      selector.appendChild(option);
    });
  },

  /**
   * Handle changes in emoji selection
   */
  async handleSelectionChange(selectedValues) {
    console.log("handleSelectionChange triggered with:", selectedValues);
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
      console.error("Error populating year filter:", err);
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
      if (this.filters.year !== "all") {
        filteredData = filteredData.filter(
          (d) => d.date.getFullYear() === parseInt(this.filters.year)
        );
      }

      // 2. Aggregate data
      const aggregatedData = DataLoader.aggregateData(
        filteredData,
        this.currentGranularity
      );

      return {
        name: emoji
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
        emojiChar: DataLoader.getEmojiChar(emoji),
        values: aggregatedData,
      };
    });

    this.updateVisualization(displayData);
  },

  /**
   * Update the fun header with selected emojis
   */
  updateHeaderDisplay(selectedEmojis) {
    const container = document.getElementById("selected-emojis-display");
    const title = document.getElementById("chart-title");

    container.innerHTML = "";

    if (!selectedEmojis || selectedEmojis.length === 0) {
      title.textContent = "Select emojis to start! ✨";
      return;
    }

    title.textContent = "Usage Trends Over Time";

    selectedEmojis.forEach((emoji) => {
      const char = DataLoader.getEmojiChar(emoji);
      const span = document.createElement("span");
      span.className = "header-emoji-item";
      span.textContent = char;
      span.title = emoji;
      container.appendChild(span);
    });
  },

  /**
   * Update the chart with current data
   */
  updateVisualization(data) {
    const placeholder = document.getElementById("placeholder");
    const chartDiv = document.querySelector(this.chartContainer);

    if (data.length === 0) {
      placeholder.style.display = "block";
      chartDiv.innerHTML = ""; // Clear chart
      return;
    }

    if (data.every((d) => d.values.length === 0)) {
      // If filters result in no data
      chartDiv.innerHTML =
        "<div style='text-align:center; padding-top: 100px; color: #666;'>No data available for this time range</div>";
      placeholder.style.display = "none";
      return;
    }

    placeholder.style.display = "none";

    // Prepare context object for axis labels
    const context = {
      granularity: this.currentGranularity,
      year: this.filters.year,
    };

    Visualizations.createTimeSeriesChart(this.chartContainer, data, {
      width: chartDiv.clientWidth,
      height: 500,
      granularity: this.currentGranularity,
      context: context, // Pass context for dynamic labels
    });
  },
};

// Initialize when DOM is ready
$(document).ready(() => {
  App.init();
});
