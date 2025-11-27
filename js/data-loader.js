/**
 * Data Loader Module
 * Handles loading and preprocessing of emoji data
 */

const DataLoader = {
    emojiMap: {
        "airplane": "✈️", "alien_monster": "👾", "american_football": "🏈", "angry": "😠", "apple": "🍎", 
        "baby": "👶", "balloon": "🎈", "ballot_box_with_ballot": "🗳️", "banana": "🍌", "baseball": "⚾", 
        "basketball": "🏀", "bear": "🐻", "bee": "🐝", "beer": "🍺", "bicycle": "🚲", "bikini": "👙", 
        "bird": "🐦", "bomb": "💣", "books": "📚", "brazil": "🇧🇷", "broken": "💔", "cactus": "🌵", 
        "calendar": "📅", "candy": "🍬", "cat": "🐱", "chart_decr": "📉", "chart_incr": "📈", 
        "chequered_flag": "🏁", "chicken": "🐔", "china": "🇨🇳", "church": "⛪", "cigarette": "🚬", 
        "clapper_board": "🎬", "cookie": "🍪", "cow": "🐮", "crocodile": "🐊", "dog": "🐶", 
        "dragon": "🐉", "elephant": "🐘", "envelope": "✉️", "eritrea": "🇪🇷", "factory": "🏭", 
        "fallen_leaf": "🍂", "fish": "🐟", "football": "⚽", "four_leaf_clover": "🍀", "france": "🇫🇷", 
        "fuel": "⛽", "game": "🎮", "germany": "🇩🇪", "ghost": "👻", "graduation_cap": "🎓", 
        "guitar": "🎸", "hong_kong": "🇭🇰", "horse": "🐴", "hourglass_done": "⌛", "india": "🇮🇳", 
        "ireland": "🇮🇪", "itlay": "🇮🇹", "japan": "🇯🇵", "kitchen_knife": "🔪", "koala": "🐨", 
        "korea": "🇰🇷", "lemon": "🍋", "light_bulb": "💡", "lion": "🦁", "mens_room": "🚹", 
        "money": "💰", "mouse": "🐭", "movie_camera": "🎥", "musical_note": "🎵", 
        "palestinian_territories": "🇵🇸", "panda": "🐼", "pear": "🍐", "penguin": "🐧", "pig": "🐷", 
        "pile_of_poo": "💩", "pistol": "🔫", "pizza": "🍕", "rabbit": "🐰", "rainbow": "🌈", 
        "recycle": "♻️", "reminder_ribbon": "🎗️", "ring": "💍", "rocket": "🚀", "rose": "🌹", 
        "santa": "🎅", "scissors": "✂️", "shooting_star": "🌠", "skis": "🎿", "snail": "🐌", 
        "snake": "🐍", "snowboarder": "🏂", "snowflake": "❄️", "soft_ice_cream": "🍦", 
        "spain": "🇪🇸", "syria": "🇸🇾", "syringe": "💉", "toilet": "🚽", "tomato": "🍅", 
        "top_hat": "🎩", "tree": "🌳", "trophy": "🏆", "turtle": "🐢", "uk": "🇬🇧", 
        "unicorn": "🦄", "us": "🇺🇸", "violin": "🎻", "watermelon": "🍉", "wheelchair_symbol": "♿", 
        "womens_room": "🚺", "wrapped_gift": "🎁"
    },

    get emojiList() {
        return Object.keys(this.emojiMap);
    },

    /**
     * Get the unicode character for an emoji slug
     */
    getEmojiChar(slug) {
        return this.emojiMap[slug] || '❓';
    },

    /**
     * Load all datasets (initial load)
     */
    async loadAll() {
        return { emojis: this.emojiList };
    },

    /**
     * Load time series data for a specific emoji
     */
    async loadEmojiTimeSeries(emojiName) {
        try {
            const data = await d3.csv(`data/emojis_50/${emojiName}.csv`);
            return this.processTimeSeriesData(data, emojiName);
        } catch (error) {
            console.error(`Error loading data for ${emojiName}:`, error);
            return [];
        }
    },

    /**
     * Process time series data
     */
    processTimeSeriesData(data, emojiName) {
        const parseDate = d3.timeParse("%Y-%m-%d");
        const emojiChar = this.getEmojiChar(emojiName);
        
        return data.map(d => ({
            date: parseDate(d.day),
            usage: +d.usage,
            emoji: emojiName,
            emojiChar: emojiChar
        })).sort((a, b) => a.date - b.date);
    },

    /**
     * Aggregate data by time granularity
     * @param {Array} data - Array of data points
     * @param {String} granularity - 'day', 'week', 'month', 'year'
     */
    aggregateData(data, granularity) {
        if (granularity === 'day') return data;

        // Group by time period
        const grouped = d3.group(data, d => {
            const date = new Date(d.date);
            switch (granularity) {
                case 'month':
                    return new Date(date.getFullYear(), date.getMonth(), 1);
                case 'year':
                    return new Date(date.getFullYear(), 0, 1);
                case 'week':
                    // Returns first day of the week (Sunday)
                    const day = date.getDay();
                    const diff = date.getDate() - day;
                    return new Date(date.setDate(diff));
                default:
                    return d.date;
            }
        });

        // Convert back to array and sum usage
        return Array.from(grouped, ([date, values]) => ({
            date: date,
            usage: d3.sum(values, d => d.usage),
            emoji: values[0].emoji,
            emojiChar: values[0].emojiChar
        })).sort((a, b) => a.date - b.date);
    }
};
