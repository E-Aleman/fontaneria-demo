import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, dateKeyInTz, rangeKeys, weekday } from "../src/app/disciplina/_lib/dates";
import { defaultData } from "../src/app/disciplina/_lib/defaults";
import {
  canRepeatCurrent,
  dayStat,
  dayStreak,
  habitStreak,
  isDue,
  logId,
  milestones,
  phaseSequence,
  programDay,
  programEnd,
  programWeek,
  rangeStat,
  sleepMetrics,
  targetsFor,
  totalWeeks,
  undoableRepeat,
  validateSleepTimes,
} from "../src/app/disciplina/_lib/logic";
import { parseBackup, parseBackupText, toBackup } from "../src/app/disciplina/_lib/backup";
import type { AppData, SleepEntry } from "../src/app/disciplina/_lib/types";

const START = "2026-10-29"; // jueves

function markAll(data: AppData, d: string) {
  for (const h of data.habits) {
    if (isDue(data.settings, h, d)) data.habitLogs.push({ id: logId(h.id, d), habitId: h.id, date: d });
  }
}

test("zona horaria America/El_Salvador (UTC-6) para el cambio de día", () => {
  // 2026-10-29 04:30 UTC = 2026-10-28 22:30 en El Salvador
  assert.equal(dateKeyInTz(new Date("2026-10-29T04:30:00Z"), "America/El_Salvador"), "2026-10-28");
  assert.equal(dateKeyInTz(new Date("2026-10-29T06:00:00Z"), "America/El_Salvador"), "2026-10-29");
});

test("calendario: 90 días, 13 semanas, días 1..90", () => {
  const s = defaultData().settings;
  assert.equal(programEnd(s), "2027-01-26");
  assert.equal(rangeKeys(s.startDate, programEnd(s)).length, 90);
  assert.equal(totalWeeks(s), 13);
  assert.equal(programDay(s, START), 1);
  assert.equal(programDay(s, "2027-01-26"), 90);
  assert.equal(programDay(s, "2027-01-27"), null);
  assert.equal(programDay(s, "2026-10-28"), null);
  assert.equal(programWeek(s, addDays(START, 6)), 1);
  assert.equal(programWeek(s, addDays(START, 7)), 2);
  assert.equal(programWeek(s, "2027-01-26"), 13);
});

test("fases de adaptación según la tabla y consolidación", () => {
  const s = defaultData().settings;
  assert.deepEqual(phaseSequence(s), [1, 2, 3, 4, 5, 6, 7, 8, 0, 0, 0, 0, 0]);
  assert.equal(targetsFor(s, START).wake, "06:15");
  assert.equal(targetsFor(s, START).bed, "22:15");
  assert.equal(targetsFor(s, addDays(START, 7 * 7)).wake, "04:30"); // semana 8
  assert.equal(targetsFor(s, addDays(START, 8 * 7)).label, "Consolidación");
});

test("repetir semana desplaza solo semanas futuras", () => {
  const s = defaultData().settings;
  const today = addDays(START, 2 * 7 + 1); // semana 3
  const before = rangeKeys(START, today).map((d) => targetsFor(s, d).wake);
  const rep = canRepeatCurrent(s, today);
  assert.deepEqual(rep, { ok: true, phase: 3 });
  const s2 = { ...s, repeats: [3] };
  assert.deepEqual(phaseSequence(s2).slice(0, 5), [1, 2, 3, 3, 4]);
  const after = rangeKeys(START, today).map((d) => targetsFor(s2, d).wake);
  assert.deepEqual(after, before, "el historial no cambia");
  assert.equal(undoableRepeat(s2, today), 3, "la repetición aún no comienza: se puede deshacer");
  assert.equal(undoableRepeat(s2, addDays(START, 3 * 7)), null, "ya comenzó: no se puede deshacer");
});

