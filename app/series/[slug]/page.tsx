import type { CSSProperties } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";

import { getAllEntries, getEntry } from "@/lib/content";

export async function generateStaticParams() {
  const entries = await getAllEntries();
  return entries.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = await getEntry(slug);
  if (!entry) return {};
  return { title: `${entry.title} — Murder Board`, description: entry.excerpt };
}

export default async function SeriesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = await getEntry(slug);
  if (!entry) notFound();

  return (
    <main>
      <nav className="site-nav">
        <a className="site-nav__brand" href="/" aria-label="Murder Board home">
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
          <a href="/#about">About</a>
          <a href="/#series">On the Board</a>
        </div>
      </nav>

      <section className="series-hero shell">
        <a href="/" className="back-link">← All cases</a>
        <p className="eyebrow">{entry.category}</p>
        <h1>{entry.title}</h1>
        <dl className="series-hero__meta">
          <div>
            <dt>Status</dt>
            <dd>{entry.status}</dd>
          </div>
          <div>
            <dt>Episodes</dt>
            <dd>{entry.episodes.length}</dd>
          </div>
        </dl>
        <div className="series-hero__actions">
          {entry.substackUrl ? (
            <a className="button button--primary" href={entry.substackUrl} target="_blank" rel="noreferrer">
              Follow on Substack
            </a>
          ) : null}
          {entry.murderboardUrl ? (
            <a className="button button--ghost" href={entry.murderboardUrl} target="_blank" rel="noreferrer">
              Open interactive murder board
            </a>
          ) : null}
        </div>
        {entry.coverImage ? (
          <div className="series-hero__image">
            <Image
              src={entry.coverImage}
              alt={entry.title}
              fill
              sizes="(min-width: 1024px) 60rem, 100vw"
              priority
            />
          </div>
        ) : null}
      </section>

      <article
        className="case-file shell tape tape--right"
        style={{ "--entry-accent": entry.accent } as CSSProperties}
      >
        <div
          className="case-file__body"
          dangerouslySetInnerHTML={{ __html: entry.html }}
        />
      </article>

      {entry.episodes.length > 0 ? (
        <section className="episode-list shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Published on Substack</p>
              <h2>Episodes</h2>
            </div>
          </div>
          <ol>
            {entry.episodes.map((episode) => (
              <li key={episode.url} className="episode-list__item">
                <a href={episode.url} target="_blank" rel="noreferrer">
                  {episode.title}
                </a>
                {episode.date ? <span className="episode-list__date">{episode.date}</span> : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </main>
  );
}
