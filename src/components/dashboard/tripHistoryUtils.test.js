import {
  getServiceDateKey,
  isAllowedHistoryDate,
} from "./tripHistoryUtils";

describe("trip history date helpers", () => {
  it("uses the South Africa service date", () => {
    expect(getServiceDateKey(new Date("2026-10-25T22:30:00.000Z"))).toBe(
      "2026-10-26",
    );
  });

  it("allows valid dates through today and rejects invalid or future dates", () => {
    expect(isAllowedHistoryDate("2026-10-26", "2026-10-26")).toBe(true);
    expect(isAllowedHistoryDate("2026-10-25", "2026-10-26")).toBe(true);
    expect(isAllowedHistoryDate("2026-10-27", "2026-10-26")).toBe(false);
    expect(isAllowedHistoryDate("2026-02-30", "2026-10-26")).toBe(false);
  });
});
