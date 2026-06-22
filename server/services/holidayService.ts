export interface Holiday {
  id: string;
  date: string;
  localName: string;
  name: string;
  types: string[];
  source: "nager" | "mock";
}

export interface HolidayImpact {
  source: "nager" | "mock";
  holidayDelayMin: number;
  isHoliday: boolean;
  greeting?: string;
  description: string;
  holidays: Holiday[];
}

interface NagerHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  global: boolean;
  counties: string[] | null;
  types: string[];
}

const NAGER_API_BASE_URL = "https://date.nager.at/api/v3/PublicHolidays";
const TORONTO_TIME_ZONE = "America/Toronto";
const holidayCache = new Map<number, Holiday[]>();

const ONTARIO_FALLBACK_HOLIDAYS: Record<string, { name: string; localName?: string; greeting?: string }> = {
  "01-01": { name: "New Year's Day", greeting: "Happy New Year" },
  "07-01": { name: "Canada Day", greeting: "Happy Canada Day" },
  "12-25": { name: "Christmas Day", greeting: "Merry Christmas" },
  "12-26": { name: "Boxing Day", greeting: "Happy Boxing Day" },
};

const getTorontoDateParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TORONTO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  }).formatToParts(date);

  return {
    year: Number(parts.find(part => part.type === "year")?.value ?? date.getFullYear()),
    month: parts.find(part => part.type === "month")?.value ?? "01",
    day: parts.find(part => part.type === "day")?.value ?? "01",
    weekday: parts.find(part => part.type === "weekday")?.value ?? "",
  };
};

const getTorontoDateKey = (date: Date) => {
  const parts = getTorontoDateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const parseTargetDate = (at?: string) => {
  const parsed = at ? new Date(at) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const isOntarioHoliday = (holiday: NagerHoliday) =>
  holiday.global ||
  holiday.counties === null ||
  holiday.counties.includes("CA-ON");

const buildGreeting = (holidayName: string) => {
  if (/new year/i.test(holidayName)) return "Happy New Year";
  if (/christmas/i.test(holidayName)) return "Merry Christmas";
  if (/canada day/i.test(holidayName)) return "Happy Canada Day";
  if (/thanksgiving/i.test(holidayName)) return "Happy Thanksgiving";
  if (/victoria day/i.test(holidayName)) return "Happy Victoria Day";
  if (/family day/i.test(holidayName)) return "Happy Family Day";
  if (/labou?r day/i.test(holidayName)) return "Happy Labour Day";
  if (/boxing day/i.test(holidayName)) return "Happy Boxing Day";
  return `Happy ${holidayName}`;
};

const getHolidayDelay = (holidayName: string, targetTime: Date) => {
  const hour = Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TORONTO_TIME_ZONE,
      hour: "numeric",
      hour12: false,
    }).format(targetTime),
  );
  const major = /christmas|new year|canada day|boxing day/i.test(holidayName);
  const peakTravelWindow = hour >= 10 && hour <= 21;

  if (!peakTravelWindow) return major ? 1 : 0;
  return major ? 3 : 2;
};

const getMockHolidays = (targetTime: Date): Holiday[] => {
  const parts = getTorontoDateParts(targetTime);
  const fixed = ONTARIO_FALLBACK_HOLIDAYS[`${parts.month}-${parts.day}`];

  if (!fixed) return [];

  return [{
    id: `mock-holiday-${parts.month}-${parts.day}`,
    date: `${parts.year}-${parts.month}-${parts.day}`,
    localName: fixed.localName ?? fixed.name,
    name: fixed.name,
    types: ["Public"],
    source: "mock",
  }];
};

const requestNagerHolidays = async (year: number): Promise<Holiday[]> => {
  const cached = holidayCache.get(year);
  if (cached) return cached;

  const response = await fetch(`${NAGER_API_BASE_URL}/${year}/CA`);
  const data = await response.json() as NagerHoliday[];

  if (!response.ok) {
    throw new Error(`Holiday API request failed with status ${response.status}`);
  }

  const holidays = data
    .filter(isOntarioHoliday)
    .map((holiday) => ({
      id: `nager-${holiday.date}-${holiday.name}`,
      date: holiday.date,
      localName: holiday.localName,
      name: holiday.name,
      types: holiday.types,
      source: "nager" as const,
    }));

  holidayCache.set(year, holidays);
  return holidays;
};

export async function getHolidayImpact(at?: string): Promise<HolidayImpact> {
  const targetTime = parseTargetDate(at);
  const targetKey = getTorontoDateKey(targetTime);
  const year = getTorontoDateParts(targetTime).year;

  let source: HolidayImpact["source"] = "nager";
  let holidays: Holiday[];

  try {
    holidays = (await requestNagerHolidays(year)).filter(holiday => holiday.date === targetKey);
  } catch (error) {
    console.warn(
      "Nager holiday lookup failed; using local holiday fallback.",
      error instanceof Error ? error.message : error,
    );
    source = "mock";
    holidays = getMockHolidays(targetTime);
  }

  const primaryHoliday = holidays[0];
  const holidayDelayMin = primaryHoliday ? getHolidayDelay(primaryHoliday.name, targetTime) : 0;
  const description = primaryHoliday
    ? `${primaryHoliday.name} is observed in Ontario today. TTC and road patterns can differ from a regular weekday, especially around midday and evening trips.`
    : "No Ontario public holiday is detected for this trip date.";

  return {
    source,
    holidayDelayMin,
    isHoliday: holidays.length > 0,
    greeting: primaryHoliday ? buildGreeting(primaryHoliday.name) : undefined,
    description,
    holidays,
  };
}
