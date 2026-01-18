# Plan: Add Anki Card Generation Links

## Overview
Add hyperlinks next to the language selectors [fi] and [en] that allow users to generate Anki flashcards from article content at three different granularity levels:
- Sentence level
- Paragraph level
- Whole sections level

## Current State

### Language Selector Location
- **File**: `themes/selkoarchive/layouts/_default/single.html`
- **Current Structure**:
  ```html
  <aside>
  Languages:
  {{ range .AllTranslations }}
    {{ $langName := or .Language.LanguageName .Language.Lang }}
    {{ $langCode := or .Language.LanguageCode .Language.Lang }}
    <a href="{{ .RelPermalink }}" hreflang="{{ $langCode }}">[{{ $langName }}]</a>
  {{ end }}
  </aside>
  ```

### Styling
- Uses classless CSS design
- Link styling defined in `themes/selkoarchive/assets/css/main.css`
- Copper color (#a8763eff) with dotted underline
- Hover state with light yellow background

## Proposed Implementation

### Phase 1: UI Changes

#### 1.1 Template Modification
**File**: `themes/selkoarchive/layouts/_default/single.html`

Add Anki generation links after the language selectors:

```html
<aside>
Languages:
{{ range .AllTranslations }}
  {{ $langName := or .Language.LanguageName .Language.Lang }}
  {{ $langCode := or .Language.LanguageCode .Language.Lang }}
  <a href="{{ .RelPermalink }}" hreflang="{{ $langCode }}">[{{ $langName }}]</a>
{{ end }}
<br>
Generate Anki Cards:
<a href="/anki/generate?page={{ .RelPermalink }}&level=sentence">[sentence]</a>
<a href="/anki/generate?page={{ .RelPermalink }}&level=paragraph">[paragraph]</a>
<a href="/anki/generate?page={{ .RelPermalink }}&level=section">[section]</a>
</aside>
```

**Alternative Layout** (inline, more compact):
```html
<aside>
Languages:
{{ range .AllTranslations }}
  {{ $langName := or .Language.LanguageName .Language.Lang }}
  {{ $langCode := or .Language.LanguageCode .Language.Lang }}
  <a href="{{ .RelPermalink }}" hreflang="{{ $langCode }}">[{{ $langName }}]</a>
{{ end }}
| Anki:
<a href="/anki/generate?page={{ .RelPermalink }}&level=sentence">[sentence]</a>
<a href="/anki/generate?page={{ .RelPermalink }}&level=paragraph">[paragraph]</a>
<a href="/anki/generate?page={{ .RelPermalink }}&level=section">[section]</a>
</aside>
```

#### 1.2 CSS Considerations
- Links will inherit existing link styling
- Consider adding a specific class if different styling is desired
- Ensure adequate spacing between language selectors and Anki links

### Phase 2: Backend Implementation

#### 2.1 Anki Generation Approach

**Option A: External Service Integration**
- Link to an external Anki card generation service
- Pass article URL and granularity level as parameters
- Pros: No backend development needed
- Cons: Dependency on external service, potential privacy concerns

**Option B: Static Site Generator (Hugo) Partial**
- Create a Hugo partial that generates Anki-compatible files at build time
- Use Hugo's content processing capabilities
- Pros: Works with static site, no server needed
- Cons: Limited to pre-generated cards, no dynamic generation

**Option C: Server-Side Script/API**
- Implement a lightweight API endpoint (e.g., Python Flask, Go, Node.js)
- Process article content on-demand
- Generate and return Anki deck files (.apkg)
- Pros: Full control, dynamic generation
- Cons: Requires server infrastructure, adds complexity

**Option D: Client-Side JavaScript**
- Use JavaScript to parse article content in the browser
- Generate Anki cards using libraries like genanki-js or ankiconnect
- Download as .apkg or send to AnkiConnect
- Pros: No server needed, works with static site
- Cons: Processing in browser, limited by client capabilities

**Recommended Approach**: Option C (Server-Side Script) or Option D (Client-Side JavaScript)

#### 2.2 Content Parsing Requirements

**Sentence Level**:
- Parse article content and split into individual sentences
- Use language-aware sentence tokenization (different rules for Finnish vs English)
- Each flashcard: Front = Finnish sentence, Back = English translation (or vice versa)

**Paragraph Level**:
- Split content into paragraphs
- Each flashcard: Front = Finnish paragraph, Back = English paragraph
- Consider chunking very long paragraphs

**Section Level**:
- Identify sections (using HTML headings: h2, h3, etc.)
- Each flashcard: Front = Finnish section, Back = English section
- May need to limit to smaller sections to keep cards manageable

#### 2.3 Bilingual Content Handling

Since the site has both Finnish and English versions:
- Option 1: Always create bilingual cards (FI front / EN back)
- Option 2: Let user choose which direction (FI→EN or EN→FI)
- Option 3: Create cloze deletion cards instead of translation cards

#### 2.4 Anki Card Format

**Basic Structure** (using Anki's .apkg format):
- Deck name: "Selkouutiset - [Article Title] - [Level]"
- Model: Basic or Basic (and reversed card)
- Fields: Front, Back, Source URL, Date
- Tags: selkouutiset, [language], [level], [date]

**Metadata to Include**:
- Article title
- Publication date
- Source URL
- Language pair
- Granularity level

### Phase 3: Technical Implementation Details

#### 3.1 If Using Server-Side API

**Endpoint Structure**:
```
POST /anki/generate
Content-Type: application/json

{
  "pageUrl": "https://example.org/articles/...",
  "level": "sentence|paragraph|section",
  "sourceLanguage": "fi",
  "targetLanguage": "en"
}

Response:
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="selkouutiset-deck.apkg"
[Binary .apkg file]
```

**Technology Stack Options**:
- Python + Flask + genanki library
- Node.js + Express + anki-apkg-export
- Go + net/http + custom Anki format implementation

**Repository Structure**:
```
/anki-generator/
  ├── src/
  │   ├── parser.py/js      # Content parsing logic
  │   ├── generator.py/js   # Anki deck generation
  │   └── api.py/js         # API endpoint handlers
  ├── requirements.txt / package.json
  └── README.md
```

#### 3.2 If Using Client-Side JavaScript

**Implementation**:
- Add JavaScript to single.html or as a separate asset
- Use libraries: marked.js (for parsing), anki-apkg-export (for generation)
- Fetch bilingual content from both language versions
- Process and generate deck in browser
- Trigger download of .apkg file

**Challenges**:
- Need to fetch both language versions (CORS considerations)
- Larger JavaScript bundle size
- Processing time for large articles

#### 3.3 Hugo Integration Considerations

**If content is in submodule**:
- Content lives in separate repository: https://github.com/hiAndrewQuinn/selkouutiset-scrape-cleaned
- Need to ensure bilingual pairing is reliable
- May need to match Finnish and English versions by filename convention

**Content Access**:
- Hugo provides `.Content` for rendered HTML
- May need access to raw markdown for better parsing
- Use `.RawContent` or `.Plain` for text-only content

### Phase 4: User Experience Flow

1. User reads an article in their preferred language (fi or en)
2. User decides they want to create Anki flashcards
3. User clicks one of the three granularity options: [sentence] / [paragraph] / [section]
4. System:
   - Fetches both language versions of the article
   - Parses content based on selected granularity
   - Generates Anki deck with paired content
   - Returns .apkg file for download
5. User imports the .apkg file into their Anki application
6. User studies the flashcards

**Optional Enhancements**:
- Preview mode: Show what cards will be generated before downloading
- Customization: Let users select specific sentences/paragraphs to include
- Card type selection: Translation cards vs. Cloze deletion
- Integration with AnkiConnect: Directly add to Anki without file download

### Phase 5: Testing Strategy

#### 5.1 Unit Tests
- Test sentence tokenization for Finnish and English
- Test paragraph splitting
- Test section identification
- Test Anki deck generation

#### 5.2 Integration Tests
- Test full workflow: URL → parsed content → generated deck → valid .apkg
- Test with various article lengths and structures
- Test with special characters and Finnish-specific characters (ä, ö, å)

#### 5.3 Manual Testing
- Generate decks for sample articles
- Import into Anki and verify cards display correctly
- Test all three granularity levels
- Test with both Finnish and English source pages

### Phase 6: Documentation

#### 6.1 User Documentation
- Add section to README explaining the Anki generation feature
- Include instructions for importing .apkg files into Anki
- Explain the three granularity levels

#### 6.2 Developer Documentation
- Document the API endpoint (if applicable)
- Explain the content parsing logic
- Provide examples of the generated Anki deck structure

## Open Questions

1. **Hosting**: Where will the Anki generation service be hosted?
   - GitHub Pages (static only, rules out server-side API)
   - Netlify/Vercel (supports serverless functions)
   - Self-hosted server
   - Client-side only (no hosting needed)

2. **Card Direction**: Which direction should translation cards go?
   - Always FI → EN?
   - Always EN → FI?
   - User selectable?
   - Generate reversible cards?

3. **Content Alignment**: How to ensure Finnish and English content segments align properly?
   - Rely on article structure (same number of paragraphs/sections)?
   - Use paragraph-level matching heuristics?
   - Manual curation needed?

4. **Rate Limiting**: Should we limit how many decks users can generate?
   - Prevent abuse if using server resources
   - Or unlimited if client-side?

5. **Anki Model**: Which Anki note type to use?
   - Basic
   - Basic (and reversed card)
   - Cloze
   - Custom model with additional fields?

## Implementation Roadmap

### Minimal Viable Product (MVP)
1. Add UI links to single.html template
2. Implement basic client-side JavaScript solution
3. Support sentence-level cards only
4. Generate FI → EN translation cards
5. Download as .apkg file

### Future Enhancements
- Paragraph and section level support
- Server-side API for better performance
- Card customization options
- AnkiConnect integration
- Preview functionality
- Custom styling/CSS for Anki links
- Statistics: track which articles have generated decks

## Alternative Approaches

### Approach 1: Pre-generated Decks
Instead of dynamic generation, pre-generate Anki decks for all articles at build time:
- Add decks to git repository or separate storage
- Links download pre-generated files
- Pros: Simple, fast, works with static hosting
- Cons: Large repository size, updates require rebuild

### Approach 2: Bookmarklet
Instead of inline links, provide a bookmarklet that users can drag to their browser:
- Users click bookmarklet while on any article
- JavaScript extracts content and generates deck
- Pros: No template changes needed, works anywhere
- Cons: Less discoverable, more steps for users

### Approach 3: Browser Extension
Create a dedicated browser extension:
- Extension detects selkouutiset pages
- Adds Anki generation button
- Handles all logic in extension
- Pros: Rich functionality, no site changes needed
- Cons: Users must install extension, development overhead

## Success Criteria

- [ ] Links are visible and accessible on all article pages
- [ ] Links follow the existing design language
- [ ] Generated Anki decks import successfully into Anki
- [ ] Cards display correctly with Finnish and English content
- [ ] All three granularity levels work as expected
- [ ] Content pairing is accurate (FI and EN segments match)
- [ ] Performance is acceptable (< 5 seconds for deck generation)
- [ ] Works on both desktop and mobile browsers
- [ ] Documentation is clear and complete

## Estimated Complexity

- **UI Changes**: Low (1-2 hours)
- **Client-side Implementation**: Medium (8-16 hours)
- **Server-side Implementation**: Medium-High (16-24 hours)
- **Testing & Refinement**: Medium (8-12 hours)
- **Documentation**: Low (2-4 hours)

**Total Estimate**: 19-58 hours depending on approach chosen

## Recommendation

**Recommended Path Forward**:
1. Start with client-side JavaScript implementation for MVP
2. Add UI links with basic styling
3. Implement sentence-level generation first
4. Test with representative articles
5. Iterate based on user feedback
6. Consider server-side migration if performance/features require it

This approach minimizes infrastructure requirements while providing immediate value, and allows for future enhancement without major refactoring.
