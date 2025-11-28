/**
 * Data Loader Module
 * Handles loading and preprocessing of emoji data
 */

const DataLoader = {
  // URL for the rich emoji metadata
  EMOJI_METADATA_URL: "https://unpkg.com/emoji-datasource@15.0.0/emoji.json",

  emojiMap: {
    airplane: "✈️",
    alien_monster: "👾",
    american_football: "🏈",
    angry: "😠",
    apple: "🍎",
    baby: "👶",
    balloon: "🎈",
    ballot_box_with_ballot: "🗳️",
    banana: "🍌",
    baseball: "⚾",
    basketball: "🏀",
    bear: "🐻",
    bee: "🐝",
    beer: "🍺",
    bicycle: "🚲",
    bikini: "👙",
    bird: "🐦",
    bomb: "💣",
    books: "📚",
    brazil: "🇧🇷",
    broken: "💔",
    cactus: "🌵",
    calendar: "📅",
    candy: "🍬",
    cat: "🐱",
    chart_decr: "📉",
    chart_incr: "📈",
    chequered_flag: "🏁",
    chicken: "🐔",
    china: "🇨🇳",
    church: "⛪",
    cigarette: "🚬",
    clapper_board: "🎬",
    cookie: "🍪",
    cow: "🐮",
    crocodile: "🐊",
    dog: "🐶",
    dragon: "🐉",
    elephant: "🐘",
    envelope: "✉️",
    eritrea: "🇪🇷",
    factory: "🏭",
    fallen_leaf: "🍂",
    fish: "🐟",
    football: "⚽",
    four_leaf_clover: "🍀",
    france: "🇫🇷",
    fuel: "⛽",
    game: "🎮",
    germany: "🇩🇪",
    ghost: "👻",
    graduation_cap: "🎓",
    guitar: "🎸",
    hong_kong: "🇭🇰",
    horse: "🐴",
    hourglass_done: "⌛",
    india: "🇮🇳",
    ireland: "🇮🇪",
    itlay: "🇮🇹",
    japan: "🇯🇵",
    kitchen_knife: "🔪",
    koala: "🐨",
    korea: "🇰🇷",
    lemon: "🍋",
    light_bulb: "💡",
    lion: "🦁",
    mens_room: "🚹",
    money: "💰",
    mouse: "🐭",
    movie_camera: "🎥",
    musical_note: "🎵",
    palestinian_territories: "🇵🇸",
    panda: "🐼",
    pear: "🍐",
    penguin: "🐧",
    pig: "🐷",
    pile_of_poo: "💩",
    pistol: "🔫",
    pizza: "🍕",
    rabbit: "🐰",
    rainbow: "🌈",
    recycle: "♻️",
    reminder_ribbon: "🎗️",
    ring: "💍",
    rocket: "🚀",
    rose: "🌹",
    santa: "🎅",
    scissors: "✂️",
    shooting_star: "🌠",
    skis: "🎿",
    snail: "🐌",
    snake: "🐍",
    snowboarder: "🏂",
    snowflake: "❄️",
    soft_ice_cream: "🍦",
    spain: "🇪🇸",
    syria: "🇸🇾",
    syringe: "💉",
    toilet: "🚽",
    tomato: "🍅",
    top_hat: "🎩",
    tree: "🌳",
    trophy: "🏆",
    turtle: "🐢",
    uk: "🇬🇧",
    unicorn: "🦄",
    us: "🇺🇸",
    violin: "🎻",
    watermelon: "🍉",
    wheelchair_symbol: "♿",
    womens_room: "🚺",
    wrapped_gift: "🎁",
  },

  // Cache for the fetched metadata
  metadataCache: null,
  // Cache for full enriched list
  fullEmojiListCache: null,

  get emojiList() {
    return Object.keys(this.emojiMap);
  },

  /**
   * Get the unicode character for an emoji slug
   */
  getEmojiChar(slug) {
    return this.emojiMap[slug] || "❓";
  },

  /**
   * Helper to convert unified hex to emoji char
   */
  unifiedToChar(unified) {
    return String.fromCodePoint(
      ...unified.split("-").map((u) => parseInt(u, 16))
    );
  },

  /**
   * Helper to construct CDN URL for platform images
   */
  getPlatformImageUrl(unified, platform) {
    // using jsDelivr which is often faster/more reliable than unpkg
    // platform: apple, google, twitter, facebook
    return `https://cdn.jsdelivr.net/npm/emoji-datasource-${platform}@15.0.0/img/${platform}/64/${unified.toLowerCase()}.png`;
  },

  /**
   * Load all datasets (initial load)
   */
  async loadAll() {
    return { emojis: this.emojiList };
  },

  /**
   * Load time series data for a specific emoji from local CSV
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
   * Fetch All Emojis with Metadata
   * Returns the complete list from the API, enriched with local scores if available.
   */
  async fetchFullEmojiList() {
    try {
      if (this.fullEmojiListCache) return this.fullEmojiListCache;

      // 1. Fetch Metadata if not cached
      if (!this.metadataCache) {
        console.log("Fetching external emoji metadata...");
        const response = await fetch(this.EMOJI_METADATA_URL);
        if (!response.ok) throw new Error("Failed to load emoji metadata");
        this.metadataCache = await response.json();
      }

      // 2. Pre-calculate local scores to avoid repeated async calls in loop
      const localScores = new Map();
      await Promise.all(
        this.emojiList.map(async (slug) => {
          try {
            const data = await this.loadEmojiTimeSeries(slug);
            const totalScore = d3.sum(data, (d) => d.usage);
            localScores.set(slug, totalScore);
          } catch (e) {
            console.warn(`Failed to load score for ${slug}`);
          }
        })
      );

      // 3. Process ALL metadata items
      this.fullEmojiListCache = this.metadataCache.map((meta) => {
        // Check if we have local data for this emoji
        // We match by short_name or short_names
        const localSlug = this.emojiList.find(
          (slug) =>
            slug === meta.short_name ||
            (meta.short_names && meta.short_names.includes(slug))
        );

        const hasLocalData = !!localSlug;
        const score = hasLocalData ? localScores.get(localSlug) || 0 : 0;
        const char = this.unifiedToChar(meta.unified);

        return {
          id: meta.short_name, // Use short_name as ID
          localId: localSlug, // Keep track if it maps to our local CSVs
          name:
            meta.name ||
            meta.short_name
              .split("_")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" "),
          char: char,
          unified: meta.unified,
          score: score,
          category: meta.category || "Unknown",
          subcategory: meta.subcategory || null,
          sort_order: meta.sort_order || 99999,
          variations:
            meta.skin_variations && Object.keys(meta.skin_variations).length > 0
              ? Object.values(meta.skin_variations)
              : [],
          has_img_apple: meta.has_img_apple,
          has_img_google: meta.has_img_google,
          has_img_twitter: meta.has_img_twitter,
          has_img_facebook: meta.has_img_facebook,
        };
      });

      // Sort by Unicode Sort Order (default)
      this.fullEmojiListCache.sort((a, b) => a.sort_order - b.sort_order);

      return this.fullEmojiListCache;
    } catch (error) {
      console.error("Error fetching full emoji list:", error);
      return [];
    }
  },

  /**
   * Fetch details for a specific emoji
   * Now supports the full list structure
   */
  async fetchEmojiDetails(id) {
    if (!this.fullEmojiListCache) {
      await this.fetchFullEmojiList();
    }

    const emoji = this.fullEmojiListCache.find((e) => e.id === id);
    if (!emoji) return null;

    // Format variations into readable chars
    const variations = emoji.variations.map((v) => ({
      char: this.unifiedToChar(v.unified),
      name: "Skin Tone", // Simplified
      unified: v.unified, // Needed for images
    }));

    // Construct platform images
    const platforms = [];
    if (emoji.has_img_apple)
      platforms.push({
        name: "Apple",
        url: this.getPlatformImageUrl(emoji.unified, "apple"),
      });
    if (emoji.has_img_google)
      platforms.push({
        name: "Google",
        url: this.getPlatformImageUrl(emoji.unified, "google"),
      });
    if (emoji.has_img_twitter)
      platforms.push({
        name: "Twitter",
        url: this.getPlatformImageUrl(emoji.unified, "twitter"),
      });
    // Facebook often has issues or missing images in some CDN versions, but we add it if marked available
    if (emoji.has_img_facebook)
      platforms.push({
        name: "Facebook",
        url: this.getPlatformImageUrl(emoji.unified, "facebook"),
      });

    // Mock tweets/stats
    let recentTweets = [];
    if (emoji.score > 0) {
      recentTweets = [
        {
          screen_name: "Dataset Stats",
          text: `Total Usage: ${emoji.score.toLocaleString()}`,
        },
      ];
    } else {
      recentTweets = [
        {
          screen_name: "Info",
          text: "No local usage data available for this emoji.",
        },
      ];
    }

    return {
      char: emoji.char,
      name: emoji.name,
      score: emoji.score,
      popularity_rank: emoji.score > 0 ? "Top 50" : "General Library",
      category: emoji.category,
      description: emoji.name,
      variations: variations,
      platforms: platforms, // New field for platform images
      recent_tweets: recentTweets,
    };
  },

  /**
   * Process time series data
   */
  processTimeSeriesData(data, emojiName) {
    const parseDate = d3.timeParse("%Y-%m-%d");
    const emojiChar = this.getEmojiChar(emojiName);

    return data
      .map((d) => ({
        date: parseDate(d.day),
        usage: +d.usage,
        emoji: emojiName,
        emojiChar: emojiChar,
      }))
      .sort((a, b) => a.date - b.date);
  },

  /**
   * Aggregate data by time granularity
   */
  aggregateData(data, granularity) {
    if (granularity === "day") return data;

    const grouped = d3.group(data, (d) => {
      const date = new Date(d.date);
      switch (granularity) {
        case "month":
          return new Date(date.getFullYear(), date.getMonth(), 1);
        case "year":
          return new Date(date.getFullYear(), 0, 1);
        case "week":
          const day = date.getDay();
          const diff = date.getDate() - day;
          return new Date(date.setDate(diff));
        default:
          return d.date;
      }
    });

    return Array.from(grouped, ([date, values]) => ({
      date: date,
      usage: d3.sum(values, (d) => d.usage),
      emoji: values[0].emoji,
      emojiChar: values[0].emojiChar,
    })).sort((a, b) => a.date - b.date);
  },
};
