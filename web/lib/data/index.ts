import sessionTemplatesJson from "./sessionTemplates.json";
import paceTablesJson from "./paceTables.json";
import configJson from "./config.json";
import type {
  Config,
  PaceTables,
  SessionTemplates,
} from "@/lib/engine/types";

export const sessionTemplates: SessionTemplates =
  sessionTemplatesJson as unknown as SessionTemplates;
export const paceTables: PaceTables = paceTablesJson as unknown as PaceTables;
export const config: Config = configJson as unknown as Config;

export const dataStore = { sessionTemplates, paceTables, config };
