import { NextResponse } from "next/server";
import { getParticipant, getSessionStatus, getSessionConfig, getGroupSummary } from "@/lib/redis";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nick = searchParams.get("nick");

  if (!nick) {
    return NextResponse.json({ error: "Nick required" }, { status: 400 });
  }

  const [status, config, participant, summary] = await Promise.all([
    getSessionStatus(),
    getSessionConfig(),
    getParticipant(nick),
    getGroupSummary(),
  ]);

  return NextResponse.json({
    sessionStatus: status,
    config: {
      duration: config.duration,
      startedAt: config.startedAt,
      questions: config.questions,
    },
    participant,
    summary,
  });
}
