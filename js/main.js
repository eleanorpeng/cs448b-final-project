/**
 * Main Application Script
 * Handles interaction and state management for the Emoji Trends Explorer
 */

const App = {
  selectedEmojis: new Set(),
  loadedData: new Map(), // Cache loaded data: emojiName -> data array
  chartContainer: "#visualization",
  currentGranularity: "month", // Default to month
  filters: {
    year: "all",
  },

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

    // Event Listeners
    $("#emoji-selector").on("change", (e) =>
      this.handleSelectionChange($(e.target).val())
    );
    $("#clear-btn").on("click", () => {
      $("#emoji-selector").val(null).trigger("change");
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
    console.log("populateYearFilter called");
    // Collect all years from loaded data
    const years = new Set();

    // Use all loaded data if selection logic fails, or specific selection
    const sources =
      this.selectedEmojis.size > 0
        ? Array.from(this.selectedEmojis)
        : Array.from(this.loadedData.keys());

    console.log(`Populating years from ${sources.length} sources...`);

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

    console.log(`Found ${years.size} unique years.`);

    const sortedYears = Array.from(years).sort((a, b) => b - a); // Descending
    const select = document.getElementById("year-filter");

    if (!select) {
      console.error("Year filter dropdown not found!");
      return;
    }

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
      console.log(`Loading data for ${toLoad.length} new emojis...`);
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
