# YC Vibe Check 🦄

[**YC Vibe Check**](https://ycvibecheck.com/) uses _semantic similarity_ to search Y Combinator's entire portfolio of over 3,000 companies by descriptions of ideas or verticals rather than keywords or categories, which lets you search for something super broad like "climate change" as well as specific ideas like "high-resolution commercial satellite imagery" and see who's building in the space (at least, in the YC community).

![Screen recording of a search results page on YC Vibe Check](/static/img/screen-recording.gif)

Unlike the simple text search box in YC's [startup directory](https://www.ycombinator.com/companies), semantic search means this search bar doesn't need you to get the keywords exactly right, only close enough to what startups are building, to find them.

YC Vibe Check is built with my usual stack, [the Oak language](https://oaklang.org) and [Torus](https://github.com/thesephist/torus). It runs [sentence-transformers](https://www.sbert.net/) behind a [Flask](https://flask.palletsprojects.com/) server on the backend for semantic indexing and search. The dataset is based on [akshaybhalotia/yc_company_scraper](https://github.com/akshaybhalotia/yc_company_scraper).

## How it works

YCVC is not the first semantic search engine I've built — that honor goes to [Revery](https://github.com/thesephist/revery), which was a semantic search engine for my personal work and history, like contacts, bookmarks, notes, journals, and tweets. But YCVC performs semantic search quite differently, for a few important reasons we'll get to below.

Revery's semantic search was based on [word embedding vectors](https://en.wikipedia.org/wiki/Word2vec), which maps words or "tokens" in every piece of text to a point in a high-dimensional space such that similar words cluster together. For Revery's semantic index, I simply averaged the word vectors of every word in each document to compute the "embedding" of every document. This is a well-known established method, and I found it worked well enough for me and Revery. It's also relatively resource-efficient, which worked well for the tiny server I had to run that app. (You can read more about how Revery works [in its own README](https://github.com/thesephist/revery#how-it-works).)

But times have changed! Transformer-based language models have learned to speak now and they yearn for more memory and bigger cores and promise great things in return! So YCVC uses one such transformer-based deep learning model, `sentence-transformers/all-mpnet-base-v2`, to compute sentence/paragraph embeddings instead of word vectors.

There's another more practical reason a more sophisticated model is needed for YCVC, which is that unlike long blog posts and journals that are sort of explicit in what they talk about, and generally talk about well-known ideas, YC company pitches and descriptions tend to involve lots of neologisms (NFT, DevOps, "Scale" used ten thousand different ways) and often speak analogically rather than directly. Though I haven't done empirical comparisons of transformers against word vectors in this use cases, I suspect transformer-based models probably perform better at understanding YC company descriptions for these reasons.

Once sentence embeddings are used to compute semantic "neighbors" of an idea or company description, YCVC collects a bunch of metadata to show you about that company. That comes from a few different places:

- The Algolia search API that backs the [YC Startup Directory](https://www.ycombinator.com/companies), which returns basic company information like name, status, descriptions, batch, team size, and location
- Scraping the company's page on YC's directory manually, which returns some more valuable and detailed information like founding year, social media and Crunchbase URLs, and news articles about companies
- Searching the [Hacker News Algolia API](https://hn.algolia.com/) for the company's name, which often turns up relevant stories about companies that aren't necessarily fundraising announcements or other managed PR

The YCVC UI then collects all of that information together and compiles it in a (hopefully) neat little table to surface it to you, the curious searcher!

### Known faults and limitations

My focus on this project was more the interface and building a proof-of-concept for similarity search as a market research tool, and less building the _best possible model_ for this task. So in the process of playing with YCVC during development I've noticed a few mistakes that the current model is prone to making, which I thought I'd document here.

- The model gets easily sidetracked by company names. For example, a search containing the company name "Airbyte" will bring up companies with the subwords "Air" and "Byte" in the name, even though they aren't really in the same industries or markets.
- The model doesn't know about super, super new technical concepts. It knows about NFTs (which I was pleasantly surprised by) and understands that "DevOps" is related to cloud infrastructure. But if next year there are a bunch of YC companies built on some new cutting-edge NLP tech or a new carbon sequestration or space launch process, the model will be completely blind to those new concepts.

## Updating the dataset

**TL;DR** — Run `./refresh_yc_data.sh`, preferably with a GPU if you have one.

When new batches of YC are announced and the [YC Startup Directory](https://www.ycombinator.com/companies) is updated with new companies, we need to update the dataset that underlies the YC Vibe Check backend. Updating the dataset is a straightforward process, thanks to an upstream project called [yc_company_scraper](https://github.com/akshaybhalotia/yc_company_scraper). Here are the rough steps:

1. Ensure the `yc_company_scraper` project has an updated `data/yc_essential_data.json` in their repository. If this is updated, everything is pretty simple. If not, we need to figure out how to run the scraper and update the JSON first before moving forward.
2. Download the JSON from that repository to `data/yc.json` in the YC Vibe Check repository.
3. Run `server/generate.py`, which will generate semantic embeddings for every company from its `long_description`, or `one_liner` if the long description is blank.

These steps should produce two updated files, `data/yc.json` and `data/yc-embedded.json`. Only the latter is really needed for the app to run, but I like to keep both in case I want to re-generate the embeddings from scratch. The updated versions of these files should be checked into the repository and deployed.

## Development

Like many of my projects, YC Vibe Check is built and managed with [Oak](https://oaklang.org/). There's a short [Makefile](Makefile) that wraps common `oak` commands:

- `make` runs the Flask web server, and is equivalent to `flask run`
- `make fmt` or `make f` auto-formats any tracked changes in the repository
- `make build` or `make b` builds the client JavaScript bundle from `src/app.js.oak`
- `make watch` or `make w` watches for file changes and runs the `make build` on any change
