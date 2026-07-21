"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { institutes, type Institute } from "./data";

type Lang = "ru" | "kz";
type SortKey = "name" | "region" | "licenses" | "started" | "activated" | "rate";

const PERSONAL = { started: "01.07.2026", unsignedAtStart: 56, activatedAtStart: 137 };
const POWER_BI = { started: 286, activated: 223, updated: "20.07.2026, 10:24:07" };
const SHEET_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6e5pkEU1PhZ-jMbzv1_Gf0c7uzH8nLoh62sK0v3JIGQ8cKRXsZ6pvsVqzfngiVAAE1bem14PB4bGh/pub?gid=1899257310&single=true&output=csv";
const REFRESH_MS = 12 * 60 * 60 * 1000;

const copy = {
  ru: {
    eyebrow: "Национальный мониторинг • Казахстан",
    title: "Подключение научно-исследовательских институтов к ChatGPT Edu",
    intro: "Открытая сводка по договорам, выдаче доступов и активации сотрудников научных организаций.",
    updated: "Данные Power BI обновлены",
    sheet: "Снимок Google Sheets: 16.07.2026",
    total: "Всего НИИ", licenses: "Заявленные места", started: "Получили логин", activated: "Активировали", rate: "Активация от мест",
    signed: "Подписали договор", unsigned: "Не подписали", of: "из", institutes: "организаций",
    timeline: "Прогресс проекта", contracts: "Договоры", access: "Доступы", activation: "Активация", complete: "завершено",
    personalTitle: "Личный прогресс", personalHint: "Динамика проекта с начала вашей работы", personalStart: "Старт работы", startUnsigned: "Не подписали на старте", currentUnsigned: "Не подписали сейчас", reducedUnsigned: "Сокращение", backlogClosed: "стартового списка закрыто",
    leaders: "Лидеры активации", attention: "Требуют внимания", fullList: "Полный список подключённых НИИ",
    leaderHint: "Все организации с начавшими работу сотрудниками", attentionHint: "Договор подписан, но активация ещё не началась",
    profile: "Профиль института", profileHint: "Начните вводить название или выберите организацию",
    region: "Регион", district: "Район", contract: "Договор", yes: "Подписан", no: "Не подписан", status: "Статус",
    search: "Поиск по названию…", allRegions: "Все регионы", allStatuses: "Все статусы", found: "Найдено",
    name: "Организация", needsAttention: "Нужен фокус", onTrack: "В работе", excellent: "Отлично", early: "Ранний этап", notOnboarded: "Не подключён",
    unsignedTitle: "Ещё не подключены", unsignedHint: "Эти организации исключены из рейтинга активации до подписания договора.",
    disclaimerTitle: "Важно о данных", disclaimer: "Показатели могут обновляться с задержкой до 48 часов. Национальные KPI взяты из итоговых карточек Power BI, строки организаций — из Google Sheets. Поэтому сумма строк может временно отличаться от национального итога.",
    tableNote: "Нажмите на заголовок столбца для сортировки", footer: "ChatGPT Edu • Научно-исследовательские институты Казахстана",
  },
  kz: {
    eyebrow: "Ұлттық мониторинг • Қазақстан",
    title: "Ғылыми-зерттеу институттарын ChatGPT Edu жүйесіне қосу",
    intro: "Ғылыми ұйымдар қызметкерлерінің шарттары, қолжетімділігі және белсендірілуі туралы ашық есеп.",
    updated: "Power BI деректері жаңартылды", sheet: "Google Sheets деректер кесіндісі: 16.07.2026",
    total: "Барлық ҒЗИ", licenses: "Сұралған орындар", started: "Логин алды", activated: "Белсендірді", rate: "Орындар бойынша белсендіру",
    signed: "Шартқа қол қойды", unsigned: "Қол қоймады", of: "ішінен", institutes: "ұйым",
    timeline: "Жоба барысы", contracts: "Шарттар", access: "Қолжетімділік", activation: "Белсендіру", complete: "аяқталды",
    personalTitle: "Жеке прогресс", personalHint: "Жұмыс басталғаннан бергі жоба динамикасы", personalStart: "Жұмыс басталды", startUnsigned: "Басында қол қоймаған", currentUnsigned: "Қазір қол қоймаған", reducedUnsigned: "Қысқарды", backlogClosed: "бастапқы тізім жабылды",
    leaders: "Белсендіру көшбасшылары", attention: "Назар аудару қажет", fullList: "Қосылған ҒЗИ толық тізімі",
    leaderHint: "Жұмысты бастаған қызметкерлері бар барлық ұйым", attentionHint: "Шарт бар, бірақ белсендіру әлі басталмады",
    profile: "Институт профилі", profileHint: "Ұйым атауын теруді бастаңыз немесе тізімнен таңдаңыз",
    region: "Өңір", district: "Аудан", contract: "Шарт", yes: "Қол қойылды", no: "Қол қойылмады", status: "Мәртебе",
    search: "Атауы бойынша іздеу…", allRegions: "Барлық өңірлер", allStatuses: "Барлық мәртебелер", found: "Табылды",
    name: "Ұйым", needsAttention: "Назар қажет", onTrack: "Жұмыста", excellent: "Өте жақсы", early: "Бастапқы кезең", notOnboarded: "Қосылмаған",
    unsignedTitle: "Әлі қосылмаған", unsignedHint: "Бұл ұйымдар шартқа қол қойғанға дейін белсендіру рейтингінен шығарылған.",
    disclaimerTitle: "Деректер туралы маңызды", disclaimer: "Көрсеткіштер 48 сағатқа дейін кешігіп жаңартылуы мүмкін. Ұлттық KPI Power BI қорытынды карточкаларынан, ұйым жолдары Google Sheets-тен алынған. Сондықтан жолдар сомасы ұлттық қорытындыдан уақытша ерекшеленуі мүмкін.",
    tableNote: "Сұрыптау үшін баған тақырыбын басыңыз", footer: "ChatGPT Edu • Қазақстанның ғылыми-зерттеу институттары",
  },
};

