/**
 * Visualizations Module
 * Contains D3.js visualizations for the emoji story
 */

const Visualizations = {
  /**
   * Create a multi-line time series chart
   */
  createTimeSeriesChart(container, allData, config = {}) {
    const {
      width = 800,
      height = 500,
      margin = { top: 20, right: 150, bottom: 50, left: 60 },
      colors = d3.schemeCategory10,
      granularity = "day",
      context = { year: "all", month: "all" },
    } = config;

    // Clear existing content
    d3.select(container).selectAll("*").remove();

    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", "100%")
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Combine all data to find extents
    const flatData = allData.flatMap((d) => d.values);

    if (flatData.length === 0) return svg;

    // Create scales
    const x = d3
      .scaleTime()
      .domain(d3.extent(flatData, (d) => d.date))
      .range([0, innerWidth]);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(flatData, (d) => d.usage)])
      .nice()
      .range([innerHeight, 0]);

    const colorScale = d3
      .scaleOrdinal(colors)
      .domain(allData.map((d) => d.name));

    // --- Axis Formatting Logic ---
    let xFormat = "%Y";
    let xLabel = "Date";

    if (granularity === "day") {
      // Default fallback
      xFormat = "%b %d";

      if (context.year !== "all") {
        // Check if specific month is selected (currently disabled in UI, but logic kept for robustness)
        const hasMonthFilter = context.month && context.month !== "all";

        if (hasMonthFilter) {
          // Specific Month View: Show days (01, 02, ...)
          xFormat = "%d";
          const monthName = d3.timeFormat("%B")(
            new Date(2000, context.month, 1)
          );
          xLabel = `Date (${monthName} ${context.year})`;
        } else {
          // Specific Year View: Show Months (January, February, ...)
          xFormat = "%B";
          xLabel = `Date (${context.year})`;
        }
      }
    } else if (granularity === "month") {
      if (context.year !== "all") {
        // Specific Year: Show Months
        xFormat = "%b"; // Jan, Feb
        xLabel = `Month (${context.year})`;
      } else {
        xFormat = "%Y";
        xLabel = "Date";
      }
    } else {
      // Yearly
      xFormat = "%Y";
      xLabel = "Year";
    }
    // -----------------------------

    // Axes
    const xAxis = d3
      .axisBottom(x)
      .ticks(width > 600 ? 8 : 5)
      .tickFormat(d3.timeFormat(xFormat));

    const yAxis = d3.axisLeft(y);

    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis);

    g.append("g").attr("class", "y-axis").call(yAxis);

    // Add axis labels
    g.append("text")
      .attr("class", "axis-label")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 40)
      .style("text-anchor", "middle")
      .text(xLabel); // Use dynamic label

    g.append("text")
      .attr("class", "axis-label")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -45)
      .style("text-anchor", "middle")
      .text("Usage Count");

    // Line generator
    const line = d3
      .line()
      .x((d) => x(d.date))
      .y((d) => y(d.usage))
      .curve(granularity === "year" ? d3.curveLinear : d3.curveMonotoneX);

    // Add lines
    const lines = g
      .selectAll(".line-group")
      .data(allData)
      .enter()
      .append("g")
      .attr("class", "line-group");

    lines
      .append("path")
      .attr("class", "line")
      .attr("d", (d) => line(d.values))
      .style("fill", "none")
      .style("stroke", (d) => colorScale(d.name))
      .style("stroke-width", 3)
      .style("stroke-opacity", 0.8);

    // Add legend
    const legend = g
      .selectAll(".legend")
      .data(allData)
      .enter()
      .append("g")
      .attr("class", "legend")
      .attr("transform", (d, i) => `translate(${innerWidth + 10},${i * 25})`);

    legend
      .append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("rx", 2)
      .style("fill", (d) => colorScale(d.name));

    legend
      .append("text")
      .attr("x", 20)
      .attr("y", 10)
      .text((d) => d.name)
      .style("font-size", "14px")
      .style("font-family", "Nunito, sans-serif")
      .attr("alignment-baseline", "middle");

    // Tooltip interaction
    d3.selectAll(".tooltip").remove();

    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

    const overlay = g
      .append("rect")
      .attr("class", "overlay")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .style("fill", "none")
      .style("pointer-events", "all");

    const focusDots = g
      .append("g")
      .attr("class", "focus-dots")
      .style("opacity", 0)
      .style("pointer-events", "none");

    const dots = focusDots
      .selectAll(".focus-dot")
      .data(allData)
      .enter()
      .append("circle")
      .attr("class", "focus-dot")
      .attr("r", 6)
      .style("fill", (d) => colorScale(d.name))
      .style("stroke", "white")
      .style("stroke-width", 2);

    overlay
      .on("mousemove", function (event) {
        const mouseX = d3.pointer(event)[0];
        const xDate = x.invert(mouseX);

        focusDots.style("opacity", 1);

        const bisectDate = d3.bisector((d) => d.date).left;

        // Dynamic tooltip date format
        let tooltipDateFormat = "%b %d, %Y";

        // If effective granularity is day (even if 'Month' tab is active but filtered by year), show full date
        if (granularity === "day") tooltipDateFormat = "%b %d, %Y";

        // If strictly monthly aggregation
        if (granularity === "month") tooltipDateFormat = "%B %Y";

        if (granularity === "year") tooltipDateFormat = "%Y";

        // Refine tooltip format based on context if needed
        if (context.year !== "all" && context.month !== "all")
          tooltipDateFormat = "%A, %B %d"; // Show Day of week if zoomed in

        let tooltipHtml = "";
        let foundDate = null;

        dots.attr("transform", function (dataset) {
          const idx = bisectDate(dataset.values, xDate, 1);
          const d0 = dataset.values[idx - 1];
          const d1 = dataset.values[idx];

          let d = null;
          if (d0 && d1) {
            d = xDate - d0.date > d1.date - xDate ? d1 : d0;
          } else {
            d = d0 || d1;
          }

          if (d) {
            if (!foundDate) {
              foundDate = d.date;
              tooltipHtml = `<div style="margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px;"><strong>${d3.timeFormat(
                tooltipDateFormat
              )(d.date)}</strong></div>`;
            }

            tooltipHtml += `
                        <div style="display: flex; align-items: center; margin-bottom: 4px;">
                            <span style="color:${colorScale(
                              dataset.name
                            )}; font-size: 18px; margin-right: 8px;">●</span>
                            <span style="margin-right: 8px;">${
                              dataset.name
                            }:</span>
                            <strong style="margin-left: auto;">${d.usage.toLocaleString()}</strong>
                        </div>`;

            return `translate(${x(d.date)},${y(d.usage)})`;
          } else {
            return "translate(-100,-100)";
          }
        });

        tooltip.transition().duration(50).style("opacity", 1);
        tooltip
          .html(tooltipHtml)
          .style("left", event.pageX + 20 + "px")
          .style("top", event.pageY - 20 + "px");
      })
      .on("mouseout", function () {
        tooltip.transition().duration(200).style("opacity", 0);
        focusDots.style("opacity", 0);
      });

    return svg;
  },

  /**
   * Render Emoji Grid
   */
  renderEmojiGrid(containerId, emojis, onCardClick) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    if (!emojis || emojis.length === 0) {
      container.innerHTML =
        '<p style="text-align:center; grid-column: 1/-1;">No emojis found.</p>';
      return;
    }

    const fragment = document.createDocumentFragment();

    emojis.forEach((emoji) => {
      const card = document.createElement("div");
      card.className = "emoji-card";
      card.onclick = () => onCardClick(emoji);

      // Prefetch images on hover for instant loading
      card.onmouseenter = () => {
        if (card.dataset.prefetched) return;
        card.dataset.prefetched = "true";

        const platforms = ["apple", "google", "twitter", "facebook"];
        platforms.forEach((p) => {
          if (emoji[`has_img_${p}`]) {
            // Only fetch if available
            const img = new Image();
            img.src = DataLoader.getPlatformImageUrl(emoji.unified, p);
          }
        });
      };

      const char = document.createElement("span");
      char.className = "emoji-card-char";
      char.textContent = emoji.char;

      // Score removed as per request
      /*
          const score = document.createElement('div');
          score.className = 'emoji-card-score';
          score.textContent = emoji.score > 0 ? `Score: ${emoji.score.toLocaleString()}` : "No Data";
          
          if (emoji.score === 0) {
              score.style.color = '#ccc';
              score.style.fontWeight = '400';
          }
          */

      const name = document.createElement("div");
      name.style.fontSize = "0.8rem";
      name.style.color = "#999";
      name.style.marginTop = "5px";
      name.textContent = emoji.name || "Unknown";

      card.appendChild(char);
      // card.appendChild(score); // Removed from DOM
      card.appendChild(name);
      fragment.appendChild(card);
    });

    container.appendChild(fragment);
  },

  /**
   * Render Modal Content
   */
  renderModalContent(containerId, data) {
    const container = document.getElementById(containerId);
    if (!data) {
      container.innerHTML = "<p>Error loading details.</p>";
      return;
    }

    // 1. Platform Images (New)
    let platformImagesHtml = "";
    if (data.platforms && data.platforms.length > 0) {
      platformImagesHtml = `
            <div style="margin-top: 1.5rem; text-align: center;">
                <h4 style="margin-bottom: 0.8rem; color: #555;">Platform Variations</h4>
                <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                    ${data.platforms
                      .map(
                        (p) => `
                        <div class="platform-item" style="text-align: center;">
                            <img src="${p.url}" 
                                 alt="${p.name}" 
                                 class="platform-img-loading"
                                 style="width: 48px; height: 48px; object-fit: contain; transition: opacity 0.3s;" 
                                 onload="this.classList.remove('platform-img-loading')"
                                 onerror="this.style.display='none'; this.nextElementSibling.textContent='(N/A)';"/>
                            <div style="font-size: 0.8rem; color: #888; margin-top: 4px;">${p.name}</div>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            </div>
          `;
    }

    // 2. Skin Variations
    let variationsHtml = "";
    if (data.variations && data.variations.length > 0) {
      variationsHtml = `
            <div style="margin-top: 1.5rem; text-align: center;">
                <h4 style="margin-bottom: 0.5rem; color: #555;">Skin Variations</h4>
                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; font-size: 2rem;">
                    ${data.variations
                      .map(
                        (v) =>
                          `<span title="${v.name}" style="cursor: help;">${v.char}</span>`
                      )
                      .join("")}
                </div>
            </div>
          `;
    }

    // Render Stats or Technical Info
    let statsHtml = "";
    if (data.recent_tweets && data.recent_tweets.length > 0) {
      statsHtml =
        '<div style="margin-top: 1.5rem;">' +
        data.recent_tweets
          .map(
            (stat) => `
              <div class="tweet-card" style="border-left-color: #f1c40f;">
                  <div class="tweet-user">${stat.screen_name}</div>
                  <div class="tweet-text">${stat.text}</div>
              </div>
          `
          )
          .join("") +
        "</div>";
    } else {
      // Fallback: Show Unicode and Short Name
      statsHtml = `
              <div style="margin-top: 1.5rem; background: #f8f9fa; padding: 15px; border-radius: 10px; text-align: left;">
                  <h4 style="margin-bottom: 10px; color: #555;">Technical Details</h4>
                  <div style="font-family: monospace; color: #666; margin-bottom: 5px;">
                      <strong>Unicode:</strong> ${data.unicode}
                  </div>
                  <div style="font-family: monospace; color: #666;">
                      <strong>Short Name:</strong> ${data.short_name}
                  </div>
              </div>
          `;
    }

    container.innerHTML = `
          <div class="modal-header">
              <span class="modal-emoji-large">${data.char}</span>
              <h2 class="modal-title">${data.description}</h2>
              <div style="color: #888; font-size: 0.9rem; margin-top: 5px;">Category: ${data.category}</div>
              <div style="position: absolute; top: 10px; left: 15px; color: #ccc; font-size: 0.8rem;">Total in API: ~1875</div>
          </div>
          <div class="modal-body-content">
              ${platformImagesHtml}
              ${variationsHtml}
              ${statsHtml}
          </div>
      `;
  },
};