test("domingo flexible: no cuenta en denominadores ni rompe rachas", () => {
  const data = defaultData();
  const sunday = "2026-11-01";
  assert.equal(weekday(sunday), 0);
  assert.equal(dayStat(data, sunday).due, 0);
  assert.equal(dayStat(data, sunday).pct, null);
  // Jue 29 → Sáb 31 completos, domingo nada, lunes completo.
  for (const d of ["2026-10-29", "2026-10-30", "2026-10-31", "2026-11-02"]) markAll(data, d);
  const st = dayStreak(data, "2026-11-02");
  assert.deepEqual(st, { current: 4, best: 4 });
  // Rango con domingo: denominador = 4 días × 10 hábitos
  const r = rangeStat(data, "2026-10-29", "2026-11-02", "2026-11-02");
  assert.deepEqual(r, { due: 40, done: 40, pct: 1 });
});

test("hábito diario sí cuenta el domingo si el domingo flexible está desactivado", () => {
  const data = defaultData();
  data.settings.flexibleSunday = false;
  data.settings.activeDays = [0, 1, 2, 3, 4, 5, 6];
  data.habits[0].days = [0, 1, 2, 3, 4, 5, 6];
  const st = dayStat(data, "2026-11-01");
  assert.equal(st.due, 1);
});

test("porcentajes: días futuros no penalizan, hoy incompleto no rompe la racha", () => {
  const data = defaultData();
  markAll(data, "2026-10-29");
  markAll(data, "2026-10-30");
  // hoy = 31 sin registros; semana completa como rango
  const r = rangeStat(data, START, addDays(START, 6), "2026-10-31");
  assert.equal(r.due, 30, "solo jue, vie y sáb (hoy) cuentan");
  assert.equal(r.done, 20);
  assert.equal(dayStreak(data, "2026-10-31").current, 2);
  // Al pasar el día sin cumplir, la racha se rompe
  assert.equal(dayStreak(data, "2026-11-02").current, 0);
  assert.equal(dayStreak(data, "2026-11-02").best, 2);
});

test("umbral de racha y registros únicos por hábito/fecha", () => {
  const data = defaultData();
  const d = "2026-10-29";
  const habits = data.habits.slice(0, 8);
  for (const h of habits) data.habitLogs.push({ id: logId(h.id, d), habitId: h.id, date: d });
  // Duplicado del mismo hábito/fecha: comparte id, no suma
  data.habitLogs.push({ id: logId(habits[0].id, d), habitId: habits[0].id, date: d });
  assert.equal(dayStat(data, d).done, 8);
  assert.equal(dayStat(data, d).pct, 0.8);
  assert.equal(dayStreak(data, d).current, 1, "80% alcanza el umbral por defecto");
  data.settings.streakThreshold = 90;
  assert.equal(dayStreak(data, d).current, 0);
});

test("pausas: los días pausados no cuentan", () => {
  const data = defaultData();
  const h = data.habits[1];
  h.pauses = [{ from: "2026-10-30", to: "2026-10-31" }];
  assert.equal(isDue(data.settings, h, "2026-10-29"), true);
  assert.equal(isDue(data.settings, h, "2026-10-30"), false);
  assert.equal(isDue(data.settings, h, "2026-11-02"), true);
  data.habitLogs.push({ id: logId(h.id, "2026-10-29"), habitId: h.id, date: "2026-10-29" });
  data.habitLogs.push({ id: logId(h.id, "2026-11-02"), habitId: h.id, date: "2026-11-02" });
  const days = rangeKeys(START, "2026-11-02");
  assert.deepEqual(habitStreak(data, h, days, "2026-11-02"), { current: 2, best: 2 });
});

const base: Pick<SleepEntry, "targetBed" | "targetWake" | "minHours"> = { targetBed: "20:30", targetWake: "04:30", minHours: 7 };

