import { NextResponse } from "next/server";
import {
  getSessionConfig,
  getAllParticipants,
  getGroupSummary,
  setGroupSummary,
  setSessionStatus,
} from "@/lib/redis";
import { generateGroupSummary } from "@/lib/ai";

export async function POST() {
  const existing = await getGroupSummary();
  if (existing) {
    return NextResponse.json({ summary: existing });
  }

  const [config, participants] = await Promise.all([
    getSessionConfig(),
    getAllParticipants(),
  ]);

  const participantsData: Record<string, { answers: string[]; status: string }> =
    {};
  for (const [nick, data] of Object.entries(participants)) {
    participantsData[nick] = {
      answers: data.answers,
      status: data.status,
    };
  }

  const summary = await generateGroupSummary(
    config.context,
    config.questions,
    participantsData
  );

  await setGroupSummary(summary);
  await setSessionStatus("finished");

  return NextResponse.json({ summary });
}

export async function GET() {
  const summary = await getGroupSummary();
  return NextResponse.json({ summary });
}
