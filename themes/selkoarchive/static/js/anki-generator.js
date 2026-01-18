/**
 * Anki Card Generator for Selkouutiset Archive
 * Generates Anki-importable text files from bilingual articles
 */

class AnkiGenerator {
  constructor() {
    this.currentLang = document.documentElement.lang || 'fi';
    this.otherLang = this.currentLang === 'fi' ? 'en' : 'fi';
  }

  /**
   * Get the article content from the current page
   */
  getCurrentContent() {
    const article = document.querySelector('article.prose');
    if (!article) {
      throw new Error('Article content not found');
    }
    return article;
  }

  /**
   * Fetch the translation of the current article
   */
  async fetchTranslation() {
    // Find the translation link
    const translationLink = document.querySelector(`aside a[hreflang="${this.otherLang}"]`);
    if (!translationLink) {
      throw new Error('Translation link not found');
    }

    const translationUrl = translationLink.href;

    try {
      const response = await fetch(translationUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch translation: ${response.status}`);
      }

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const article = doc.querySelector('article.prose');

      if (!article) {
        throw new Error('Translation article not found');
      }

      return article;
    } catch (error) {
      console.error('Error fetching translation:', error);
      throw error;
    }
  }

  /**
   * Clean an element by removing non-content elements
   */
  cleanElement(element) {
    // Clone the element to avoid modifying the original
    const clone = element.cloneNode(true);

    // Remove images and their containers
    clone.querySelectorAll('img, picture, figure').forEach(el => el.remove());

    // Remove SVG elements (icons, graphics)
    clone.querySelectorAll('svg').forEach(el => el.remove());

    // Remove audio/video players
    clone.querySelectorAll('audio, video, iframe').forEach(el => el.remove());

    // Remove buttons and interactive elements
    clone.querySelectorAll('button').forEach(el => el.remove());

    // Remove elements with common UI/metadata classes or data attributes
    clone.querySelectorAll('[class*="player"], [class*="audio"], [class*="video"], [data-player], [data-audio]').forEach(el => el.remove());

    // Remove links that only contain images (like image viewer triggers)
    clone.querySelectorAll('a').forEach(link => {
      const text = link.textContent.trim();
      // Remove links that are very short or contain image-related keywords
      if (text.length < 10 || /^(avaa|open|view|katselu|kuvi)/i.test(text)) {
        const hasOnlyImage = link.querySelector('img') && text.replace(/\s/g, '').length < 20;
        if (hasOnlyImage || /kuvi|image|view|katselu/i.test(text)) {
          link.remove();
        }
      }
    });

    return clone;
  }

  /**
   * Split content into sentences
   */
  splitIntoSentences(text) {
    // Simple sentence splitting - can be improved for Finnish
    // Handles common abbreviations
    const sentences = text
      .replace(/([.!?])\s+(?=[A-ZÄÖÅ])/g, '$1|')
      .split('|')
      .map(s => s.trim())
      .filter(s => {
        // Filter out very short sentences (likely UI elements)
        if (s.length < 15) return false;

        // Filter out time codes (e.g., "3:02", "Listen 3:02")
        if (/^\d+:\d+$/.test(s) || /^(kuuntele|listen|avaa|open)\s*\d+:\d+/i.test(s)) return false;

        // Filter out image-related text
        if (/^(avaa kuvi|open image|view)/i.test(s)) return false;

        return true;
      });

    return sentences;
  }

  /**
   * Split content into paragraphs
   */
  splitIntoParagraphs(element) {
    const paragraphs = [];
    const pElements = element.querySelectorAll('p');

    pElements.forEach(p => {
      // Clean the paragraph by removing images, SVG, audio players, etc.
      const cleaned = this.cleanElement(p);
      const text = cleaned.textContent.trim();

      // Only include paragraphs with substantial content
      // Filter out very short paragraphs that are likely UI elements
      if (text.length >= 20) {
        // Additional check: must contain at least one sentence-ending punctuation
        // or be a reasonable length (60+ chars)
        if (text.length >= 60 || /[.!?]/.test(text)) {
          paragraphs.push(text);
        }
      }
    });

    return paragraphs;
  }

  /**
   * Split content into sections
   */
  splitIntoSections(element) {
    const sections = [];
    const children = Array.from(element.children);

    let currentSection = { heading: '', content: [] };

    children.forEach(child => {
      if (child.tagName.match(/^H[2-6]$/)) {
        // New section starts
        if (currentSection.heading || currentSection.content.length > 0) {
          sections.push(currentSection);
        }
        currentSection = { heading: child.textContent.trim(), content: [] };
      } else if (child.tagName === 'P') {
        // Clean the paragraph by removing images, SVG, audio players, etc.
        const cleaned = this.cleanElement(child);
        const text = cleaned.textContent.trim();

        // Only include paragraphs with substantial content
        if (text.length >= 20 && (text.length >= 60 || /[.!?]/.test(text))) {
          currentSection.content.push(text);
        }
      }
    });

    // Add the last section
    if (currentSection.heading || currentSection.content.length > 0) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Generate cards at sentence level
   */
  async generateSentenceCards() {
    const currentArticle = this.getCurrentContent();
    const translationArticle = await this.fetchTranslation();

    const currentParagraphs = this.splitIntoParagraphs(currentArticle);
    const translationParagraphs = this.splitIntoParagraphs(translationArticle);

    console.log(`Found ${currentParagraphs.length} paragraphs in ${this.currentLang}, ${translationParagraphs.length} in ${this.otherLang}`);

    // Warn if paragraph counts are very different
    const paragraphRatio = Math.max(currentParagraphs.length, translationParagraphs.length) /
                          Math.min(currentParagraphs.length, translationParagraphs.length);
    if (paragraphRatio > 1.5) {
      console.warn(`Warning: Paragraph count mismatch. This may indicate parsing issues or different article structures.`);
    }

    const cards = [];
    let skippedParagraphs = 0;

    // Process each paragraph pair
    const maxParagraphs = Math.min(currentParagraphs.length, translationParagraphs.length);

    for (let i = 0; i < maxParagraphs; i++) {
      const currentSentences = this.splitIntoSentences(currentParagraphs[i]);
      const translationSentences = this.splitIntoSentences(translationParagraphs[i]);

      console.log(`Paragraph ${i + 1}: ${currentSentences.length} sentences in ${this.currentLang}, ${translationSentences.length} in ${this.otherLang}`);

      // Skip paragraphs with severe sentence count mismatches (likely parsing errors)
      const sentenceRatio = Math.max(currentSentences.length, translationSentences.length) /
                           Math.max(Math.min(currentSentences.length, translationSentences.length), 1);
      if (sentenceRatio > 2.5 && Math.abs(currentSentences.length - translationSentences.length) > 2) {
        console.warn(`Skipping paragraph ${i + 1} due to severe sentence count mismatch (${currentSentences.length} vs ${translationSentences.length})`);
        skippedParagraphs++;
        continue;
      }

      // Pair sentences - use the minimum count to avoid misalignment
      const maxSentences = Math.min(currentSentences.length, translationSentences.length);

      for (let j = 0; j < maxSentences; j++) {
        const front = this.currentLang === 'fi' ? currentSentences[j] : translationSentences[j];
        const back = this.currentLang === 'fi' ? translationSentences[j] : currentSentences[j];

        if (front && back) {
          cards.push({ front, back });
        }
      }
    }

    if (skippedParagraphs > 0) {
      console.log(`Skipped ${skippedParagraphs} paragraphs due to alignment issues`);
    }

    return cards;
  }

  /**
   * Generate cards at paragraph level
   */
  async generateParagraphCards() {
    const currentArticle = this.getCurrentContent();
    const translationArticle = await this.fetchTranslation();

    const currentParagraphs = this.splitIntoParagraphs(currentArticle);
    const translationParagraphs = this.splitIntoParagraphs(translationArticle);

    console.log(`Found ${currentParagraphs.length} paragraphs in ${this.currentLang}, ${translationParagraphs.length} in ${this.otherLang}`);

    // Warn if paragraph counts are very different
    if (currentParagraphs.length !== translationParagraphs.length) {
      console.warn(`Warning: Paragraph count mismatch (${currentParagraphs.length} vs ${translationParagraphs.length}). Some content may be missing from cards.`);
    }

    const cards = [];
    const maxParagraphs = Math.min(currentParagraphs.length, translationParagraphs.length);

    for (let i = 0; i < maxParagraphs; i++) {
      const front = this.currentLang === 'fi' ? currentParagraphs[i] : translationParagraphs[i];
      const back = this.currentLang === 'fi' ? translationParagraphs[i] : currentParagraphs[i];

      if (front && back) {
        cards.push({ front, back });
      }
    }

    return cards;
  }

  /**
   * Generate cards at section level
   */
  async generateSectionCards() {
    const currentArticle = this.getCurrentContent();
    const translationArticle = await this.fetchTranslation();

    const currentSections = this.splitIntoSections(currentArticle);
    const translationSections = this.splitIntoSections(translationArticle);

    const cards = [];
    const maxSections = Math.min(currentSections.length, translationSections.length);

    for (let i = 0; i < maxSections; i++) {
      const currentContent = currentSections[i].content.join('\n\n');
      const translationContent = translationSections[i].content.join('\n\n');

      if (currentContent && translationContent) {
        const front = this.currentLang === 'fi' ? currentContent : translationContent;
        const back = this.currentLang === 'fi' ? translationContent : currentContent;

        cards.push({ front, back });
      }
    }

    return cards;
  }

  /**
   * Convert cards to Anki-importable TSV format
   */
  cardsToTSV(cards, metadata = {}) {
    const lines = [];

    // Add metadata as comments
    lines.push('#separator:tab');
    lines.push('#html:false');
    lines.push('#tags column:3');
    if (metadata.title) {
      lines.push(`# Source: ${metadata.title}`);
    }
    if (metadata.url) {
      lines.push(`# URL: ${metadata.url}`);
    }
    lines.push('');

    // Add cards
    cards.forEach(card => {
      const front = card.front.replace(/\t/g, ' ').replace(/\n/g, '<br>');
      const back = card.back.replace(/\t/g, ' ').replace(/\n/g, '<br>');
      const tags = metadata.tags || 'selkouutiset';

      lines.push(`${front}\t${back}\t${tags}`);
    });

    return lines.join('\n');
  }

  /**
   * Download content as a file
   */
  downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate and download Anki cards
   */
  async generate(level) {
    try {
      // Show loading indicator
      const indicator = this.showLoadingIndicator();

      let cards = [];

      switch (level) {
        case 'sentence':
          cards = await this.generateSentenceCards();
          break;
        case 'paragraph':
          cards = await this.generateParagraphCards();
          break;
        case 'section':
          cards = await this.generateSectionCards();
          break;
        default:
          throw new Error(`Unknown level: ${level}`);
      }

      if (cards.length === 0) {
        alert('No cards generated. The article might not have a translation or the content structure is incompatible.');
        this.hideLoadingIndicator(indicator);
        return;
      }

      // Get metadata
      const title = document.title || 'Selkouutiset Article';
      const url = window.location.href;
      const date = new Date().toISOString().split('T')[0];

      const metadata = {
        title: title,
        url: url,
        tags: `selkouutiset ${this.currentLang}-${this.otherLang} ${level} ${date}`
      };

      // Convert to TSV
      const tsv = this.cardsToTSV(cards, metadata);

      // Generate filename
      const safeTitle = title.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
      const filename = `anki_${safeTitle}_${level}_${date}.txt`;

      // Download
      this.downloadFile(tsv, filename);

      this.hideLoadingIndicator(indicator);

      // Show success message
      alert(`Generated ${cards.length} cards!\n\nTo import into Anki:\n1. Open Anki\n2. File → Import\n3. Select the downloaded file\n4. Set "Fields separated by: Tab"\n5. Set "Allow HTML in fields"\n6. Click Import\n\nNote: Check your browser console (F12) for detailed parsing information and any warnings about content alignment.`);

    } catch (error) {
      console.error('Error generating Anki cards:', error);
      alert(`Error generating Anki cards: ${error.message}`);
    }
  }

  /**
   * Show a loading indicator
   */
  showLoadingIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'anki-loading';
    indicator.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 20px 40px;
      border-radius: 8px;
      font-size: 16px;
      z-index: 10000;
    `;
    indicator.textContent = 'Generating Anki cards...';
    document.body.appendChild(indicator);
    return indicator;
  }

  /**
   * Hide the loading indicator
   */
  hideLoadingIndicator(indicator) {
    if (indicator && indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  }
}

// Initialize global instance
window.ankiGenerator = new AnkiGenerator();

// Global function for easy access from HTML
window.generateAnkiCards = function(level) {
  window.ankiGenerator.generate(level);
};
