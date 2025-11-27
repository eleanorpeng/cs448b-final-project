/**
 * Main Application Script
 * Handles interaction and state management for the Emoji Trends Explorer
 */

const App = {
  selectedEmojis: new Set(),
  loadedData: new Map(), // Cache loaded data: emojiName -> data array
  chartContainer: "#visualization",
  currentGranularity: "day",

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

      // Update state and chart
      this.currentGranularity = granularity;
      this.handleSelectionChange($("#emoji-selector").val());
    });
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
    const currentSelection = selectedValues || [];

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

    // Filter data for visualization and apply aggregation
    const displayData = currentSelection.map((emoji) => {
      const rawData = this.loadedData.get(emoji);
      const aggregatedData = DataLoader.aggregateData(
        rawData,
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

    placeholder.style.display = "none";

    Visualizations.createTimeSeriesChart(this.chartContainer, data, {
      width: chartDiv.clientWidth,
      height: 500,
    });
  },
};

// Initialize when DOM is ready
$(document).ready(() => {
  App.init();
});
