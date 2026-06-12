import { describe, expect, it } from "vitest";
import { aggregateWc2026Scorers } from "./aggregateScorers";

describe("aggregateWc2026Scorers", () => {
  it("returns empty list when no goals", () => {
    expect(aggregateWc2026Scorers([])).toEqual([]);
  });

  it("aggregates goals from ESPN match details", () => {
    const scorers = aggregateWc2026Scorers([
      {
        id: "1",
        competitions: [
          {
            competitors: [
              { team: { id: "203", displayName: "Mexico" } },
              { team: { id: "467", displayName: "South Africa" } },
            ],
            details: [
              {
                scoringPlay: true,
                ownGoal: false,
                type: { text: "Goal" },
                team: { id: "203" },
                athletesInvolved: [{ id: "233075", displayName: "Julián Quiñones" }],
              },
              {
                scoringPlay: true,
                ownGoal: false,
                type: { text: "Goal - Header" },
                team: { id: "203" },
                athletesInvolved: [{ id: "167060", displayName: "Raúl Jiménez" }],
              },
            ],
          },
        ],
      },
      {
        id: "2",
        competitions: [
          {
            competitors: [
              { team: { id: "451", displayName: "South Korea" } },
              { team: { id: "450", displayName: "Czechia" } },
            ],
            details: [
              {
                scoringPlay: true,
                ownGoal: false,
                type: { text: "Goal" },
                team: { id: "451" },
                athletesInvolved: [{ id: "280061", displayName: "Hwang In-Beom" }],
              },
              {
                scoringPlay: true,
                ownGoal: false,
                type: { text: "Goal" },
                team: { id: "451" },
                athletesInvolved: [{ id: "280061", displayName: "Hwang In-Beom" }],
              },
            ],
          },
        ],
      },
    ]);

    expect(scorers).toHaveLength(3);
    expect(scorers[0]).toMatchObject({ name: "Hwang In-Beom", goals: 2, rank: 1, countryCode: "Korea Republic" });
    expect(scorers.filter((s) => s.goals === 1)).toHaveLength(2);
    expect(scorers.filter((s) => s.rank === 2)).toHaveLength(2);
  });

  it("skips own goals", () => {
    const scorers = aggregateWc2026Scorers([
      {
        competitions: [
          {
            competitors: [{ team: { id: "1", displayName: "Mexico" } }],
            details: [
              {
                scoringPlay: true,
                ownGoal: true,
                type: { text: "Goal" },
                team: { id: "1" },
                athletesInvolved: [{ id: "9", displayName: "Own Goal Player" }],
              },
            ],
          },
        ],
      },
    ]);
    expect(scorers).toEqual([]);
  });
});
