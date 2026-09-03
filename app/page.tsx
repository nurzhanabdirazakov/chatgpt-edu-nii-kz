"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { institutes, type Institute } from "./data";

type Lang = "ru" | "kz";
type SortKey = "name" | "region" | "licenses" | "started" | "activated" | "rate";
type PowerBiSnapshot = {
  signed: number;
  unsigned: number;
  moduleStarted: number;
  moduleCompleted: number;
  activated: number;
  updated: string;
  signedIds: number[];
  rows: Record<string, [started: number, activated: number]>;
};

const POWER_BI_FALLBACK: PowerBiSnapshot = {
  signed: 50,
  unsigned: 22,
  moduleStarted: 538,
  moduleCompleted: 478,
  activated: 367,
  updated: "03.09.2026, 13:08:46",
  signedIds: [2,3,4,6,7,8,9,10,14,16,20,22,23,24,28,29,30,31,32,33,34,37,39,40,42,43,44,45,47,48,49,50,51,52,53,54,56,58,59,61,62,63,64,65,67,68,69,70,71,72],
  rows: {
    2:[3,1],4:[25,22],6:[1,0],7:[18,12],8:[87,75],9:[21,15],10:[13,7],16:[43,26],22:[30,28],23:[1,0],24:[1,1],28:[10,9],29:[23,15],31:[19,9],32:[15,12],33:[13,11],34:[15,10],37:[3,3],39:[18,10],40:[29,26],42:[19,12],44:[16,15],48:[2,0],49:[4,3],51:[3,0],52:[6,3],53:[8,4],56:[7,4],59:[10,7],61:[10,9],62:[7,7],68:[3,1],71:[15,9],
  },
};
const SHEET_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6e5pkEU1PhZ-jMbzv1_Gf0c7uzH8nLoh62sK0v3JIGQ8cKRXsZ6pvsVqzfngiVAAE1bem14PB4bGh/pub?gid=1899257310&single=true&output=csv";
const POWER_BI_DATA = "./data/power-bi.json";
const REFRESH_MS = 12 * 60 * 60 * 1000;

