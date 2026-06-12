import https from "https";

/** 2026 世界杯赛期（含决赛日） */
export const WC2026_START = new Date("2026-06-11T00:00:00.000Z");
export const WC2026_END = new Date("2026-07-19T23:59:59.999Z");

const ESPN_SCOREBOARD_BASE =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

export type EspnAthlete = {
  id?: string;
  displayName?: string;
  headshot?: string;
};

export type EspnMatchDetail = {
  type?: { text?: string };
  scoringPlay?: boolean;
  ownGoal?: boolean;
  team?: { id?: string };
  athletesInvolved?: EspnAthlete[];
};

export type EspnCompetitor = {
  team?: {
    id?: string;
    displayName?: string;
    name?: string;
  };
};

export type EspnScoreboardEvent = {
  id?: string;
  name?: string;
  status?: { type?: { completed?: boolean; description?: string } };
  competitions?: Array<{
    competitors?: EspnCompetitor[];
    details?: EspnMatchDetail[];
  }>;
};

export type EspnScoreboardResponse = {
  events?: EspnScoreboardEvent[];
};

function formatEspnDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/** 赛期内从开幕日到 `now`（或闭幕日）的 YYYYMMDD 日期列表 */
export function getWc2026ScoreboardDates(now = new Date()): string[] {
  const end = now > WC2026_END ? WC2026_END : now;
  if (end < WC2026_START) return [];

  const dates: string[] = [];
  const cursor = new Date(WC2026_START);
  while (cursor <= end) {
    dates.push(formatEspnDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function fetchJson(url: string, agent?: import("https").Agent): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const options = agent ? { agent } : {};
    https
      .get(url, options, (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Error(`Parse error: ${body.slice(0, 200)}`));
          }
        });
      })
      .on("error", reject);
  });
}

export async function fetchEspnScoreboardByDate(
  date: string,
  agent?: import("https").Agent
): Promise<EspnScoreboardEvent[]> {
  const url = `${ESPN_SCOREBOARD_BASE}?dates=${date}`;
  const data = (await fetchJson(url, agent)) as EspnScoreboardResponse;
  return data.events || [];
}

/** 拉取赛期内全部已赛日程的 ESPN scoreboard events */
export async function fetchAllWc2026EspnEvents(
  now = new Date(),
  agent?: import("https").Agent
): Promise<EspnScoreboardEvent[]> {
  const dates = getWc2026ScoreboardDates(now);
  if (dates.length === 0) return [];

  const batches = await Promise.all(dates.map((date) => fetchEspnScoreboardByDate(date, agent)));
  const byId = new Map<string, EspnScoreboardEvent>();
  for (const events of batches) {
    for (const event of events) {
      if (event?.id) byId.set(String(event.id), event);
    }
  }
  return [...byId.values()];
}
