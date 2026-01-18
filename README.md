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

### 🎴 Anki Flashcard Generation

The archive now includes built-in Anki flashcard generation! Create bilingual flashcards directly from any article to enhance your Finnish language learning.

**Three granularity levels:**
- **[sentence]** - One flashcard per sentence (best for beginners)
- **[paragraph]** - One flashcard per paragraph (best for intermediate learners)
- **[section]** - One flashcard per section (best for advanced learners)

Simply click on any of these links when viewing an article, and a downloadable text file will be generated that you can import into Anki.

📖 **[Read the complete Anki usage guide](ANKI_USAGE.md)** for detailed instructions on how to use this feature.