const copy = {
  ru: {
    eyebrow: "Национальный мониторинг • Казахстан",
    title: "Подключение научно-исследовательских институтов к ChatGPT Edu",
    intro: "Открытая сводка по договорам, выдаче доступов и активации сотрудников научных организаций.",
    updated: "Данные Power BI обновлены",
    sheet: "Google Sheets обновлён: 24.08.2026",
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
    updated: "Power BI деректері жаңартылды", sheet: "Google Sheets жаңартылды: 24.08.2026",
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

function withPowerBiRows(rows: Institute[], snapshot: PowerBiSnapshot) {
  const signedIds = new Set(snapshot.signedIds);
  return rows.map(row => {
    const current = snapshot.rows[String(row.id)];
    return {
      ...row,
      signed: signedIds.has(row.id),
      started: current?.[0] ?? 0,
      activated: current?.[1] ?? 0,
    };
  });
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
  const [powerBi, setPowerBi] = useState<PowerBiSnapshot>(POWER_BI_FALLBACK);
  const [rows, setRows] = useState<Institute[]>(() => withPowerBiRows(institutes, POWER_BI_FALLBACK));
  const [refreshing, setRefreshing] = useState(false);
  const [refreshState, setRefreshState] = useState<"idle" | "ok" | "error">("idle");
  const t = copy[lang];

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    try {
      const stamp = Date.now();
      const [sheetResponse, powerBiResponse] = await Promise.all([
        fetch(`${SHEET_CSV}&t=${stamp}`, { cache: "no-store" }),
        fetch(`${POWER_BI_DATA}?t=${stamp}`, { cache: "no-store" }),
      ]);
      if (!sheetResponse.ok) throw new Error(`Google Sheets: ${sheetResponse.status}`);
      if (!powerBiResponse.ok) throw new Error(`Power BI snapshot: ${powerBiResponse.status}`);
      const next = institutesFromCsv(await sheetResponse.text());
      if (!next.length) throw new Error("Google Sheets returned no rows");
      const nextPowerBi = await powerBiResponse.json() as PowerBiSnapshot;
      setPowerBi(nextPowerBi);
      setRows(withPowerBiRows(next, nextPowerBi));
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
  const nationalRate = totalLicenses > 0 ? powerBi.activated / totalLicenses : 0;
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

  return <main className="page" id="top">
    <div className="shell dashboard">
      <header className="site-header">
        <div>
          <h1>{lang === "ru" ? "ChatGPT Edu в НИИ Казахстана" : "Қазақстан ҒЗИ-ларындағы ChatGPT Edu"}</h1>
          <p>{lang === "ru" ? "Показатели активации лицензий ChatGPT Edu по научно-исследовательским институтам Казахстана." : "Қазақстанның ғылыми-зерттеу институттарындағы ChatGPT Edu лицензияларын белсендіру көрсеткіштері."}</p>
        </div>
        <div className="header-actions">
          <button className="refresh-button" onClick={() => void refreshData()} disabled={refreshing} title={lang === "ru" ? "Обновить данные" : "Деректерді жаңарту"} aria-label={lang === "ru" ? "Обновить данные" : "Деректерді жаңарту"}><span className={refreshing ? "spin" : ""}>↻</span></button>
          <div className="language" aria-label="Language switcher">
            <button className={lang === "kz" ? "active" : ""} onClick={() => setLang("kz")}>ҚАЗ</button>
            <button className={lang === "ru" ? "active" : ""} onClick={() => setLang("ru")}>РУС</button>
          </div>
        </div>
      </header>

      <aside className="disclaimer">
        <div>i</div>
        <p>{lang === "ru" ? "Данные могут отображаться с задержкой до 48 часов." : "Деректер 48 сағатқа дейін кешігіп көрсетілуі мүмкін."}<b>{lang === "ru" ? "Последнее обновление Power BI" : "Power BI соңғы жаңартылуы"}: {powerBi.updated}</b>{refreshState === "error" && <small>{lang === "ru" ? "Не удалось получить свежие данные — показана сохранённая версия." : "Жаңа деректерді алу мүмкін болмады — сақталған нұсқа көрсетілді."}</small>}</p>
      </aside>

      <section className="project-card card">
        <div className="project-head"><b>{lang === "ru" ? "СРОКИ ПРОЕКТА · 12 МЕСЯЦЕВ" : "ЖОБА МЕРЗІМІ · 12 АЙ"}</b><span>{lang === "ru" ? "Осталось 234 дн. · пройдено 36%" : "234 күн қалды · 36% өтті"}</span></div>
        <div className="project-progress"><i style={{ width: "36%" }} /></div>
        <div className="months"><span>мар’26</span><span>апр</span><span>май</span><span>июн</span><span>июл</span><span>авг</span><span>сен</span><span>окт</span><span>ноя</span><span>дек</span><span>янв</span><span>фев</span><span>мар’27</span></div>
        <div className="project-dates"><b>30.03.2026</b><b>29.03.2027</b></div>
      </section>

      <section className="summary-grid" aria-label="Key metrics">
        <article className="summary-card contract-summary">
          <div><span className="dot good" /><span>{t.signed}</span><strong>{powerBi.signed}</strong></div>
          <div><span className="dot bad" /><span>{t.unsigned}</span><strong>{powerBi.unsigned}</strong></div>
        </article>
        <article className="summary-card"><span>{t.licenses}</span><strong>{formatNumber(totalLicenses, lang)}</strong></article>
        <article className="summary-card"><span>{t.activated}</span><strong className="green-value">{formatNumber(powerBi.activated, lang)}</strong></article>
        <article className="summary-card"><span>{t.rate}</span><strong className="amber-value">{Math.round(nationalRate * 100)}%</strong></article>
      </section>

      <section className="comparison">
        <article className="card ranking"><div className="section-heading"><div><h2>{t.leaders}</h2><p>{t.leaderHint}</p></div></div><div className="rank-list">{leaders.map(row => <BarRow key={row.id} row={row} lang={lang} tone="good" />)}</div></article>
        <article className="card ranking"><div className="section-heading"><div><h2>{t.attention}</h2><p>{t.attentionHint}</p></div></div><div className="rank-list">{attention.map(row => <BarRow key={row.id} row={row} lang={lang} tone="bad" />)}</div></article>
      </section>

      <section className="card profile-card">
        <div className="section-heading"><div><h2>{t.profile}</h2><p>{t.profileHint}</p></div></div>
        <label className="profile-search"><span>⌕</span><input list="institutes" defaultValue={nameOf(selected)} onChange={e => { const found = rows.find(i => nameOf(i) === e.target.value); if (found) setSelectedId(found.id); }} placeholder={t.profileHint} /></label>
        <datalist id="institutes">{rows.slice().sort((a,b) => nameOf(a).localeCompare(nameOf(b))).map(i => <option key={i.id} value={nameOf(i)} />)}</datalist>
        <div className="profile-metrics">
          <div className="profile-metric navy"><span>{t.licenses}</span><strong>{formatNumber(selected.licenses, lang)}</strong></div>
          <div className="profile-metric blue"><span>{t.started}</span><strong>{selected.started}</strong></div>
          <div className="profile-metric sky"><span>{t.activated}</span><strong>{selected.activated}</strong></div>
          <div className="profile-metric green"><span>{t.rate}</span><strong>{selected.licenses ? `${Math.round(ratio(selected) * 100)}%` : "—"}</strong></div>
        </div>
        <div className="profile-details"><div><span>NII — {String(selected.id).padStart(2, "0")}</span><h3>{nameOf(selected)}</h3><p>{selected.region} · {selected.district}</p></div><div><span className={`pill ${statusFor(selected,lang).key}`}>{statusFor(selected,lang).label}</span><small>{t.contract}: <b>{selected.signed ? t.yes : t.no}</b></small></div></div>
      </section>

      <section className="card table-card">
        <div className="section-heading"><div><h2>{t.fullList}</h2><p>{t.tableNote}</p></div><b>{filtered.length}</b></div>
        <div className="filters"><label><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder={t.search} /></label><select value={region} onChange={e => setRegion(e.target.value)}><option value="all">{t.allRegions}</option>{regions.map(r => <option key={r}>{r}</option>)}</select><select value={status} onChange={e => setStatus(e.target.value)}><option value="all">{t.allStatuses}</option><option value="excellent">{t.excellent}</option><option value="track">{t.onTrack}</option><option value="early">{t.early}</option><option value="attention">{t.needsAttention}</option></select></div>
        <div className="table-wrap"><table><thead><tr><th>№</th><th><button onClick={() => changeSort("name")}>{t.name} ↕</button></th><th><button onClick={() => changeSort("region")}>{t.region} ↕</button></th><th><button onClick={() => changeSort("licenses")}>{t.licenses} ↕</button></th><th><button onClick={() => changeSort("started")}>{t.started} ↕</button></th><th><button onClick={() => changeSort("activated")}>{t.activated} ↕</button></th><th><button onClick={() => changeSort("rate")}>{t.rate} ↕</button></th><th>{t.status}</th></tr></thead><tbody>{filtered.map(row => <tr key={row.id} onClick={() => { setSelectedId(row.id); document.querySelector(".profile-card")?.scrollIntoView({behavior:"smooth"}); }}><td>{row.id}</td><td><strong>{nameOf(row)}</strong><small>{row.district}</small></td><td>{row.region}</td><td>{formatNumber(row.licenses, lang)}</td><td>{row.started}</td><td>{row.activated}</td><td><div className="rate-cell"><b>{row.licenses ? `${Math.round(ratio(row)*100)}%` : "—"}</b><span><i style={{ width: `${Math.min(100, ratio(row) * 100)}%` }} /></span></div></td><td><span className={`pill ${statusFor(row,lang).key}`}>{statusFor(row,lang).label}</span></td></tr>)}</tbody></table></div>
      </section>

      <section className="card unsigned-card">
        <div className="section-heading"><div><h2>{t.unsignedTitle}</h2><p>{t.unsignedHint}</p></div><b>{unsigned.length}</b></div>
        <div className="unsigned-grid">{unsigned.map(row => <button key={row.id} onClick={() => { setSelectedId(row.id); document.querySelector(".profile-card")?.scrollIntoView({behavior:"smooth"}); }}><span>{String(row.id).padStart(2,"0")}</span><div><strong>{shortName(nameOf(row))}</strong><small>{row.region} · {row.district}</small></div><b>{formatNumber(row.licenses,lang)}</b></button>)}</div>
      </section>
    </div>

    <footer><div className="shell"><b>{t.footer}</b><span>Power BI + Google Sheets</span></div></footer>
  </main>;
}
