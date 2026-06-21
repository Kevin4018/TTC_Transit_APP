import { apiRequest } from "./request";

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

export function getHolidayImpact(at?: string): Promise<HolidayImpact> {
  return apiRequest<HolidayImpact>("/api/holidays/impact", {
    params: { at },
  });
}
