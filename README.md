# Emoji Data Story

An interactive data visualization story exploring emoji usage and sentiment, inspired by The Pudding's style of data journalism.

## Features

- 🎨 **Modern, Responsive Design**: Beautiful UI that works on all devices
- 📊 **Interactive Visualizations**: Built with D3.js for dynamic data visualization
- 📖 **Scrollytelling**: Engaging scroll-based narrative experience using Scrollama
- 📈 **Data-Driven**: Uses real emoji sentiment and usage data

## Project Structure

```
cs448b-final-project/
├── index.html              # Main HTML file
├── styles/
│   └── main.css           # Styles and animations
├── js/
│   ├── main.js            # Application initialization and main logic
│   ├── data-loader.js     # Data loading and preprocessing
│   └── visualizations.js  # D3.js visualization functions
├── data/
│   ├── Emoji_Sentiment_Data_v1.0.csv
│   └── emoji_usage_dataset.csv
├── package.json           # Project metadata
└── README.md             # This file
```

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, or Edge)
- Python 3 (for running a local server)

### Installation

1. Clone or download this repository
2. Navigate to the project directory:
   ```bash
   cd cs448b-final-project
   ```

### Running the Application

#### Option 1: Using Python's built-in server

```bash
npm start
# or directly
python3 -m http.server 8000
```

Then open your browser to: `http://localhost:8000`

#### Option 2: Using any other local server

You can use any local web server like:
- `npx http-server`
- VS Code's Live Server extension
- Node's `http-server` package

### Development

The app uses vanilla JavaScript and loads libraries from CDN:
- **D3.js v7**: For data visualization
- **Scrollama**: For scrollytelling functionality
- **Intersection Observer**: For scroll detection

No build process is required! Just edit the files and refresh your browser.

## Customization

### Adding New Visualizations

1. Add your visualization function to `js/visualizations.js`
2. Call it from the appropriate section in `js/main.js`

### Modifying the Story

1. Edit the content in `index.html` (sections, steps, text)
2. Update the step handling in `js/main.js` to match your narrative
3. Adjust styles in `styles/main.css`

### Working with Data

The `DataLoader` module in `js/data-loader.js` provides:
- `loadAll()`: Load all datasets
- `getTopEmojis()`: Get top N emojis by any criteria
- `filterBySentiment()`: Filter by positive/negative/neutral
- `getSummaryStats()`: Calculate statistics for any numeric field

## Libraries Used

- [D3.js](https://d3js.org/) - Data visualization
- [Scrollama](https://github.com/russellgoldenberg/scrollama) - Scrollytelling
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) - Scroll detection

## Next Steps

- Add more visualization types (pie charts, network graphs, etc.)
- Enhance interactivity with filters and controls
- Add transitions and animations between scroll steps
- Implement more complex data analysis
- Add mobile-specific optimizations
- Include additional emoji datasets

## Resources

- [The Pudding](https://pudding.cool/) - Inspiration for data stories
- [D3.js Gallery](https://observablehq.com/@d3/gallery) - Visualization examples
- [Scrollama Examples](https://russellgoldenberg.github.io/scrollama/) - Scrollytelling patterns

## License

MIT



