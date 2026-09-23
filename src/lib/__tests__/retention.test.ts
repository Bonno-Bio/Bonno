import { describe, expect, it } from "vitest";
import { RECORD_RETENTION_YEARS } from "@/lib/types";
describe("record retention", () => { it("retains records for seven years by design", () => { expect(RECORD_RETENTION_YEARS).toBe(7); const d = new Date("2026-01-01"); d.setFullYear(d.getFullYear() + RECORD_RETENTION_YEARS); expect(d.getFullYear()).toBe(2033); }); });
