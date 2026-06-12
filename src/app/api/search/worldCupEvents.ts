/** 2026 FIFA World Cup tag on Gamma API */
export const WC_TAG_ID = 102232;

export const WC_EVENTS_PAGE_SIZE = 100;

/** 安全上限：避免异常分页死循环 */
export const WC_EVENTS_MAX_PAGES = 15;

export type GammaEvent = {
  id?: string | number;
  title?: string;
  description?: string;
  volume?: string | number;
  score?: string | null;
  live?: boolean | null;
  ended?: boolean | null;
  period?: string | null;
  elapsed?: string | null;
  startTime?: string | null;
  eventDate?: string | null;
  markets?: Array<{
    sportsMarketType?: string | null;
    groupItemTitle?: string | null;
    closed?: boolean | null;
    gameStartTime?: string | null;
  }>;
};

export function isVsEventTitle(title: string | undefined | null): boolean {
  const t = (title || "").toLowerCase();
  return t.includes(" vs ") || t.includes(" vs.");
}

export function countMoneylineMarkets(event: GammaEvent): number {
  return (event.markets || []).filter(
    (m) => (m.sportsMarketType || "").toLowerCase() === "moneyline"
  ).length;
}

/**
 * 方向 3：去掉纯衍生对阵盘（More Markets / Exact Score 等无 moneyline 的 vs event）。
 * 非 vs 的趣味/冠军盘全部保留；含 moneyline 的对阵 event 保留，便于将来在同 event 流扩展更多盘口类型。
 */
export function shouldIncludeWorldCupEvent(event: GammaEvent): boolean {
  if (!isVsEventTitle(event.title)) {
    return true;
  }
  return countMoneylineMarkets(event) > 0;
}

export function filterWorldCupEventsForClient(events: GammaEvent[]): GammaEvent[] {
  return events.filter(shouldIncludeWorldCupEvent);
}

export function sortEventsByVolumeDesc(events: GammaEvent[]): GammaEvent[] {
  return [...events].sort(
    (a, b) => parseFloat(String(b.volume ?? 0)) - parseFloat(String(a.volume ?? 0))
  );
}

export function buildWorldCupEventsPageUrl(offset: number, closed = false): string {
  const params = new URLSearchParams({
    tag_id: String(WC_TAG_ID),
    active: "true",
    closed: closed ? "true" : "false",
    limit: String(WC_EVENTS_PAGE_SIZE),
    offset: String(offset),
    order: "volume",
    ascending: "false",
  });
  return `https://gamma-api.polymarket.com/events?${params.toString()}`;
}

async function fetchAllWorldCupEventsByClosedState(
  fetchPage: (url: string) => Promise<GammaEvent[]>,
  closed: boolean
): Promise<GammaEvent[]> {
  const byId = new Map<string, GammaEvent>();

  for (let page = 0; page < WC_EVENTS_MAX_PAGES; page += 1) {
    const offset = page * WC_EVENTS_PAGE_SIZE;
    const batch = await fetchPage(buildWorldCupEventsPageUrl(offset, closed));
    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    for (const event of batch) {
      if (event?.id == null) continue;
      byId.set(String(event.id), event);
    }

    if (batch.length < WC_EVENTS_PAGE_SIZE) {
      break;
    }
  }

  return [...byId.values()];
}

/** 翻页拉全 tag 102232 events，按 id 去重 */
export async function fetchAllWorldCupEvents(
  fetchPage: (url: string) => Promise<GammaEvent[]>,
  options?: { includeClosed?: boolean }
): Promise<GammaEvent[]> {
  if (!options?.includeClosed) {
    return sortEventsByVolumeDesc(await fetchAllWorldCupEventsByClosedState(fetchPage, false));
  }

  const [open, closed] = await Promise.all([
    fetchAllWorldCupEventsByClosedState(fetchPage, false),
    fetchAllWorldCupEventsByClosedState(fetchPage, true),
  ]);
  const byId = new Map<string, GammaEvent>();
  for (const event of [...open, ...closed]) {
    if (event?.id == null) continue;
    byId.set(String(event.id), event);
  }
  return sortEventsByVolumeDesc([...byId.values()]);
}
