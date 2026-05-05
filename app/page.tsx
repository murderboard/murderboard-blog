import type { CSSProperties } from "react";
import Image from "next/image";

import { getAllEntries } from "@/lib/content";

const stats = [
  "3 active investigations",
  "Markdown-controlled case files",
  "Static export ready for GitHub Pages",
];

export default async function HomePage() {
  const entries = await getAllEntries();
  const featured = entries[0];

  return (
    <main>
      <nav className="site-nav">
        <a className="site-nav__brand" href="#hero" aria-label="Murder Board home">
          <Image
            src="/assets/murder-board-logo.png"
            alt="Murder Board"
            width={240}
            height={38}
            priority
          />
          <span className="site-nav__brand-text">
            <span>Murder</span> Board
          </span>
        </a>
        <div className="site-nav__links">
          <a href="#about">About</a>
          <a href="#series">On the Board</a>
          <a href="#case-files">Case Files</a>
        </div>
      </nav>

      <section id="hero" className="hero">
        <div className="hero__vignette" />
        <div className="hero__blinds" />
        <div className="hero__spotlight" />
        <div className="hero__content shell">
          <p className="eyebrow">Serialized crime fiction and obsessive investigation</p>
          <h1>
            Murder
            <span>Board</span>
          </h1>
          <p className="hero__dek">
            Build your landing page from markdown files while keeping the atmosphere of a corkboard, a case file, and a late-night newsroom.
          </p>
          <div className="hero__actions">
            <a className="button button--primary" href="#series">
              Browse active cases
            </a>
            <a className="button button--ghost" href="#case-files">
              Read the files
            </a>
          </div>
          <ul className="hero__stats" aria-label="Project highlights">
            {stats.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        {featured ? (
          <aside className="hero__feature shell" aria-label="Featured investigation">
            <div className="feature-card tape tape--left">
              {featured.coverImage ? (
                <div className="feature-card__image">
                  <Image
                    src={featured.coverImage}
                    alt={featured.title}
                    fill
                    sizes="(min-width: 1024px) 26rem, 80vw"
                    priority
                  />
                </div>
              ) : null}
              <div className="feature-card__body">
                <p className="feature-card__meta">Featured file</p>
                <h2>{featured.title}</h2>
                <p>{featured.excerpt}</p>
                <a href={`#${featured.slug}`}>Open file</a>
              </div>
            </div>
          </aside>
        ) : null}
      </section>

      <section id="about" className="about shell">
        <div className="about__heading">
          <p className="eyebrow">About the scaffold</p>
          <h2>One page, many case files.</h2>
        </div>
        <div className="about__grid">
          <article className="dossier-card tape tape--right">
            <h3>Markdown controls the entries</h3>
            <p>
              Each file in <code>content/entries</code> defines the card metadata and the long-form body that gets converted to HTML at build time.
            </p>
          </article>
          <article className="dossier-card tape tape--left">
            <h3>Static export for Pages</h3>
            <p>
              The project uses the Next.js app router with <code>output: "export"</code>, a GitHub Pages workflow, and repo-aware base path handling.
            </p>
          </article>
          <article className="dossier-card tape tape--right">
            <h3>Design-driven structure</h3>
            <p>
              The layout borrows the archive&apos;s noir palette, type pairing, and evidence-board visual language while staying intentionally single-page.
            </p>
          </article>
        </div>
      </section>

      <section id="series" className="series shell">
        <div className="section-heading">
          <div>
            <p className="eyebrow">On the board</p>
            <h2>Active investigations</h2>
          </div>
          <p className="section-heading__aside">Edit the markdown files to change titles, covers, summaries, and full article bodies.</p>
        </div>

        <div className="series-grid">
          {entries.map((entry, index) => (
            <article key={entry.slug} className="series-card tape tape--left">
              <div className="series-card__pin" />
              {entry.coverImage ? (
                <div className="series-card__image">
                  <Image
                    src={entry.coverImage}
                    alt={entry.title}
                    fill
                    sizes="(min-width: 1024px) 24rem, 100vw"
                  />
                </div>
              ) : (
                <div className="series-card__placeholder">Case art pending</div>
              )}
              <div className="series-card__body">
                <div className="series-card__meta">
                  <span>{entry.category}</span>
                  <span>{entry.status}</span>
                </div>
                <h3>{entry.title}</h3>
                <p>{entry.excerpt}</p>
                <div className="series-card__footer">
                  <span>{entry.episodes} episodes</span>
                  <a href={`#${entry.slug}`}>Read case file</a>
                </div>
              </div>
              <div className="series-card__index">{String(index + 1).padStart(2, "0")}</div>
            </article>
          ))}
        </div>
      </section>

      <section id="case-files" className="case-files shell">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Case files</p>
            <h2>Rendered from markdown</h2>
          </div>
          <p className="section-heading__aside">Long-form copy lives in markdown; the page layout stays in React and CSS.</p>
        </div>

        <div className="case-files__list">
          {entries.map((entry) => (
            <article
              key={entry.slug}
              id={entry.slug}
              className="case-file tape tape--right"
              style={{ "--entry-accent": entry.accent } as CSSProperties}
            >
              <div className="case-file__header">
                <div>
                  <p className="eyebrow">{entry.category}</p>
                  <h3>{entry.title}</h3>
                </div>
                <dl>
                  <div>
                    <dt>Status</dt>
                    <dd>{entry.status}</dd>
                  </div>
                  <div>
                    <dt>Episodes</dt>
                    <dd>{entry.episodes}</dd>
                  </div>
                </dl>
              </div>
              <div
                className="case-file__body"
                dangerouslySetInnerHTML={{ __html: entry.html }}
              />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}