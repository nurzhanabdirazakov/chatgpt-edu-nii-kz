import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";

const REPORT_URL = "https://app.powerbi.com/view?r=eyJrIjoiMmI5ZGE3NjctYmVkYi00MmUyLTk5YmEtMzQyOTJmZThhNTE0IiwidCI6IjQ0YWY2MTM1LTFmMTYtNGU3ZS04MzViLTAwYWY1MTdkZTNmNyIsImMiOjl9";
const OUTPUT = new URL("../public/data/power-bi.json", import.meta.url);

function loadInstitutes(source) {
  const marker = "export const institutes: Institute[] = ";
  const markerIndex = source.indexOf(marker);
  const start = source.indexOf("[", markerIndex + marker.length);
  const end = source.lastIndexOf("];");
  if (markerIndex < 0 || start < 0 || end < 0) throw new Error("Could not read institute catalogue");
  return JSON.parse(source.slice(start, end + 1));
}

function normalize(value) {
  return value
    .toLocaleLowerCase("ru")
    .replace(/республиканск(?:ое|ий|ая)\s+государственн(?:ое|ый|ая)\s+предприяти(?:е|я)\s+на\s+праве\s+хозяйственного\s+ведения/giu, " ")
    .replace(/шаруашылық\s+жүргізу\s+құқығындағы\s+республикалық\s+мемлекеттік\s+кәсіпорны/giu, " ")
    .replace(/\b(ргп|рмм|рму|ргу|тоо|ао|нао|кнао|кн|мнво|мз|рк|шжқ|рмк|жшс|ақ|кеақ|ғжбм|ғк)\b/giu, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreName(left, right) {
  const a = normalize(left);
  const b = normalize(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return Math.min(a.length, b.length) / Math.max(a.length, b.length) + 0.25;
  const aa = new Set(a.split(" ").filter(word => word.length > 2));
  const bb = new Set(b.split(" ").filter(word => word.length > 2));
  const common = [...aa].filter(word => bb.has(word)).length;
  return common / Math.max(aa.size, bb.size, 1);
}

function matchInstitute(name, institutes, used = new Set()) {
  const ranked = institutes
    .filter(item => !used.has(item.id))
    .map(item => ({ item, score: Math.max(scoreName(name, item.nameRu), scoreName(name, item.nameKz)) }))
    .sort((a, b) => b.score - a.score);
  if (!ranked[0] || ranked[0].score < 0.42) throw new Error(`No institute match for: ${name}`);
  return ranked[0].item;
}

async function rowLabels(grid) {
  return grid.locator('[role="row"]').evaluateAll(rows => rows.map(row => row.getAttribute("aria-label") || row.textContent || ""));
}

async function reportGrids(page) {
  await page.getByRole("grid").first().waitFor({ state: "visible", timeout: 90_000 });
  await page.waitForTimeout(1_000);
  return page.getByRole("grid").all();
}

async function expandToInstitutes(page, grid) {
  await grid.hover();
  await page.waitForTimeout(250);
  for (let level = 0; level < 2; level += 1) {
    const expand = page.getByRole("button", { name: "Развернуть все на один уровень вниз в иерархии" }).filter({ visible: true }).first();
    await expand.click({ timeout: 10_000 });
    await page.waitForTimeout(900);
    await grid.hover();
  }
}

async function scrapeFocusedRows(page, grid) {
  await grid.hover();
  const focus = page.getByRole("button", { name: "Режим фокусировки" }).filter({ visible: true }).first();
  await focus.click({ timeout: 10_000 });
  await page.waitForTimeout(800);

  const grids = await reportGrids(page);
  let target = grids[0];
  for (const candidate of grids) {
    const labels = await rowLabels(candidate);
    if (labels.some(label => label.includes("Начали вводный модуль")) || labels.some(label => label.includes("НИИ"))) {
      target = candidate;
      break;
    }
  }

  const labels = new Set();
  const scrollInfo = await target.evaluate(element => {
    let current = element;
    while (current && current.scrollHeight <= current.clientHeight) current = current.parentElement;
    return current ? { height: current.clientHeight, total: current.scrollHeight } : { height: 700, total: 700 };
  });
  const steps = Math.max(1, Math.ceil(scrollInfo.total / Math.max(200, scrollInfo.height / 2)));
  for (let step = 0; step <= steps; step += 1) {
    for (const label of await rowLabels(target)) labels.add(label.trim());
    await target.evaluate((element, nextTop) => {
      let current = element;
      while (current && current.scrollHeight <= current.clientHeight) current = current.parentElement;
      if (current) current.scrollTop = nextTop;
    }, Math.round(step * Math.max(200, scrollInfo.height / 2)));
    await page.waitForTimeout(180);
  }
  for (const label of await rowLabels(target)) labels.add(label.trim());
  await page.getByRole("button", { name: "Назад к отчету" }).click();
  await page.waitForTimeout(500);
  return [...labels];
}

function totalFrom(labels, width) {
  const totals = labels
    .filter(label => /^Итого\s/.test(label))
    .map(label => [...label.matchAll(/\d+/g)].map(match => Number(match[0])))
    .filter(values => values.length >= width);
  return totals[0]?.slice(-width) ?? null;
}

const catalogue = loadInstitutes(await readFile(new URL("../app/data.ts", import.meta.url), "utf8"));
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ locale: "ru-RU", viewport: { width: 2174, height: 1191 } });
const page = await context.newPage();

try {
  await page.goto(REPORT_URL, { waitUntil: "domcontentloaded", timeout: 120_000 });
  let grids = await reportGrids(page);
  const countGrids = [];
  for (const grid of grids) {
    const labels = await rowLabels(grid);
    const total = totalFrom(labels, 2);
    if (total) countGrids.push({ grid, labels, total: total[0] });
  }
  countGrids.sort((a, b) => b.total - a.total);
  if (countGrids.length < 2) throw new Error("Could not locate contract tables");
  const signed = countGrids[0].total;
  const unsigned = countGrids[1].total;

  await expandToInstitutes(page, countGrids[0].grid);
  const signedLabels = await scrapeFocusedRows(page, countGrids[0].grid);
  const signedNames = signedLabels
    .filter(label => /^Collapsed\s/.test(label))
    .map(label => label.replace(/^Collapsed\s+/, "").replace(/\s+\d+\s+\d+$/, ""));
  const signedIds = [];
  const usedSigned = new Set();
  for (const name of signedNames) {
    const institute = matchInstitute(name, catalogue, usedSigned);
    usedSigned.add(institute.id);
    signedIds.push(institute.id);
  }
  if (signedIds.length !== signed) throw new Error(`Expected ${signed} signed institutes, matched ${signedIds.length}`);

  await page.getByRole("button", { name: "Следующая страница" }).click();
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "Следующая страница" }).click();
  await page.waitForTimeout(1_000);
  grids = await reportGrids(page);
  let activationGrid;
  let activationTotal;
  for (const grid of grids) {
    const labels = await rowLabels(grid);
    if (labels.some(label => label.includes("Начали вводный модуль"))) {
      activationGrid = grid;
      activationTotal = totalFrom(labels, 3);
      break;
    }
  }
  if (!activationGrid || !activationTotal) throw new Error("Could not locate activation table");
  await expandToInstitutes(page, activationGrid);
  const activationLabels = await scrapeFocusedRows(page, activationGrid);
  const rows = {};
  const usedRows = new Set();
  for (const label of activationLabels.filter(value => /^Collapsed\s/.test(value))) {
    const clean = label.replace(/^Collapsed\s+/, "");
    const match = clean.match(/^(.*?)(?:\s+(\d+))(?:\s+(\d+))?(?:\s+(\d+))?$/);
    if (!match) continue;
    const institute = matchInstitute(match[1], catalogue, usedRows);
    usedRows.add(institute.id);
    rows[String(institute.id)] = [Number(match[3] ?? 0), Number(match[4] ?? 0)];
  }
  if (Object.keys(rows).length < 20) throw new Error(`Only ${Object.keys(rows).length} activation rows were matched`);

  const bodyText = await page.locator("body").innerText();
  const timestamp = bodyText.match(/\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}:\d{2}/)?.[0];
  if (!timestamp) throw new Error("Could not read Power BI update timestamp");
  const [moduleStarted, moduleCompleted, activated] = activationTotal;
  const snapshot = {
    signed,
    unsigned,
    moduleStarted,
    moduleCompleted,
    activated,
    updated: timestamp.replace(" ", ", "),
    signedIds: signedIds.sort((a, b) => a - b),
    rows,
  };
  await writeFile(OUTPUT, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`Power BI synced: ${signed} signed, ${activated} activated, ${Object.keys(rows).length} institute rows.`);
} finally {
  await browser.close();
}
