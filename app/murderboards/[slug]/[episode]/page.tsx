import { notFound } from "next/navigation";

import MurderBoard from "@/components/MurderBoard";
import { getAllBoardParams, getBoard } from "@/lib/board";

export const dynamicParams = false;

export async function generateStaticParams() {
  const params = await getAllBoardParams();
  return params.map((p) => ({ slug: p.slug, episode: p.episode }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; episode: string }>;
}) {
  const { slug, episode } = await params;
  const board = await getBoard(slug, episode);
  if (!board) return {};
  return {
    title: `${board.title} — ${board.tagEp}`,
    description: board.subhead,
  };
}

export default async function BoardPage({
  params,
}: {
  params: Promise<{ slug: string; episode: string }>;
}) {
  const { slug, episode } = await params;
  const board = await getBoard(slug, episode);
  if (!board) notFound();
  return <MurderBoard board={board} />;
}
