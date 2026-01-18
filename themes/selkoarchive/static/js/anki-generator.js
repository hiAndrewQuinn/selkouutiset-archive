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
   * Split content into sentences
   */
  splitIntoSentences(text) {
    // Simple sentence splitting - can be improved for Finnish
    // Handles common abbreviations
    const sentences = text
      .replace(/([.!?])\s+(?=[A-ZÄÖÅ])/g, '$1|')
      .split('|')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    return sentences;
  }

  /**
   * Split content into paragraphs
   */
  splitIntoParagraphs(element) {
    const paragraphs = [];
    const pElements = element.querySelectorAll('p');

    pElements.forEach(p => {
      const text = p.textContent.trim();
      if (text.length > 0) {
        paragraphs.push(text);
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
        const text = child.textContent.trim();
        if (text.length > 0) {
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

    const cards = [];

    // Process each paragraph pair
    const maxParagraphs = Math.min(currentParagraphs.length, translationParagraphs.length);

    for (let i = 0; i < maxParagraphs; i++) {
      const currentSentences = this.splitIntoSentences(currentParagraphs[i]);
      const translationSentences = this.splitIntoSentences(translationParagraphs[i]);

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
      alert(`Generated ${cards.length} cards!\n\nTo import into Anki:\n1. Open Anki\n2. File → Import\n3. Select the downloaded file\n4. Set "Fields separated by: Tab"\n5. Set "Allow HTML in fields"\n6. Click Import`);

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
