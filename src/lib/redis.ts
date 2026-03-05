import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: (process.env.UPSTASH_REDIS_REST_URL || "").trim(),
      token: (process.env.UPSTASH_REDIS_REST_TOKEN || "").trim(),
    });
  }
  return _redis;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const redis = new Proxy({} as Redis, {
  get(_, prop) {
    const r = getRedis();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const val = (r as any)[prop];
    if (typeof val === "function") return val.bind(r);
    return val;
  },
});

const TTL = 60 * 60 * 24; // 24 hours

export interface SessionConfig {
  context: string;
  questions: string[];
  duration: number; // minutes
  startedAt: number | null; // unix ms
}

export interface ParticipantData {
  status: "waiting" | "in_progress" | "finished";
  answers: string[];
  currentQuestion: number;
  finishedAt: number | null;
  chatHistory: { role: "assistant" | "user"; content: string }[];
}

const DEFAULTS = {
  context:
    'Uczestnicy studiow podyplomowych "AI w finansach i controllingu" -- menedzerowie i specjalisci z dzialow finansowych, controllingu i audytu.',
  questions: [
    "Jak czesto uzywasz narzedzi AI w swojej codziennej pracy? (nigdy / sporadycznie / regularnie / codziennie)",
    "Co najbardziej niepokoi Cie w zwiazku z AI w Twojej pracy zawodowej?",
    "Jakie narzedzie AI znasz z nazwy -- chocby jedno?",
  ],
  duration: 5,
};

export async function getSessionConfig(): Promise<SessionConfig> {
  const config = await redis.get<SessionConfig>("session:config");
  if (!config) {
    return { ...DEFAULTS, startedAt: null };
  }
  return config;
}

export async function saveSessionConfig(config: SessionConfig) {
  await redis.set("session:config", config, { ex: TTL });
}

export async function getSessionStatus(): Promise<string> {
  const status = await redis.get<string>("session:status");
  return status || "waiting";
}

export async function setSessionStatus(status: string) {
  await redis.set("session:status", status, { ex: TTL });
}

export async function getParticipant(
  nick: string
): Promise<ParticipantData | null> {
  const data = await redis.hget<ParticipantData>("session:participants", nick);
  return data || null;
}

export async function setParticipant(nick: string, data: ParticipantData) {
  await redis.hset("session:participants", { [nick]: data });
  await redis.expire("session:participants", TTL);
}

export async function getAllParticipants(): Promise<
  Record<string, ParticipantData>
> {
  const data = await redis.hgetall<Record<string, ParticipantData>>(
    "session:participants"
  );
  return data || {};
}

export async function getGroupSummary(): Promise<string | null> {
  return redis.get<string>("session:summary");
}

export async function setGroupSummary(summary: string) {
  await redis.set("session:summary", summary, { ex: TTL });
}

export async function clearSession() {
  await redis.del(
    "session:config",
    "session:status",
    "session:participants",
    "session:summary"
  );
}
