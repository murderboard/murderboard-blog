"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import { themeToCssVars } from "@/lib/board/theme";
import type { Board, BandKey, Card } from "@/lib/board/types";

import styles from "./MurderBoard.module.css";

const STRING_STYLE: Record<string, { stroke: string; width: number; opacity: number; dash?: string }> = {
  confirmed: { stroke: "var(--mb-red)", width: 2, opacity: 0.75 },
  suspected: { stroke: "var(--mb-red)", width: 1.4, opacity: 0.4 },
  evidence: { stroke: "var(--mb-yellow)", width: 1.4, opacity: 0.55 },
  unverified: { stroke: "var(--mb-cream-dim)", width: 1.2, opacity: 0.35, dash: "5 4" },
};

const html = (s?: string) => ({ __html: s ?? "" });

// ---- the visual face of a card (shared by desktop + mobile + lightbox) ----
function CardFace({ card }: { card: Card }) {
  if (card.type === "polaroid") {
    return (
      <div className={styles.polaroid}>
        <div className={styles.polaroidImg}>
          {card.image ? <img src={card.image} alt={card.caption ?? ""} /> : "case photo"}
        </div>
        <div className={styles.cap}>{card.caption}</div>
      </div>
    );
  }
  if (card.type === "postit") {
    const color = styles[`postit_${card.color ?? "y"}` as keyof typeof styles] as string;
    return (
      <div className={`${styles.postit} ${color}`}>
        {card.image ? <img className={styles.evidencePhoto} src={card.image} alt="" /> : null}
        <span dangerouslySetInnerHTML={html(card.text)} />
      </div>
    );
  }
  if (card.type === "typed") {
    return (
      <div className={styles.typed}>
        <div className={styles.hdr}>{card.header}</div>
        {card.image ? <img className={styles.typedPhoto} src={card.image} alt="" /> : null}
        <span dangerouslySetInnerHTML={html(card.text)} />
      </div>
    );
  }
  if (card.type === "id") {
    return (
      <div className={`${styles.idCard} ${card.image ? styles.hasPhoto : ""}`}>
        {card.image ? <img className={styles.mug} src={card.image} alt={card.name ?? ""} /> : null}
        <div>
          <div className={styles.role}>{card.role}</div>
          <div className={styles.name}>{card.name}</div>
          <div className={styles.idDetail}>
            <span dangerouslySetInnerHTML={html(card.detailLine)} />
            {card.flag ? (
              <>
                <br />
                <span className={styles.flag}>{card.flag}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>
    );
  }
  // clipping
  return (
    <div className={styles.clipping}>
      <div className={styles.headline}>{card.headline}</div>
      {card.image ? <img className={styles.clipPhoto} src={card.image} alt="" /> : null}
      <div className={styles.clipBody} dangerouslySetInnerHTML={html(card.body)} />
    </div>
  );
}

function Fastener({ card, i, attach }: { card: Card; i: number; attach: "pin" | "tape" }) {
  if (attach === "tape") return <div className={styles.tape} />;
  let variant = "";
  if (card.type === "id") variant = i % 2 === 0 ? styles.pinGold : styles.pinWhite;
  else if (!(card.type === "postit" && card.color === "r") && i % 4 === 0) variant = styles.pinWhite;
  return <div className={`${styles.pin} ${variant}`} />;
}

const MOBILE_SECTIONS: Array<[BandKey, string]> = [
  ["victim", "The victim"],
  ["timeline", "Timeline"],
  ["suspects", "Persons of interest"],
  ["documents", "Documents"],
  ["building", "Building & location"],
  ["cornerstone", "Physical evidence"],
  ["urgent", "Urgent"],
];

export default function MurderBoard({ board }: { board: Board }) {
  const [mobile, setMobile] = useState(false);
  const [selected, setSelected] = useState<Card | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    const update = () => setMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  // Desktop pan/zoom (ported from the standalone template).
  useEffect(() => {
    if (mobile) return;
    const viewport = viewportRef.current;
    const world = worldRef.current;
    if (!viewport || !world) return;

    const W = board.worldW;
    const H = board.worldH;
    const st = { scale: 0.55, tx: 0, ty: 0 };
    let dragging = false,
      lastX = 0,
      lastY = 0,
      moved = 0;

    const apply = () => {
      world.style.transform = `translate(${st.tx}px, ${st.ty}px) scale(${st.scale})`;
    };
    const center = () => {
      const vw = viewport.clientWidth,
        vh = viewport.clientHeight;
      st.scale = Math.max(0.35, Math.min(Math.min(vw / W, vh / H) * 1.6, 1));
      st.tx = (vw - W * st.scale) / 2;
      st.ty = (vh - H * st.scale) / 2;
      apply();
    };
    const zoomAt = (cx: number, cy: number, f: number) => {
      const ns = Math.max(0.25, Math.min(2.5, st.scale * f));
      const wx = (cx - st.tx) / st.scale,
        wy = (cy - st.ty) / st.scale;
      st.scale = ns;
      st.tx = cx - wx * ns;
      st.ty = cy - wy * ns;
      apply();
    };

    const onDown = (e: MouseEvent) => {
      dragging = true;
      moved = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      viewport.classList.add(styles.dragging);
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX,
        dy = e.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      st.tx += dx;
      st.ty += dy;
      lastX = e.clientX;
      lastY = e.clientY;
      apply();
    };
    const onUp = () => {
      dragging = false;
      viewport.classList.remove(styles.dragging);
      viewport.dataset.moved = moved > 6 ? "1" : "0";
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.12 : 0.89);
    };
    let tLastX = 0,
      tLastY = 0;
    const onTStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      dragging = true;
      moved = 0;
      tLastX = e.touches[0].clientX;
      tLastY = e.touches[0].clientY;
    };
    const onTMove = (e: TouchEvent) => {
      if (!dragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - tLastX,
        dy = e.touches[0].clientY - tLastY;
      moved += Math.abs(dx) + Math.abs(dy);
      st.tx += dx;
      st.ty += dy;
      tLastX = e.touches[0].clientX;
      tLastY = e.touches[0].clientY;
      apply();
    };

    viewport.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    viewport.addEventListener("wheel", onWheel, { passive: false });
    viewport.addEventListener("touchstart", onTStart, { passive: true });
    viewport.addEventListener("touchmove", onTMove, { passive: true });
    viewport.addEventListener("touchend", onUp);
    window.addEventListener("resize", center);
    center();
    (viewport as HTMLDivElement & { _zoom?: (f: number) => void })._zoom = (f: number) =>
      zoomAt(viewport.clientWidth / 2, viewport.clientHeight / 2, f);
    (viewport as HTMLDivElement & { _center?: () => void })._center = center;

    return () => {
      viewport.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("touchstart", onTStart);
      viewport.removeEventListener("touchmove", onTMove);
      viewport.removeEventListener("touchend", onUp);
      window.removeEventListener("resize", center);
    };
  }, [mobile, board.worldW, board.worldH]);

  const attach = board.theme.card.attach;
  const rootStyle = themeToCssVars(board.theme);

  const openCard = (card: Card) => {
    if (viewportRef.current?.dataset.moved === "1") return;
    setSelected(card);
  };

  const Title = (
    <div className={styles.hud} data-mb="hud">
      <div className={styles.titleBlock}>
        <div className={styles.epTag}>
          <span className={styles.tagLabel}>{board.tagLabel}</span>
          <span className={styles.tagEp}>{board.tagEp}</span>
        </div>
        <h1 className={styles.titleText}>{board.title}</h1>
        <p className={styles.subhead} dangerouslySetInnerHTML={html(board.subhead)} />
        {!mobile ? (
          <div className={styles.hint}>Drag to pan · scroll or pinch to zoom · click a card to examine it</div>
        ) : null}
      </div>
    </div>
  );

  // ---- mobile: sectioned vertical reflow ----------------------------------
  if (mobile) {
    return (
      <div className={styles.root} style={rootStyle}>
        {Title}
        <div className={styles.mobile}>
          {MOBILE_SECTIONS.map(([cat, label]) => {
            const cards = board.cards.filter((c) => c.cat === cat);
            if (!cards.length) return null;
            return (
              <section key={cat} className={styles.mobileSection}>
                <div className={styles.mobileSectionLabel}>{label}</div>
                {cards.map((card, i) => (
                  <div
                    key={card.id}
                    className={styles.mobileCard}
                    onClick={() => setSelected(card)}
                    role="button"
                    tabIndex={0}
                  >
                    <Fastener card={card} i={i} attach={attach} />
                    <CardFace card={card} />
                    {card.isNew ? <div className={styles.newTab}>NEW</div> : null}
                  </div>
                ))}
              </section>
            );
          })}
        </div>
        {selected ? <Lightbox card={selected} onClose={() => setSelected(null)} /> : null}
      </div>
    );
  }

  // ---- desktop: corkboard --------------------------------------------------
  return (
    <div className={styles.root} style={rootStyle}>
      <div className={styles.viewport} ref={viewportRef}>
        <div
          className={styles.world}
          data-mb="world"
          ref={worldRef}
          style={{ width: board.worldW, height: board.worldH }}
        >
          <div className={styles.surface} style={{ width: board.worldW, height: board.worldH }} />
          <svg
            className={styles.stringLayer}
            width={board.worldW}
            height={board.worldH}
            viewBox={`0 0 ${board.worldW} ${board.worldH}`}
          >
            {board.strings.map((s, i) => {
              const st = STRING_STYLE[s.kind] ?? STRING_STYLE.suspected;
              const mx = (s.from[0] + s.to[0]) / 2;
              const my = (s.from[1] + s.to[1]) / 2 + s.sag;
              return (
                <g key={i}>
                  <path
                    d={`M ${s.from[0]} ${s.from[1]} Q ${mx} ${my} ${s.to[0]} ${s.to[1]}`}
                    stroke={st.stroke}
                    strokeWidth={st.width}
                    fill="none"
                    opacity={st.opacity}
                    strokeLinecap="round"
                    strokeDasharray={st.dash}
                  />
                  <circle cx={s.from[0]} cy={s.from[1]} r={3} fill={st.stroke} opacity={st.opacity + 0.15} />
                  <circle cx={s.to[0]} cy={s.to[1]} r={3} fill={st.stroke} opacity={st.opacity + 0.15} />
                </g>
              );
            })}
          </svg>
          {board.annotations.map((a, i) => (
            <div key={i} className={styles.annotation} style={{ left: a.x, top: a.y }}>
              {a.text}
            </div>
          ))}
          {board.cards.map((card, i) => (
            <div
              key={card.id}
              data-mb="card"
              className={styles.card}
              style={{ left: card.x, top: card.y, width: card.w, transform: `rotate(${card.rotate}deg)` }}
              onClick={() => openCard(card)}
            >
              <Fastener card={card} i={i} attach={attach} />
              <CardFace card={card} />
              {card.isNew ? <div className={styles.newTab}>NEW</div> : null}
            </div>
          ))}
        </div>
      </div>

      {Title}

      <div className={styles.legend} data-mb="legend">
        <div className={styles.legendItem}><span className={styles.legendDot} style={{ background: "var(--mb-red)" }} />Confirmed</div>
        <div className={styles.legendItem}><span className={styles.legendDot} style={{ background: "rgba(192,0,26,0.35)" }} />Suspected</div>
        <div className={styles.legendItem}><span className={styles.legendDot} style={{ background: "var(--mb-yellow)" }} />Evidence</div>
        <div className={styles.legendItem}><span className={styles.legendDot} style={{ background: "rgba(200,195,178,0.35)" }} />Unverified</div>
      </div>

      <div className={styles.controls} data-mb="controls">
        <button aria-label="Zoom in" onClick={() => (viewportRef.current as (HTMLDivElement & { _zoom?: (f: number) => void }) | null)?._zoom?.(1.25)}>+</button>
        <button aria-label="Zoom out" onClick={() => (viewportRef.current as (HTMLDivElement & { _zoom?: (f: number) => void }) | null)?._zoom?.(0.8)}>−</button>
        <button aria-label="Reset view" style={{ fontSize: 13 }} onClick={() => (viewportRef.current as (HTMLDivElement & { _center?: () => void }) | null)?._center?.()}>↺</button>
      </div>

      {selected ? <Lightbox card={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

function Lightbox({ card, onClose }: { card: Card; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={styles.lightbox} onClick={onClose}>
      <button className={styles.lightboxClose} onClick={onClose} aria-label="Close">
        ✕
      </button>
      <div onClick={(e) => e.stopPropagation()}>
        <div style={{ width: card.w * 1.6 }}>
          <CardFace card={card} />
        </div>
        {card.detail ? (
          <div className={styles.lightboxDetail}>
            <span className={styles.hdrNote}>Detective&apos;s note</span>
            <span dangerouslySetInnerHTML={html(card.detail)} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
