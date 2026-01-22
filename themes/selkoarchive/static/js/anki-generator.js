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
   * Extract metadata from the current page
   */
  extractMetadata() {
    const url = window.location.href;
    const title = document.title || 'Selkouutiset Article';

    // Try to extract date from URL (pattern: /YYYY/MM/DD/)
    const dateMatch = url.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
    const date = dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : null;

    // Get article heading
    const h1 = document.querySelector('article.prose h1');
    const articleTitle = h1 ? h1.textContent.trim() : title;

    return {
      url,
      title,
      articleTitle,
      date,
      generatedDate: new Date().toISOString().split('T')[0]
    };
  }

  /**
   * Format card metadata as HTML footer
   */
  formatCardMetadata(metadata, context = {}) {
    const parts = [];

    parts.push('<div style="margin-top: 1.5em; padding-top: 1em; border-top: 1px solid #ccc; font-size: 0.75em; color: #666;">');

    // Source line
    parts.push('<div style="margin-bottom: 0.5em;">');
    parts.push('<strong>Source:</strong> ');
    parts.push(`<a href="${metadata.url}" style="color: #a8763e;">Andrew's Selkouutiset Archive</a>`);
    parts.push('</div>');

    // Article title
    if (metadata.articleTitle) {
      parts.push('<div style="margin-bottom: 0.5em;">');
      parts.push('<strong>Article:</strong> ');
      parts.push(this.escapeHtml(metadata.articleTitle));
      parts.push('</div>');
    }

    // Date
    if (metadata.date) {
      parts.push('<div style="margin-bottom: 0.5em;">');
      parts.push('<strong>Date:</strong> ');
      parts.push(metadata.date);
      parts.push('</div>');
    }

    // Context: Section, Paragraph, Sentence
    if (context.section && context.sectionNumber) {
      parts.push('<div style="margin-bottom: 0.5em;">');
      parts.push('<strong>Section:</strong> ');
      parts.push(this.escapeHtml(context.section));
      if (context.sectionNumber) {
        parts.push(` (#${context.sectionNumber})`);
      }
      parts.push('</div>');
    } else if (context.paragraphNumber) {
      parts.push('<div style="margin-bottom: 0.5em;">');
      parts.push(`<strong>Location:</strong> Paragraph ${context.paragraphNumber}`);
      if (context.sentenceNumber) {
        parts.push(`, Sentence ${context.sentenceNumber}`);
      }
      parts.push('</div>');
    }

    // Footer with GitHub link
    parts.push('<div style="margin-top: 0.5em; padding-top: 0.5em; border-top: 1px solid #eee; font-size: 0.9em;">');
    parts.push('<a href="https://github.com/hiAndrewQuinn/selkouutiset-archive/issues" style="color: #a8763e;">Report an issue</a>');
    parts.push(' | ');
    parts.push(`Generated: ${metadata.generatedDate}`);
    parts.push('</div>');

    parts.push('</div>');

    return parts.join('');
  }

  /**
   * Escape HTML special characters
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

        // Filter out photo credits
        if (/^(kuva|photo|image|copyright|©|photographer|valokuva|foto):/i.test(s)) return false;

        // Filter out markdown image syntax ![alt](url)
        if (/^!\[.*?\]\(.*?\)/.test(s)) return false;

        // Filter out sentences that are mostly markdown images
        if (s.includes('![') && s.includes('](')) return false;

        // Filter out data URIs (base64 encoded images)
        if (s.includes('data:image/') || s.includes('base64')) return false;

        // Filter out sentences with image URLs
        if (/\.(jpg|jpeg|png|gif|svg|webp)/i.test(s)) return false;

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

      // Filter out photo credits and captions
      if (/^(kuva|photo|image|copyright|©|photographer|valokuva|foto):/i.test(text)) {
        return; // Skip this paragraph
      }

      // Filter out markdown images
      if (/^!\[.*?\]\(.*?\)/.test(text) || (text.includes('![') && text.includes(']('))) {
        return; // Skip this paragraph
      }

      // Filter out data URIs and image URLs
      if (text.includes('data:image/') || text.includes('base64') || /\.(jpg|jpeg|png|gif|svg|webp)/i.test(text)) {
        return; // Skip this paragraph
      }

      // Skip paragraphs that look like image captions
      // Pattern: Name. Photo: Credit
      // Pattern: Short name followed by period
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      if (sentences.length === 1 && text.length < 50) {
        // Single short sentence - likely a caption or title
        return;
      }

      // Check if it's a caption pattern (Name + Photo credit)
      if (sentences.length === 2 && sentences[1].match(/^\s*(kuva|photo|image|foto|valokuva)/i)) {
        return; // Skip caption paragraphs
      }

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

        // Apply same filters as splitIntoParagraphs
        // Filter out photo credits and captions
        if (/^(kuva|photo|image|copyright|©|photographer|valokuva|foto):/i.test(text)) {
          return;
        }

        // Filter out markdown images
        if (/^!\[.*?\]\(.*?\)/.test(text) || (text.includes('![') && text.includes(']('))) {
          return;
        }

        // Filter out data URIs and image URLs
        if (text.includes('data:image/') || text.includes('base64') || /\.(jpg|jpeg|png|gif|svg|webp)/i.test(text)) {
          return;
        }

        // Skip caption-like paragraphs
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        if (sentences.length === 1 && text.length < 50) {
          return;
        }
        if (sentences.length === 2 && sentences[1].match(/^\s*(kuva|photo|image|foto|valokuva)/i)) {
          return;
        }

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

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🎴 ANKI SENTENCE CARD GENERATION - DETAILED LOG');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Found ${currentParagraphs.length} paragraphs in ${this.currentLang}, ${translationParagraphs.length} in ${this.otherLang}`);

    // Warn if paragraph counts are very different
    const paragraphRatio = Math.max(currentParagraphs.length, translationParagraphs.length) /
                          Math.min(currentParagraphs.length, translationParagraphs.length);
    if (paragraphRatio > 1.5) {
      console.warn(`⚠️  WARNING: Paragraph count mismatch. This may indicate parsing issues or different article structures.`);
    }

    const cards = [];
    let skippedParagraphs = 0;

    // Process each paragraph pair
    const maxParagraphs = Math.min(currentParagraphs.length, translationParagraphs.length);

    for (let i = 0; i < maxParagraphs; i++) {
      const currentSentences = this.splitIntoSentences(currentParagraphs[i]);
      const translationSentences = this.splitIntoSentences(translationParagraphs[i]);

      console.log(`\n--- Paragraph ${i + 1} ---`);
      console.log(`${this.currentLang} sentences (${currentSentences.length}):`);
      currentSentences.forEach((s, idx) => console.log(`  [${idx + 1}] ${s.substring(0, 100)}${s.length > 100 ? '...' : ''}`));
      console.log(`${this.otherLang} sentences (${translationSentences.length}):`);
      translationSentences.forEach((s, idx) => console.log(`  [${idx + 1}] ${s.substring(0, 100)}${s.length > 100 ? '...' : ''}`));

      // Skip paragraphs with severe sentence count mismatches (likely parsing errors)
      const sentenceRatio = Math.max(currentSentences.length, translationSentences.length) /
                           Math.max(Math.min(currentSentences.length, translationSentences.length), 1);
      if (sentenceRatio > 2.5 && Math.abs(currentSentences.length - translationSentences.length) > 2) {
        console.warn(`⚠️  SKIPPING paragraph ${i + 1} due to severe sentence count mismatch (${currentSentences.length} vs ${translationSentences.length})`);
        skippedParagraphs++;
        continue;
      }

      // Pair sentences - use the minimum count to avoid misalignment
      const maxSentences = Math.min(currentSentences.length, translationSentences.length);

      console.log(`\nPairing sentences (using ${maxSentences} pairs):`);
      for (let j = 0; j < maxSentences; j++) {
        const fiSentence = this.currentLang === 'fi' ? currentSentences[j] : translationSentences[j];
        const enSentence = this.currentLang === 'fi' ? translationSentences[j] : currentSentences[j];

        if (fiSentence && enSentence) {
          console.log(`  Card ${cards.length + 1}:`);
          console.log(`    FI: ${fiSentence.substring(0, 80)}${fiSentence.length > 80 ? '...' : ''}`);
          console.log(`    EN: ${enSentence.substring(0, 80)}${enSentence.length > 80 ? '...' : ''}`);
          cards.push({
            front: fiSentence,
            back: enSentence,
            context: {
              paragraphNumber: i + 1,
              sentenceNumber: j + 1
            }
          });
        }
      }

      // Warn about unpaired sentences
      if (currentSentences.length !== translationSentences.length) {
        const diff = Math.abs(currentSentences.length - translationSentences.length);
        console.warn(`⚠️  ${diff} sentence(s) not paired in paragraph ${i + 1}`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 GENERATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`✅ Total cards generated: ${cards.length}`);
    console.log(`📝 Paragraphs processed: ${maxParagraphs}`);
    if (skippedParagraphs > 0) {
      console.log(`⚠️  Paragraphs skipped due to alignment issues: ${skippedParagraphs}`);
    }
    console.log('═══════════════════════════════════════════════════════════\n');

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

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🎴 ANKI PARAGRAPH CARD GENERATION - DETAILED LOG');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Found ${currentParagraphs.length} paragraphs in ${this.currentLang}, ${translationParagraphs.length} in ${this.otherLang}`);

    // Warn if paragraph counts are very different
    const paragraphRatio = Math.max(currentParagraphs.length, translationParagraphs.length) /
                          Math.max(Math.min(currentParagraphs.length, translationParagraphs.length), 1);
    if (paragraphRatio > 1.5) {
      console.warn(`⚠️  WARNING: Paragraph count mismatch ratio ${paragraphRatio.toFixed(2)}. This may indicate parsing issues or different article structures.`);
    }

    const cards = [];
    const maxParagraphs = Math.min(currentParagraphs.length, translationParagraphs.length);
    let skippedParagraphs = 0;

    console.log(`\n--- Processing ${maxParagraphs} paragraph pairs ---`);

    for (let i = 0; i < maxParagraphs; i++) {
      const front = this.currentLang === 'fi' ? currentParagraphs[i] : translationParagraphs[i];
      const back = this.currentLang === 'fi' ? translationParagraphs[i] : currentParagraphs[i];

      console.log(`\n--- Paragraph ${i + 1} ---`);
      console.log(`FI (${front.length} chars): ${front.substring(0, 120)}${front.length > 120 ? '...' : ''}`);
      console.log(`EN (${back.length} chars): ${back.substring(0, 120)}${back.length > 120 ? '...' : ''}`);

      // Check for length ratio anomalies (translations should be roughly similar length)
      const lengthRatio = Math.max(front.length, back.length) / Math.max(Math.min(front.length, back.length), 1);
      if (lengthRatio > 3) {
        console.warn(`⚠️  WARNING: Length ratio ${lengthRatio.toFixed(2)} - possible misalignment`);
      }

      if (front && back) {
        console.log(`  ✅ Card ${cards.length + 1} created`);
        cards.push({
          front,
          back,
          context: {
            paragraphNumber: i + 1
          }
        });
      } else {
        console.warn(`  ⚠️  SKIPPED: Empty content (front: ${!!front}, back: ${!!back})`);
        skippedParagraphs++;
      }
    }

    // Log unpaired paragraphs
    if (currentParagraphs.length !== translationParagraphs.length) {
      const extraLang = currentParagraphs.length > translationParagraphs.length ? this.currentLang : this.otherLang;
      const extraCount = Math.abs(currentParagraphs.length - translationParagraphs.length);
      console.warn(`\n⚠️  ${extraCount} paragraph(s) in ${extraLang} have no pair and were not included`);
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 GENERATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`✅ Total cards generated: ${cards.length}`);
    console.log(`📝 Paragraphs processed: ${maxParagraphs}`);
    if (skippedParagraphs > 0) {
      console.log(`⚠️  Paragraphs skipped due to empty content: ${skippedParagraphs}`);
    }
    if (currentParagraphs.length !== translationParagraphs.length) {
      console.log(`⚠️  Unpaired paragraphs: ${Math.abs(currentParagraphs.length - translationParagraphs.length)}`);
    }
    console.log('═══════════════════════════════════════════════════════════\n');

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

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🎴 ANKI SECTION CARD GENERATION - DETAILED LOG');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Found ${currentSections.length} sections in ${this.currentLang}, ${translationSections.length} in ${this.otherLang}`);

    // Log all section headings for comparison
    console.log(`\n--- Section headings in ${this.currentLang} ---`);
    currentSections.forEach((s, idx) => {
      const heading = s.heading || '(no heading)';
      console.log(`  [${idx + 1}] ${heading} (${s.content.length} paragraphs)`);
    });
    console.log(`\n--- Section headings in ${this.otherLang} ---`);
    translationSections.forEach((s, idx) => {
      const heading = s.heading || '(no heading)';
      console.log(`  [${idx + 1}] ${heading} (${s.content.length} paragraphs)`);
    });

    // Warn if section counts are very different
    const sectionRatio = Math.max(currentSections.length, translationSections.length) /
                        Math.max(Math.min(currentSections.length, translationSections.length), 1);
    if (sectionRatio > 1.5) {
      console.warn(`⚠️  WARNING: Section count mismatch ratio ${sectionRatio.toFixed(2)}. This may indicate parsing issues or different article structures.`);
    }

    const cards = [];
    const maxSections = Math.min(currentSections.length, translationSections.length);
    let skippedSections = 0;

    console.log(`\n--- Processing ${maxSections} section pairs ---`);

    for (let i = 0; i < maxSections; i++) {
      const currentContent = currentSections[i].content.join('\n\n');
      const translationContent = translationSections[i].content.join('\n\n');
      const sectionHeading = currentSections[i].heading || '(no heading)';
      const translationHeading = translationSections[i].heading || '(no heading)';

      console.log(`\n--- Section ${i + 1}: "${sectionHeading}" / "${translationHeading}" ---`);
      console.log(`${this.currentLang}: ${currentSections[i].content.length} paragraphs, ${currentContent.length} chars`);
      console.log(`${this.otherLang}: ${translationSections[i].content.length} paragraphs, ${translationContent.length} chars`);

      // Log paragraph previews
      if (currentSections[i].content.length > 0) {
        console.log(`  ${this.currentLang} preview: ${currentContent.substring(0, 100)}${currentContent.length > 100 ? '...' : ''}`);
      }
      if (translationSections[i].content.length > 0) {
        console.log(`  ${this.otherLang} preview: ${translationContent.substring(0, 100)}${translationContent.length > 100 ? '...' : ''}`);
      }

      // Check for paragraph count mismatches within sections
      const paragraphRatio = Math.max(currentSections[i].content.length, translationSections[i].content.length) /
                            Math.max(Math.min(currentSections[i].content.length, translationSections[i].content.length), 1);
      if (paragraphRatio > 2) {
        console.warn(`  ⚠️  WARNING: Paragraph count mismatch within section (${currentSections[i].content.length} vs ${translationSections[i].content.length})`);
      }

      if (currentContent && translationContent) {
        const front = this.currentLang === 'fi' ? currentContent : translationContent;
        const back = this.currentLang === 'fi' ? translationContent : currentContent;

        console.log(`  ✅ Card ${cards.length + 1} created for section "${sectionHeading}"`);
        cards.push({
          front,
          back,
          context: {
            section: currentSections[i].heading,
            sectionNumber: i + 1
          }
        });
      } else {
        console.warn(`  ⚠️  SKIPPED: Empty content in section "${sectionHeading}" (current: ${!!currentContent}, translation: ${!!translationContent})`);
        skippedSections++;
      }
    }

    // Log unpaired sections
    if (currentSections.length !== translationSections.length) {
      const extraLang = currentSections.length > translationSections.length ? this.currentLang : this.otherLang;
      const extraCount = Math.abs(currentSections.length - translationSections.length);
      console.warn(`\n⚠️  ${extraCount} section(s) in ${extraLang} have no pair and were not included`);
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 GENERATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`✅ Total cards generated: ${cards.length}`);
    console.log(`📑 Sections processed: ${maxSections}`);
    if (skippedSections > 0) {
      console.log(`⚠️  Sections skipped due to empty content: ${skippedSections}`);
    }
    if (currentSections.length !== translationSections.length) {
      console.log(`⚠️  Unpaired sections: ${Math.abs(currentSections.length - translationSections.length)}`);
    }
    console.log('═══════════════════════════════════════════════════════════\n');

    return cards;
  }

  /**
   * Convert cards to Anki-importable TSV format
   */
  cardsToTSV(cards, metadata = {}) {
    const lines = [];

    // Add metadata as comments
    lines.push('#separator:tab');
    lines.push('#html:true');  // Enable HTML for styled metadata
    lines.push('#tags column:3');
    if (metadata.title) {
      lines.push(`# Source: ${metadata.title}`);
    }
    if (metadata.url) {
      lines.push(`# URL: ${metadata.url}`);
    }
    lines.push('');

    // Extract page metadata once
    const pageMetadata = this.extractMetadata();

    // Add cards with metadata
    cards.forEach(card => {
      const front = card.front.replace(/\t/g, ' ').replace(/\n/g, '<br>');
      let back = card.back.replace(/\t/g, ' ').replace(/\n/g, '<br>');

      // Append metadata to the back of each card
      const cardMetadata = this.formatCardMetadata(pageMetadata, card.context || {});
      back += cardMetadata;

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
