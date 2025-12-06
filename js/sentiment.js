/**
 * Sentiment Visualization Script
 * Handles the Global Emoji Sentiment Explorer
 */

const SentimentApp = {
  data: [],
  vizElements: null,

  init() {
    console.log('Initializing Sentiment Visualization...');

    // Initialize Select2 for sentiment filter only
    $('#sentiment-filter').select2({
      minimumResultsForSearch: Infinity,
      width: '200px',
    });

    this.loadData();
    this.attachEventListeners();
  },

  loadData() {
    d3.csv('data/Emoji_Sentiment_Data_v1.0.csv')
      .then((csvData) => {
        // Blacklist of non-emoji characters or noisy data
        const blacklist = new Set(['┊', '▃', '◤', '☁', 'da', '—']);

        this.data = csvData
          .filter((d) => !blacklist.has(d.Emoji)) // Filter out blacklist
          .map((d) => ({
            emoji: d.Emoji,
            name: d['Unicode name'],
            occurrences: +d.Occurrences,
            negative: +d.Negative,
            neutral: +d.Neutral,
            positive: +d.Positive,
            position: +d.Position,
            sentimentScore:
              (+d.Positive - +d.Negative) /
              (+d.Positive + +d.Neutral + +d.Negative),
          }))
          .filter((d) => d.occurrences > 0); // Filter out zero occurrences

        console.log(
          'Sentiment CSV loaded successfully!',
          this.data.length,
          'emojis'
        );
        this.initVisualization();
      })
      .catch((error) => {
        console.error('Error loading Sentiment CSV file:', error);
        const container = document.getElementById('sentiment-visualization');
        if (container) {
          container.innerHTML = `<div style="text-align: center; color: red; padding: 20px;">Error loading data: ${error.message}</div>`;
        }
      });
  },

  initVisualization() {
    const margin = { top: 40, right: 80, bottom: 60, left: 80 };
    // Get width from container or default
    const container = document.getElementById('sentiment-visualization');
    const containerWidth = container ? container.clientWidth : 1200;
    const width = containerWidth - margin.left - margin.right;
    const height = 700 - margin.top - margin.bottom;

    const svg = d3
      .select('#sentiment-visualization')
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create axis groups
    const xAxisGroup = svg
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`)
      .style('font-size', '11px')
      .style('color', '#666');

    const yAxisGroup = svg
      .append('g')
      .attr('class', 'y-axis')
      .style('font-size', '11px')
      .style('color', '#666');

    // Axis labels
    svg
      .append('text')
      .attr('class', 'axis-label')
      .attr('x', width / 2)
      .attr('y', height + 45)
      .attr('text-anchor', 'middle')
      .text('Sentiment Score (Negative ← → Positive)');

    svg
      .append('text')
      .attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -45)
      .attr('text-anchor', 'middle')
      .text('Number of Occurrences');

    // Tooltip - specific ID for this viz
    let tooltip = d3.select('#sentiment-tooltip');
    if (tooltip.empty()) {
      tooltip = d3
        .select('body')
        .append('div')
        .attr('id', 'sentiment-tooltip')
        .attr('class', 'tooltip');
    }

    this.vizElements = {
      svg,
      xAxisGroup,
      yAxisGroup,
      width,
      height,
      tooltip,
    };

    this.updateVisualization();
  },

  updateVisualization() {
    if (!this.vizElements) return;

    const { svg, xAxisGroup, yAxisGroup, width, height, tooltip } =
      this.vizElements;

    const sentimentFilter = document.getElementById('sentiment-filter').value;
    const filterRare =
      document.getElementById('sentiment-filter-rare')?.checked || false;

    // Apply minimum occurrences filter based on checkbox
    const minOccurrences = filterRare ? 30 : 1;
    let filteredData = this.data.filter((d) => d.occurrences >= minOccurrences);

    if (sentimentFilter === 'positive') {
      filteredData = filteredData.filter((d) => d.sentimentScore > 0.2);
    } else if (sentimentFilter === 'negative') {
      filteredData = filteredData.filter((d) => d.sentimentScore < -0.2);
    } else if (sentimentFilter === 'neutral') {
      filteredData = filteredData.filter(
        (d) => d.sentimentScore >= -0.2 && d.sentimentScore <= 0.2
      );
    }

    // Dynamic scales
    const xScale = d3
      .scaleLinear()
      .domain([
        d3.min(filteredData, (d) => d.sentimentScore) - 0.05 || -1,
        d3.max(filteredData, (d) => d.sentimentScore) + 0.05 || 1,
      ])
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(filteredData, (d) => d.occurrences) || 100])
      .range([height, 0]);

    const sizeScale = d3
      .scaleSqrt()
      .domain([0, d3.max(filteredData, (d) => d.occurrences) || 100])
      .range([10, 40]);

    const colorScale = d3
      .scaleLinear()
      .domain([-1, 0, 1])
      .range(['#e74c3c', '#95a5a6', '#2ecc71']); // Red, Grey, Green

    // Update axes
    xAxisGroup.transition().duration(800).call(d3.axisBottom(xScale).ticks(10));

    yAxisGroup.transition().duration(800).call(d3.axisLeft(yScale).ticks(8));

    // Size based on occurrences only (removed "Size By" option)
    const sizeValue = (d) => sizeScale(d.occurrences);

    // Bind data
    const circles = svg
      .selectAll('.sentiment-emoji-circle')
      .data(filteredData, (d) => d.emoji);

    // Exit
    circles.exit().transition().duration(500).attr('opacity', 0).remove();

    // Enter
    const circlesEnter = circles
      .enter()
      .append('g')
      .attr('class', 'sentiment-emoji-circle')
      .attr('cursor', 'pointer');

    circlesEnter
      .append('circle')
      .attr('r', 0)
      .attr('fill', (d) => colorScale(d.sentimentScore))
      .attr('opacity', 0.7)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1);

    circlesEnter
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '1px')
      .text((d) => d.emoji);

    const allCircles = circlesEnter.merge(circles);

    allCircles
      .transition()
      .duration(800)
      .attr(
        'transform',
        (d) => `translate(${xScale(d.sentimentScore)},${yScale(d.occurrences)})`
      );

    allCircles
      .select('circle')
      .transition()
      .duration(800)
      .attr('r', sizeValue)
      .attr('fill', (d) => colorScale(d.sentimentScore));

    allCircles
      .select('text')
      .transition()
      .duration(800)
      .attr('font-size', (d) => Math.max(8, sizeValue(d) * 0.6) + 'px');

    // Hover events
    allCircles
      .on('mouseenter', function (event, d) {
        d3.select(this)
          .select('circle')
          .transition()
          .duration(150)
          .attr('stroke-width', 3)
          .attr('opacity', 1);

        tooltip
          .style('opacity', 1)
          .html(
            `
              <div class="tooltip-emoji" style="font-size: 2em; text-align: center;">${
                d.emoji
              }</div>
              <div class="tooltip-name" style="font-weight: bold; text-align: center;">${
                d.name
              }</div>
              <hr style="margin: 5px 0; border: 0; border-top: 1px solid #555;">
              <div><strong>Occurrences:</strong> ${d.occurrences.toLocaleString()}</div>
              <div><strong>Sentiment:</strong> ${d.sentimentScore.toFixed(
                3
              )}</div>
              <div style="font-size: 0.8em; margin-top: 5px;">
                <span style="color: #2ecc71">Pos: ${d.positive}</span> |
                <span style="color: #95a5a6">Neu: ${d.neutral}</span> |
                <span style="color: #e74c3c">Neg: ${d.negative}</span>
              </div>
            `
          )
          .style('left', event.pageX + 15 + 'px')
          .style('top', event.pageY - 15 + 'px');
      })
      .on('mouseleave', function () {
        d3.select(this)
          .select('circle')
          .transition()
          .duration(150)
          .attr('stroke-width', 1)
          .attr('opacity', 0.7);

        tooltip.style('opacity', 0);
      });

    this.updateStats(filteredData);
  },

  updateStats(filteredData) {
    document.getElementById('sentiment-total-emojis').textContent =
      filteredData.length;

    const avgSentiment = d3.mean(filteredData, (d) => d.sentimentScore) || 0;
    document.getElementById('sentiment-avg-score').textContent =
      avgSentiment.toFixed(3);

    const mostUsed = filteredData.length
      ? filteredData.reduce(
          (max, d) => (d.occurrences > max.occurrences ? d : max),
          filteredData[0]
        )
      : null;
    document.getElementById('sentiment-most-used').textContent = mostUsed
      ? mostUsed.emoji
      : '-';

    const mostPositive = filteredData.length
      ? filteredData.reduce(
          (max, d) => (d.sentimentScore > max.sentimentScore ? d : max),
          filteredData[0]
        )
      : null;
    document.getElementById('sentiment-most-positive').textContent =
      mostPositive ? mostPositive.emoji : '-';
  },

  attachEventListeners() {
    // Use jQuery events to support Select2
    $('#sentiment-filter').on('change', () => this.updateVisualization());

    // Checkbox event listener
    const filterRareCheckbox = document.getElementById('sentiment-filter-rare');
    if (filterRareCheckbox) {
      filterRareCheckbox.addEventListener('change', () =>
        this.updateVisualization()
      );
    }
  },
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('sentiment-visualization')) {
    SentimentApp.init();
  }
});
