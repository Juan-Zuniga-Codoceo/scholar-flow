// ─────────────────────────────────────────────
//  Scholar-Flow: Schedule Configuration Utility
// ─────────────────────────────────────────────

export interface DayConfig {
    id: number;       // 1=Mon … 5=Fri
    name: string;
    active: boolean;
    start: string;    // "08:00"
    end: string;      // "16:00"
}

export interface BreakConfig {
    id: string;
    name: string;
    startTime: string; // "09:30"
    duration: number;  // minutes
    type: "recreo" | "almuerzo";
}

export interface ScheduleConfig {
    blockDuration: number; // minutes, default 45
    days: DayConfig[];
    breaks: BreakConfig[];
}

export type TimeSlotClass = {
    type: "period";
    num: number;
    start: string;
    end: string;
};

export type TimeSlotBreak = {
    type: "break";
    id: string;
    name: string;
    start: string;
    end: string;
    breakType: "recreo" | "almuerzo";
};

export type TimeSlot = TimeSlotClass | TimeSlotBreak;

// ─── Helpers ───────────────────────────────────
export function timeToMinutes(t: string): number {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
}

export function minutesToTime(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ─── Default Config (user's example) ──────────
export const DEFAULT_SCHEDULE_CONFIG: ScheduleConfig = {
    blockDuration: 45,
    days: [
        { id: 1, name: "Lunes",      active: true, start: "08:00", end: "16:00" },
        { id: 2, name: "Martes",     active: true, start: "08:00", end: "16:00" },
        { id: 3, name: "Miércoles",  active: true, start: "08:00", end: "16:00" },
        { id: 4, name: "Jueves",     active: true, start: "08:00", end: "14:00" },
        { id: 5, name: "Viernes",    active: true, start: "08:00", end: "15:30" },
    ],
    breaks: [
        { id: "r1", name: "Recreo 1",  startTime: "09:30", duration: 15, type: "recreo"   },
        { id: "r2", name: "Recreo 2",  startTime: "11:15", duration: 15, type: "recreo"   },
        { id: "al", name: "Almuerzo",  startTime: "13:00", duration: 60, type: "almuerzo" },
    ],
};

// ─── Load / Save from localStorage ─────────────
const LS_KEY = "school_schedule_config";

export function loadScheduleConfig(): ScheduleConfig {
    if (typeof window === "undefined") return DEFAULT_SCHEDULE_CONFIG;
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) return JSON.parse(raw) as ScheduleConfig;
    } catch (_) {}
    return DEFAULT_SCHEDULE_CONFIG;
}

export function saveScheduleConfig(cfg: ScheduleConfig): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(LS_KEY, JSON.stringify(cfg));
    window.dispatchEvent(new Event("scheduleConfigChanged"));
}

// ─── Core Generator ────────────────────────────
/**
 * Generates the unified timeline of time-slots (periods + breaks) for the
 * given config.  The timeline is built from the earliest start to the latest
 * end across all active days.
 */
export function generateTimeline(cfg: ScheduleConfig): TimeSlot[] {
    const activeDays = cfg.days.filter(d => d.active);
    if (activeDays.length === 0) return [];

    const globalStart = Math.min(...activeDays.map(d => timeToMinutes(d.start)));
    const globalEnd   = Math.max(...activeDays.map(d => timeToMinutes(d.end)));

    const sortedBreaks = [...cfg.breaks].sort(
        (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );

    const slots: TimeSlot[] = [];
    let cur = globalStart;
    let periodNum = 1;

    while (cur < globalEnd) {
        // Check if a break starts exactly now
        const brk = sortedBreaks.find(b => timeToMinutes(b.startTime) === cur);
        if (brk) {
            slots.push({
                type: "break",
                id: brk.id,
                name: brk.name,
                start: minutesToTime(cur),
                end: minutesToTime(cur + brk.duration),
                breakType: brk.type,
            });
            cur += brk.duration;
            continue;
        }

        // Check if a break starts before the next block ends
        const nextBreak = sortedBreaks.find(b => {
            const bt = timeToMinutes(b.startTime);
            return bt > cur && bt < cur + cfg.blockDuration;
        });

        const blockEnd = nextBreak
            ? timeToMinutes(nextBreak.startTime)
            : Math.min(cur + cfg.blockDuration, globalEnd);

        // Only add if the block has a meaningful length (≥ 15 min)
        if (blockEnd - cur >= 15) {
            slots.push({
                type: "period",
                num: periodNum++,
                start: minutesToTime(cur),
                end: minutesToTime(blockEnd),
            });
        }
        cur = blockEnd;
    }

    return slots;
}

/**
 * For a given day and timeline slot, returns whether the slot is active
 * (within the day's working hours), inactive (after-hours / day off), or a break.
 */
export function slotStatusForDay(
    slot: TimeSlot,
    day: DayConfig
): "active" | "after-hours" | "inactive-day" | "break" {
    if (!day.active) return "inactive-day";
    if (slot.type === "break") {
        // Break is only shown if its start time is within the day's hours
        const brk = slot as TimeSlotBreak;
        if (timeToMinutes(brk.start) >= timeToMinutes(day.end)) return "after-hours";
        return "break";
    }
    // Period
    const period = slot as TimeSlotClass;
    if (timeToMinutes(period.start) >= timeToMinutes(day.end)) return "after-hours";
    return "active";
}
