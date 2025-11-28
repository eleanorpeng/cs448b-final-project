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

    const colorScale = d3.scaleOrdinal(colors).domain(allData.map((d) => d.name));

    // --- Axis Formatting Logic ---
    let xFormat = "%Y";
    let xLabel = "Date";

    if (granularity === "day") {
      if (context.year !== "all" && context.month !== "all") {
        // Specific Month: Show days
        xFormat = "%d"; // 01, 02
        const monthName = d3.timeFormat("%B")(new Date(2000, context.month, 1));
        xLabel = `Date (${monthName} ${context.year})`;
      } else if (context.year !== "all") {
        // Specific Year: Show Month + Day
        xFormat = "%b %d";
        xLabel = `Date (${context.year})`;
      } else {
        // All time: Year
        xFormat = "%Y";
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
      .attr(
        "transform",
        (d, i) => `translate(${innerWidth + 10},${i * 25})`
      );

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
        if (granularity === "month") tooltipDateFormat = "%B %Y";
        if (granularity === "year") tooltipDateFormat = "%Y";
        // Refine tooltip format based on context if needed
        if (context.year !== 'all' && context.month !== 'all') tooltipDateFormat = "%A, %B %d"; // Show Day of week if zoomed in

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
};
