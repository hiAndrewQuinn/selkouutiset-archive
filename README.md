# Andrew's Selkouutiset Archive

Now you, too, can have your own Selkouutiset Archive. 🌟

## Quickstart

You will need [Hugo](https://gohugo.io/) installed, at at least version...
```bash
$ hugo version

# hugo v0.123.3-a75a659f6fc0cb3a52b2b2ba666a81f79a459376+extended linux/amd64 BuildDate=2024-02-23T17:09:20Z VendorInfo=snap:0.123.3
```

... Yeah, that one. No other dependencies needed!

Get your website up to date and locally running:

```bash
rm -rf selkouutiset-archive/ && git clone https://github.com/hiAndrewQuinn/selkouutiset-archive.git
pushd selkouutiset-archive/

git submodule update --init --remote
hugo server
popd
```

That's all you need! Go to `http://localhost:1313` to see your website.

## Features

### 🗓️ One page per day, and repeat days

Every calendar day has a page. Each page holds the newest Selkouutiset edition Yle published **on or before** that day, so on days Yle published nothing new (Christmas, Easter, some weekends) the page repeats an earlier edition. Those days are marked:

- the day's page opens with a note: *"Yle published no new edition on this day. Below is the edition of 23.12.2025."* (in Finnish on the Finnish pages), linking to that edition's own day;
- on the home page they are dimmed, with a grey *repeat of …* / *toisto: …* note.

The edition date comes from `edition.json` beside each day's Markdown in [selkouutiset-scrape-cleaned](https://github.com/hiAndrewQuinn/selkouutiset-scrape-cleaned), which records Yle's own `datePublished` for the page. Content without an `edition.json` simply shows no note.

Days before 2023-10-26 (the historical backfill, back to September 2016) are recovered from yle.fi and kept **Finnish-only**, as are a few later days the scraper repaired after their translation was made. The English home page still lists them, linking the Finnish page with a grey *(no English translation)* note, and their pages offer only `[fi]`.

Some days are **lost media**: Yle published an edition, but no copy survives anywhere (not on yle.fi, the Wayback Machine, or this archive). Both home pages list them in grey, without a link, as *(lost media)*; their page (still reachable by URL) holds the previous edition under a note saying so. The list of lost days, with the reason for each, is `lost.txt` in [selkouutiset-scrape](https://github.com/hiAndrewQuinn/selkouutiset-scrape); `edition.json` carries it as `"lost": true`.

The `content` submodule carries the raw Yle HTML scrape as a nested submodule (`content/selkouutiset-scrape/`). `hugo.toml` excludes it with `ignoreFiles`, so only the cleaned pages are published.

### 🎴 Anki Flashcard Generation

The archive now includes built-in Anki flashcard generation! Create bilingual flashcards directly from any article to enhance your Finnish language learning.

**Three granularity levels:**
- **[sentence]** - One flashcard per sentence (best for beginners)
- **[paragraph]** - One flashcard per paragraph (best for intermediate learners)
- **[section]** - One flashcard per section (best for advanced learners)

Simply click on any of these links when viewing an article, and a downloadable text file will be generated that you can import into Anki.

📖 **[Read the complete Anki usage guide](ANKI_USAGE.md)** for detailed instructions on how to use this feature.
