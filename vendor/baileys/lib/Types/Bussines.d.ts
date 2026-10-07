export type DayOfWeekBussines =
  | "sun"
  | "mon"
  | "tue"
  | "wed"
  | "thu"
  | "fri"
  | "sat";
export type HoursDay =
  | {
      day: DayOfWeekBussines;
      mode: "specific_hours";
      openTimeInMinutes: string;
      closeTimeInMinutes: string;
    }
  | {
      day: DayOfWeekBussines;
      mode: "open_24h" | "appointment_only";
    };
export type UpdateBussinesProfileProps = {
  address?: string;
  websites?: string[];
  email?: string;
  description?: string;
  hours?: {
    timezone: string;
    days: HoursDay[];
  };
};
export type UpdateBusinessProfileProps = UpdateBussinesProfileProps;
export type QuickReplyAction = {
  shortcut?: string;
  message?: string;
  deleted?: boolean;
  timestamp?: string;
};
//# sourceMappingURL=Bussines.d.ts.map
