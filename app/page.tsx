import Image from "next/image";

import { getAllEntries } from "@/lib/content";

const stats: string[] = [
  "1 active serial",
  "New episodes weekly",
];

export default async function HomePage() {
  const entries = await getAllEntries();

  return (
    <main>
      <nav className="site-nav">
        <a className="site-nav__brand" href="#hero" aria-label="Murder Board home">
          <Image
            src="/assets/brand/lockup-reversed.png"
            alt="Murder Board"
            width={240}
            height={44}
            priority
          />
          <span className="site-nav__brand-text">
            <span>Murder</span> Board
          </span>
        </a>
        <div className="site-nav__links">
          <a href="#about">About</a>
          <a href="#series">On the Board</a>
        </div>
      </nav>

      <section id="hero" className="hero">
        <div className="hero__vignette" />
        <div className="hero__blinds" />
        <div className="hero__spotlight" />
        <div className="hero__content shell">
          <p className="eyebrow">Serialized mystery &amp; thriller fiction</p>
          <h1>
            Murder
            <span>Board</span>
          </h1>
          <p className="hero__dek">
            Mysteries told one episode at a time. Every installment ends on the board &mdash; photographs, notes, red string &mdash; so you&apos;re not just following the case. You&apos;re working it.
          </p>
          <div className="hero__actions">
            <a className="button button--primary" href="#series">
              Browse the board
            </a>
            <a className="button button--ghost" href="#series">
              Start with Rittenhouse
            </a>
          </div>
          <ul className="hero__stats" aria-label="Project highlights">
            {stats.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section id="about" className="about shell">
        <div className="about__heading">
          <p className="eyebrow">About</p>
          <h2>Some stories you read. This one you work.</h2>
        </div>
        <div className="about__grid">
          <article className="dossier-card tape tape--right">
            <h3>Serialized, a clue at a time</h3>
            <p>
              New mysteries released episode by episode, the way a case actually unfolds &mdash; a clue, a complication, and a thread you can&apos;t let go of.
            </p>
          </article>
          <article className="dossier-card tape tape--left">
            <h3>The board is the method</h3>
            <p>
              Every episode ends on a murder board: the photos, index cards, and red string of an investigation laid bare. See the connections form, and start theorizing before the next thread drops.
            </p>
          </article>
          <article className="dossier-card tape tape--right">
            <h3>Atmosphere over hype</h3>
            <p>
              Wry, shadowed mysteries built on real places and small, telling details &mdash; where the doorman&apos;s silence matters as much as the body.
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
          <p className="section-heading__aside"></p>
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
                  <span>{entry.episodes.length} episodes</span>
                  <a href={`/series/${entry.slug}`}>Read case file</a>
                </div>
              </div>
              <div className="series-card__index">{String(index + 1).padStart(2, "0")}</div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}