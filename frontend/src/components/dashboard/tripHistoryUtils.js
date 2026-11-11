export const getServiceDateKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map(({ type, value }) => [type, value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
};

export const isAllowedHistoryDate = (date, latestDate = getServiceDateKey()) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return false;

  const [year, month, day] = date.split("-").map(Number);
  const latestParts = latestDate.split("-").map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return false;
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return false;
  }

  const [latestYear, latestMonth, latestDay] = latestParts;
  const latestCandidate = new Date(
    Date.UTC(latestYear, latestMonth - 1, latestDay),
  );
  return candidate.getTime() <= latestCandidate.getTime();
};
