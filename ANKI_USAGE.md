# Anki Card Generation Feature

## Overview

The Selkouutiset Archive now includes built-in Anki flashcard generation! Create bilingual flashcards directly from any article to enhance your Finnish language learning.

## What is Anki?

[Anki](https://apps.ankiweb.net/) is a powerful, free, open-source spaced repetition flashcard program that helps you memorize information efficiently. It's perfect for language learning.

## How to Use

### 1. Navigate to Any Article

Browse to any article page on the Selkouutiset Archive. You'll see language selectors and Anki generation links at the top:

```
Languages: [fi] [en]
Generate Anki Cards: [sentence] [paragraph] [section]
```

### 2. Choose Your Granularity Level

Click on one of the three options based on how you want to study:

- **[sentence]** - Creates one flashcard for each sentence
  - Best for: Beginners, detailed study, grammar practice
  - Card count: Highest (50-200+ cards per article)
  - Example: "Presidentti tapasi pääministerin." ↔ "The president met the prime minister."

- **[paragraph]** - Creates one flashcard for each paragraph
  - Best for: Intermediate learners, contextual understanding
  - Card count: Medium (10-30 cards per article)
  - Example: Full paragraph in Finnish ↔ Full paragraph in English

- **[section]** - Creates one flashcard for each section/heading
  - Best for: Advanced learners, topic comprehension
  - Card count: Lowest (3-10 cards per article)
  - Example: Entire section under a heading in Finnish ↔ Entire section in English

### 3. Download the File

After clicking a granularity level:
1. The system fetches both language versions of the article
2. Parses and pairs the content
3. Generates flashcards
4. Downloads a `.txt` file (e.g., `anki_article_title_sentence_2026-01-18.txt`)

### 4. Import into Anki

#### If You Don't Have Anki Yet:
1. Download Anki from [https://apps.ankiweb.net/](https://apps.ankiweb.net/)
2. Install it on your computer
3. Open Anki and create a new deck (e.g., "Selkouutiset - Finnish Learning")

#### Import the Generated File:
1. Open Anki
2. Click **File → Import**
3. Select the downloaded `.txt` file
4. In the import dialog:
   - **Type**: Basic
   - **Deck**: Choose or create a deck (e.g., "Selkouutiset")
   - **Fields separated by**: Tab
   - **Allow HTML in fields**: ✓ (checked)
   - **Field 1**: Front
   - **Field 2**: Back
   - **Field 3**: Tags
5. Click **Import**

### 5. Study!

Your cards are now in Anki. Click on your deck and start studying!

## Card Format

Each generated card includes:
- **Front**: Finnish text (from the original article)
- **Back**: English translation
- **Tags**: `selkouutiset`, language pair (e.g., `fi-en`), granularity level, and date

## Tips for Effective Learning

### For Sentence-Level Cards:
- Perfect for drilling specific vocabulary and grammar patterns
- Can be overwhelming for longer articles - consider generating cards for specific articles you want to study deeply
- Great for understanding Finnish sentence structure

### For Paragraph-Level Cards:
- Balances detail with manageability
- Helps you understand how sentences flow together
- Recommended for most learners

### For Section-Level Cards:
- Best for reviewing overall article comprehension
- Useful for advanced learners who want to ensure they understand main ideas
- Can be combined with sentence/paragraph cards for the same article

### General Tips:
1. **Don't generate too many cards at once** - Start with a few articles you find interesting
2. **Be consistent** - Study your cards daily for best results (Anki will remind you)
3. **Suspend difficult cards** - If a card is too hard, suspend it in Anki and come back later
4. **Add custom notes** - In Anki, you can edit cards to add pronunciation notes, mnemonics, etc.
5. **Mix granularity levels** - Try combining sentence and paragraph cards for the same article for different perspectives

## Technical Details

### What Languages Are Supported?
- Currently supports Finnish ↔ English pairs
- Cards always show Finnish on the front and English on the back (regardless of which language version of the article you're viewing)

### How Are Sentences/Paragraphs Paired?
The system:
1. Fetches both the Finnish and English versions of the article
2. Splits the content based on the selected granularity
3. Pairs matching segments by position (e.g., 1st Finnish paragraph with 1st English paragraph)
4. Creates flashcards from these pairs

**Note**: If the Finnish and English versions have different numbers of sentences/paragraphs, only matching pairs are included. The system uses the minimum count to avoid misalignment.

### What if There's No Translation?
If an article doesn't have a translation in the other language, you'll see an error message. Anki cards can only be generated for articles that exist in both Finnish and English.

### File Format
The generated `.txt` files use Tab-Separated Values (TSV) format with Anki-specific headers:
```
#separator:tab
#html:false
#tags column:3
# Source: Article Title
# URL: https://example.org/article

Finnish text<tab>English text<tab>tags
...
```

This format is specifically designed for easy import into Anki.

## Troubleshooting

### "No cards generated" Error
**Cause**: The article might not have a translation, or the content structure is incompatible.

**Solution**:
- Check if both [fi] and [en] language links are available
- Try a different article
- Report the issue if you believe it should work

### Cards Don't Align Properly
**Cause**: The Finnish and English versions might have different paragraph/sentence structures.

**Solution**:
- Try a different granularity level
- Manually review and edit cards in Anki after import
- Some articles translate more freely and won't align perfectly

### Import Fails in Anki
**Cause**: Incorrect import settings.

**Solution**:
- Ensure "Fields separated by: Tab" is selected
- Enable "Allow HTML in fields"
- Make sure you're importing as "Basic" type

### JavaScript Not Working
**Cause**: Browser blocking scripts, or JavaScript disabled.

**Solution**:
- Enable JavaScript in your browser
- Try a different browser
- Check browser console for errors (F12 → Console)

## Example Workflow

Here's a complete example of using the feature:

1. **Choose an article**: Browse to an interesting article, e.g., "Suomi voitti jääkiekkoa" (Finland won at hockey)

2. **Select granularity**: Click **[paragraph]** for a balanced approach

3. **Wait for download**: After a few seconds, `anki_Suomi_voitti_jääkiekkoa_paragraph_2026-01-18.txt` downloads

4. **Import to Anki**:
   - Open Anki
   - File → Import
   - Select the downloaded file
   - Set separator to Tab
   - Import into "Selkouutiset" deck

5. **Study**: Start reviewing! Anki will show you Finnish paragraphs, and you try to recall the English meaning before revealing the back of the card.

6. **Repeat**: Generate cards from other articles and build up your deck over time!

## Advanced: Reverse Cards (English → Finnish)

By default, cards show Finnish on the front. If you want to study the reverse direction (English → Finnish):

1. In Anki, go to **Tools → Manage Note Types**
2. Select your note type (e.g., "Basic")
3. Click **Options** → **Add Card Type**
4. Create a reversed card template

Or simply:
1. Import the cards as usual
2. When studying, mentally practice both directions

## Credits

This feature generates flashcards from the excellent [Selkouutiset](https://yle.fi/selkouutiset) news articles, which are published by YLE (Finnish Broadcasting Company) and provide simplified Finnish news with English translations.

## Feedback

If you encounter issues or have suggestions for improving the Anki generation feature, please report them at:
https://github.com/hiAndrewQuinn/selkouutiset-archive/issues

Happy learning! 🇫🇮📚