test("sueño: cruce de medianoche y distinción cama/sueño", () => {
  const m = sleepMetrics({ ...base, bedTime: "22:30", wakeTime: "06:30" });
  assert.equal(m.inBedMin, 480);
  assert.equal(m.sleepMin, 480);
  assert.equal(m.hasAsleep, false);
  const m2 = sleepMetrics({ ...base, bedTime: "23:40", asleepTime: "00:20", wakeTime: "05:00" });
  assert.equal(m2.inBedMin, 320);
  assert.equal(m2.latencyMin, 40);
  assert.equal(m2.sleepMin, 280);
  const m3 = sleepMetrics({ ...base, bedTime: "00:30", wakeTime: "07:15" });
  assert.equal(m3.inBedMin, 405);
  assert.equal(validateSleepTimes("22:00", "22:30"), "El tiempo en cama debe ser de al menos 1 hora.");
  assert.match(validateSleepTimes("22:00", "06:00", "07:00") ?? "", /entre acostarse y despertar/);
});

test("sueño: no se premia madrugar con descanso insuficiente", () => {
  const ok = sleepMetrics({ ...base, bedTime: "20:30", wakeTime: "04:30" });
  assert.equal(ok.goalMet, true);
  const short = sleepMetrics({ ...base, bedTime: "23:30", wakeTime: "04:30" });
  assert.equal(short.onTime, true);
  assert.equal(short.enough, false);
  assert.equal(short.goalMet, false);
  assert.equal(short.status, "insufficient");
  const late = sleepMetrics({ ...base, bedTime: "21:00", wakeTime: "05:30" });
  assert.equal(late.wakeDiff, 60);
  assert.equal(late.goalMet, false);
});

test("hitos dentro de los 90 días", () => {
  const s = defaultData().settings;
  const ms = milestones(s, "2026-12-01");
  assert.ok(ms.every((m) => m.day >= 1 && m.day <= 90));
  assert.equal(ms.find((m) => m.day === 90)?.date, "2027-01-26");
  assert.ok(ms.find((m) => m.day === 30)?.reached);
  assert.ok(!ms.find((m) => m.day === 60)?.reached);
});

test("respaldo: exportar → importar conserva los datos", () => {
  const data = defaultData();
  markAll(data, "2026-10-29");
  data.sleep.push({ date: "2026-10-29", bedTime: "22:15", wakeTime: "06:15", quality: 4, notes: "ok, \"bien\"", targetBed: "22:15", targetWake: "06:15", targetHours: 8, minHours: 7 });
  data.tasks.push({ id: "t1", title: "Informe", date: "2026-10-29", priority: true, category: "Trabajo", status: "pending", createdAt: "2026-10-28T10:00:00.000Z" });
  data.focus.push({ id: "f1", date: "2026-10-29", startedAt: "2026-10-29T11:00:00.000Z", minutes: 25, plannedMinutes: 25, label: "x", completed: true });
  const text = JSON.stringify(toBackup(data));
  const back = parseBackupText(text);
  assert.deepEqual(back, JSON.parse(JSON.stringify(data)));
});

test("respaldo: rechaza archivos inválidos y deduplica registros", () => {
  assert.throws(() => parseBackupText("no json"), /JSON válido/);
  assert.throws(() => parseBackup({ app: "otra" }), /no es un respaldo/);
  const data = defaultData();
  const bad = JSON.parse(JSON.stringify(toBackup(data)));
  bad.data.sleep = [{ date: "2026-13-01", bedTime: "22:00", wakeTime: "06:00" }];
  assert.throws(() => parseBackup(bad), /sueño inválido/);
  const dup = JSON.parse(JSON.stringify(toBackup(data)));
  const h = data.habits[0].id;
  dup.data.habitLogs = [
    { id: "x", habitId: h, date: "2026-10-29" },
    { id: "y", habitId: h, date: "2026-10-29" },
    { id: "z", habitId: "inexistente", date: "2026-10-29" },
  ];
  assert.equal(parseBackup(dup).habitLogs.length, 1);
});
