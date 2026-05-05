# Murder Board

Single-page Next.js scaffold for a static GitHub Pages site with markdown-driven story entries.

## Stack

- Next.js app router
- Static export via `next build`
- Markdown content in `content/entries`
- GitHub Pages workflow in `.github/workflows/deploy.yml`

## Local development

```bash
npm install
npm run dev
```

## Content editing

Each markdown file in `content/entries` contains frontmatter plus body copy.

```md
---
title: Example Case
slug: example-case
category: Mystery
status: Ongoing
episodes: 5
excerpt: Short summary for the card.
order: 10
accent: '#ed1c2e'
coverImage: /assets/example.png
---

## Body copy

Write markdown here.
```

Required fields are `title` and `slug`. The rest have defaults.

## GitHub Pages

The Next config exports a static site and automatically applies the repository name as `basePath` when built in GitHub Actions. Push to `main`, enable GitHub Pages with the source set to GitHub Actions, and the workflow will publish the contents of `out`.