function ratio(row: Institute) { return row.licenses > 0 ? row.activated / row.licenses : 0; }

function cleanName(value: string) {
  return value
    .replace(/Республиканское\s+государственное\s+предприяти(?:е|я)\s+на\s+праве\s+хозяйственного\s+ведения/gi, "РГП на ПХВ")
    .replace(/^\s*["“]+|["”]+\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function shortName(value: string) {
  const clean = cleanName(value).replace(/^(РГП на ПХВ|РГП на ПВХ|РГП|ТОО|АО|НАО|РГУ)\s*[«"]?/i, "");
  return clean.length > 74 ? `${clean.slice(0, 71)}…` : clean;
}

function statusFor(row: Institute, lang: Lang) {
  const t = copy[lang];
  if (!row.signed) return { key: "not", label: t.notOnboarded };
  if (row.started === 0) return { key: "attention", label: t.needsAttention };
  const value = ratio(row);
  if (value >= .8) return { key: "excellent", label: t.excellent };
  if (value >= .5) return { key: "track", label: t.onTrack };
  return { key: "early", label: t.early };
}

function formatNumber(value: number, lang: Lang) {
  return new Intl.NumberFormat(lang === "ru" ? "ru-RU" : "kk-KZ").format(value);
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell); cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function numberFrom(value = "") {
  return Number(value.replace(/[\s\u00a0]/g, "").replace(",", ".")) || 0;
}

function institutesFromCsv(text: string): Institute[] {
  return parseCsv(text).slice(1).filter(row => row[0]?.trim() && (row[1]?.trim() || row[2]?.trim())).map((row, index) => ({
    id: numberFrom(row[0]) || index + 1,
    nameKz: row[1]?.trim() || row[2]?.trim() || "",
    nameRu: row[2]?.trim() || row[1]?.trim() || "",
    region: row[3]?.trim() || "—",
    district: row[4]?.trim() || "—",
    licenses: numberFrom(row[5]),
    signed: /^(да|иә|yes)$/i.test(row[6]?.trim() || ""),
    started: numberFrom(row[7]),
    activated: numberFrom(row[8]),
  }));
}

function BarRow({ row, lang, tone }: { row: Institute; lang: Lang; tone: "good" | "bad" }) {
  const value = ratio(row);
  return <div className="rank-row">
    <div className="rank-copy"><strong>{shortName(lang === "ru" ? row.nameRu : row.nameKz)}</strong><span>{row.region}</span></div>
    <div className="rank-score">{row.licenses ? `${Math.round(value * 100)}%` : "0%"}</div>
    <div className="mini-track"><i className={tone} style={{ width: `${Math.max(value * 100, row.activated ? 3 : 0)}%` }} /></div>
  </div>;
}

export default function Home() {
  const [lang, setLang] = useState<Lang>("ru");
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "rate", dir: -1 });
  const [selectedId, setSelectedId] = useState(8);
  const [rows, setRows] = useState<Institute[]>(institutes);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshState, setRefreshState] = useState<"idle" | "ok" | "error">("idle");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const t = copy[lang];

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`${SHEET_CSV}&t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Google Sheets: ${response.status}`);
      const next = institutesFromCsv(await response.text());
      if (!next.length) throw new Error("Google Sheets returned no rows");
      setRows(next);
      setLastRefresh(new Date());
      setRefreshState("ok");
    } catch (error) {
      console.error(error);
      setRefreshState("error");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refreshData();
    const timer = window.setInterval(() => void refreshData(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refreshData]);

  const signed = rows.filter(i => i.signed);
  const unsigned = rows.filter(i => !i.signed).sort((a, b) => b.licenses - a.licenses);
  const totalLicenses = rows.reduce((sum, i) => sum + i.licenses, 0);
  const nationalRate = totalLicenses > 0 ? POWER_BI.activated / totalLicenses : 0;
  const contractRate = rows.length > 0 ? signed.length / rows.length : 0;
  const signedAtStart = Math.max(0, rows.length - PERSONAL.unsignedAtStart);
  const signedGrowth = Math.max(0, signed.length - signedAtStart);
  const activationGrowth = Math.max(0, POWER_BI.activated - PERSONAL.activatedAtStart);
  const regions = [...new Set(rows.map(i => i.region))].sort((a, b) => a.localeCompare(b));
  const selected = rows.find(i => i.id === selectedId) ?? rows[0];
  const nameOf = (row: Institute) => cleanName(lang === "ru" ? row.nameRu : row.nameKz);

  const leaders = signed.filter(i => i.started > 0).sort((a, b) => ratio(b) - ratio(a) || b.activated - a.activated);
  const attention = signed.filter(i => i.started === 0).sort((a, b) => b.licenses - a.licenses);

  const filtered = useMemo(() => {
    const q = query.toLocaleLowerCase();
    const rows = signed.filter(row => {
      const state = statusFor(row, lang).key;
      return (!q || `${row.nameRu} ${row.nameKz} ${row.region} ${row.district}`.toLocaleLowerCase().includes(q))
        && (region === "all" || row.region === region)
        && (status === "all" || state === status);
    });
    return rows.sort((a, b) => {
      const av = sort.key === "name" ? nameOf(a) : sort.key === "rate" ? ratio(a) : a[sort.key];
      const bv = sort.key === "name" ? nameOf(b) : sort.key === "rate" ? ratio(b) : b[sort.key];
      return (typeof av === "string" ? av.localeCompare(String(bv)) : Number(av) - Number(bv)) * sort.dir;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, region, status, sort, lang, rows]);

  function changeSort(key: SortKey) {
    setSort(current => current.key === key ? { key, dir: current.dir === 1 ? -1 : 1 } : { key, dir: key === "name" || key === "region" ? 1 : -1 });
  }

  return <main>
    <header className="topbar">
      <div className="shell nav-inner">
        <a className="brand" href="#top" aria-label="ChatGPT Edu NII Dashboard"><span className="brand-mark">NII</span><span>ChatGPT Edu</span></a>
        <div className="nav-actions">
          <button className="refresh-button" onClick={() => void refreshData()} disabled={refreshing} title={lang === "ru" ? "Загрузить свежие данные из Google Sheets" : "Google Sheets-тен жаңа деректерді жүктеу"}><span className={refreshing ? "spin" : ""}>↻</span>{lang === "ru" ? (refreshing ? "Обновление…" : "Обновить данные") : (refreshing ? "Жаңартылуда…" : "Деректерді жаңарту")}</button>
          <div className="language" aria-label="Language switcher">
            <button className={lang === "ru" ? "active" : ""} onClick={() => setLang("ru")}>RU</button>
            <button className={lang === "kz" ? "active" : ""} onClick={() => setLang("kz")}>KZ</button>
          </div>
        </div>
      </div>
    </header>

    <section className="hero" id="top">
      <div className="shell hero-grid">
        <div>
          <div className="eyebrow"><span />{t.eyebrow}</div>
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
          <div className="data-stamp"><b>{lang === "ru" ? "Power BI визуально проверен" : "Power BI визуалды тексерілді"}: {POWER_BI.updated}</b><span>{refreshState === "error" ? (lang === "ru" ? "Не удалось обновить Google Sheets — показаны последние сохранённые строки" : "Google Sheets жаңарту мүмкін болмады — соңғы сақталған жолдар көрсетілді") : `${lang === "ru" ? "Google Sheets" : "Google Sheets"}: ${lastRefresh ? new Intl.DateTimeFormat(lang === "ru" ? "ru-RU" : "kk-KZ", { dateStyle: "short", timeStyle: "short" }).format(lastRefresh) : "—"} • ${lang === "ru" ? "автообновление каждые 12 часов" : "әр 12 сағат сайын автоматты жаңарту"}`}</span></div>
        </div>
        <div className="hero-meters">
          <div className="hero-meter" aria-label={`${t.activation}: ${Math.round(nationalRate * 100)}%`}>
            <div className="ring activation-ring" style={{ "--progress": `${nationalRate * 360}deg` } as React.CSSProperties}><div><strong>{Math.round(nationalRate * 100)}%</strong><span>{t.activation}</span></div></div>
            <small>{formatNumber(POWER_BI.activated, lang)} / {formatNumber(totalLicenses, lang)}</small>
          </div>
          <div className="hero-meter" aria-label={`${t.contracts}: ${Math.round(contractRate * 100)}%`}>
            <div className="ring contract-ring" style={{ "--progress": `${contractRate * 360}deg` } as React.CSSProperties}><div><strong>{Math.round(contractRate * 100)}%</strong><span>{t.contracts}</span></div></div>
            <small>{signed.length} / {rows.length}</small>
          </div>
        </div>
      </div>
    </section>

    <div className="shell dashboard">
      <section className="kpi-grid" aria-label="Key metrics">
        {[
          ["01", t.total, rows.length, "navy"], ["02", t.licenses, totalLicenses, "blue"],
          ["03", t.started, POWER_BI.started, "sky"], ["04", t.activated, POWER_BI.activated, "green"],
          ["05", t.rate, `${Math.round(nationalRate * 100)}%`, "amber"],
        ].map(([no, label, value, tone]) => <article className={`kpi ${tone}`} key={String(no)}><span>{no}</span><p>{label}</p><strong>{typeof value === "number" ? formatNumber(value, lang) : value}</strong></article>)}
      </section>

      <section className="contract-grid">
        <article className="card contract-card">
          <div className="section-heading"><div><span className="kicker">01 — ONBOARDING</span><h2>{t.contracts}</h2></div><b>{Math.round(contractRate * 100)}%</b></div>
          <div className="contract-split"><div className="signed"><strong>{signed.length}</strong><span>{t.signed}</span></div><div className="unsigned"><strong>{unsigned.length}</strong><span>{t.unsigned}</span></div></div>
          <div className="progress"><i style={{ width: `${contractRate * 100}%` }} /></div>
          <p className="muted">{signed.length} {t.of} {rows.length} {t.institutes}</p>
        </article>

        <article className="card timeline-card">
          <div className="section-heading"><div><span className="kicker">02 — ROADMAP</span><h2>{t.timeline}</h2></div><b>{Math.round(nationalRate * 100)}%</b></div>
          <div className="timeline">
              <div className="done"><span>1</span><b>{t.contracts}</b><small>{Math.round(contractRate * 100)}% {t.complete}</small></div>
            <div className="done"><span>2</span><b>{t.access}</b><small>{POWER_BI.started}</small></div>
            <div><span>3</span><b>{t.activation}</b><small>{Math.round(nationalRate * 100)}% {t.complete}</small></div>
          </div>
        </article>
      </section>

      <section className="card personal-card">
        <div className="section-heading">
          <div><span className="kicker">03 — PERSONAL IMPACT</span><h2>{t.personalTitle}</h2><p>{t.personalHint}</p></div>
          <div className="personal-date"><span>{t.personalStart}</span><strong>{PERSONAL.started}</strong></div>
        </div>
        <div className="personal-stats">
          <div><span>{lang === "ru" ? "Подписали на старте" : "Басында қол қойған"}</span><strong>{signedAtStart}</strong></div>
          <div><span>{lang === "ru" ? "Подписали сейчас" : "Қазір қол қойған"}</span><strong>{signed.length}</strong></div>
          <div className="personal-result"><span>{lang === "ru" ? "Прирост подписавших" : "Қол қойғандар өсімі"}</span><strong>+{signedGrowth}</strong></div>
        </div>
        <div className="activation-stats">
          <div><span>{lang === "ru" ? "Активировали на старте" : "Басында белсендірілді"}</span><strong>{PERSONAL.activatedAtStart}</strong><small>{PERSONAL.started}</small></div>
          <div className="activation-now"><span>{lang === "ru" ? "Активировали сейчас" : "Қазір белсендірілді"}</span><strong>{POWER_BI.activated}</strong><small>+{activationGrowth}</small></div>
        </div>
      </section>

      <section className="card profile-card">
        <div className="section-heading"><div><span className="kicker">04 — SPOTLIGHT</span><h2>{t.profile}</h2></div></div>
        <label className="profile-search"><span>⌕</span><input list="institutes" defaultValue={nameOf(selected)} onChange={e => { const found = rows.find(i => nameOf(i) === e.target.value); if (found) setSelectedId(found.id); }} placeholder={t.profileHint} /></label>
        <datalist id="institutes">{rows.slice().sort((a,b) => nameOf(a).localeCompare(nameOf(b))).map(i => <option key={i.id} value={nameOf(i)} />)}</datalist>
        <div className="profile-content">
          <div className="profile-main"><span className="id-badge">NII — {String(selected.id).padStart(2, "0")}</span><h3>{nameOf(selected)}</h3><div className="profile-meta"><span>{selected.region}</span><span>{selected.district}</span></div></div>
          <div className="profile-stats">
            <div><span>{t.licenses}</span><strong>{formatNumber(selected.licenses, lang)}</strong></div>
            <div><span>{t.started}</span><strong>{selected.started}</strong></div>
            <div><span>{t.activated}</span><strong>{selected.activated}</strong></div>
            <div><span>{t.rate}</span><strong>{selected.licenses ? `${Math.round(ratio(selected) * 100)}%` : "—"}</strong></div>
          </div>
          <div className="profile-status"><span className={`pill ${statusFor(selected,lang).key}`}>{statusFor(selected,lang).label}</span><small>{t.contract}: <b>{selected.signed ? t.yes : t.no}</b></small></div>
        </div>
      </section>

      <section className="comparison">
        <article className="card ranking"><div className="section-heading"><div><span className="kicker">05 — PERFORMANCE</span><h2>{t.leaders}</h2><p>{t.leaderHint}</p></div><b>{leaders.length}</b></div><div className="rank-list">{leaders.map(row => <BarRow key={row.id} row={row} lang={lang} tone="good" />)}</div></article>
        <article className="card ranking"><div className="section-heading"><div><span className="kicker">06 — FOLLOW-UP</span><h2>{t.attention}</h2><p>{t.attentionHint}</p></div><b>{attention.length}</b></div><div className="rank-list">{attention.map(row => <BarRow key={row.id} row={row} lang={lang} tone="bad" />)}</div></article>
      </section>

      <section className="card table-card">
        <div className="section-heading"><div><span className="kicker">07 — DIRECTORY</span><h2>{t.fullList}</h2><p>{t.tableNote}</p></div><b>{filtered.length}</b></div>
        <div className="filters"><label><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder={t.search} /></label><select value={region} onChange={e => setRegion(e.target.value)}><option value="all">{t.allRegions}</option>{regions.map(r => <option key={r}>{r}</option>)}</select><select value={status} onChange={e => setStatus(e.target.value)}><option value="all">{t.allStatuses}</option><option value="excellent">{t.excellent}</option><option value="track">{t.onTrack}</option><option value="early">{t.early}</option><option value="attention">{t.needsAttention}</option></select></div>
        <div className="table-wrap"><table><thead><tr><th>№</th><th><button onClick={() => changeSort("name")}>{t.name} ↕</button></th><th><button onClick={() => changeSort("region")}>{t.region} ↕</button></th><th><button onClick={() => changeSort("licenses")}>{t.licenses} ↕</button></th><th><button onClick={() => changeSort("started")}>{t.started} ↕</button></th><th><button onClick={() => changeSort("activated")}>{t.activated} ↕</button></th><th><button onClick={() => changeSort("rate")}>{t.rate} ↕</button></th><th>{t.status}</th></tr></thead><tbody>{filtered.map(row => <tr key={row.id} onClick={() => { setSelectedId(row.id); document.querySelector(".profile-card")?.scrollIntoView({behavior:"smooth"}); }}><td>{row.id}</td><td><strong>{nameOf(row)}</strong><small>{row.district}</small></td><td>{row.region}</td><td>{formatNumber(row.licenses, lang)}</td><td>{row.started}</td><td>{row.activated}</td><td><div className="rate-cell"><b>{row.licenses ? `${Math.round(ratio(row)*100)}%` : "—"}</b><span><i style={{ width: `${Math.min(100, ratio(row) * 100)}%` }} /></span></div></td><td><span className={`pill ${statusFor(row,lang).key}`}>{statusFor(row,lang).label}</span></td></tr>)}</tbody></table></div>
      </section>

      <section className="card unsigned-card">
        <div className="section-heading"><div><span className="kicker">08 — ONBOARDING QUEUE</span><h2>{t.unsignedTitle}</h2><p>{t.unsignedHint}</p></div><b>{unsigned.length}</b></div>
        <div className="unsigned-grid">{unsigned.map(row => <button key={row.id} onClick={() => { setSelectedId(row.id); document.querySelector(".profile-card")?.scrollIntoView({behavior:"smooth"}); }}><span>{String(row.id).padStart(2,"0")}</span><div><strong>{shortName(nameOf(row))}</strong><small>{row.region} · {row.district}</small></div><b>{formatNumber(row.licenses,lang)}</b></button>)}</div>
      </section>

      <aside className="disclaimer"><div>!</div><p><strong>{t.disclaimerTitle}</strong>{lang === "ru" ? "Национальные KPI визуально считываются с публичного отчёта Power BI. Строки организаций загружаются из Google Sheets, поэтому их сумма может отличаться от итога Power BI из-за особенностей агрегации. Google Sheets проверяется при открытии, по кнопке и каждые 12 часов." : "Ұлттық KPI жалпыға қолжетімді Power BI есебінен визуалды түрде оқылады. Ұйым жолдары Google Sheets-тен жүктеледі, сондықтан агрегация ерекшеліктеріне байланысты олардың қосындысы Power BI қорытындысынан өзгеше болуы мүмкін. Google Sheets бет ашылғанда, батырма арқылы және әр 12 сағат сайын тексеріледі."}<b>{lang === "ru" ? "Power BI проверен" : "Power BI тексерілді"}: {POWER_BI.updated}</b></p></aside>
    </div>

    <footer><div className="shell"><b>{t.footer}</b><span>Power BI + Google Sheets</span></div></footer>
  </main>;
}
