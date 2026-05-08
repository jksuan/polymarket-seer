import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/test/ping", () => HttpResponse.json({ ok: true })),
];
