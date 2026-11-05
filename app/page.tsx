"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { institutes, type Institute } from "./data";

type Lang = "ru" | "kz";
type SortKey = "name" | "region" | "licenses" | "started" | "activated" | "rate";
import savedPowerBi from "../public/data/power-bi.json";
type PowerBiSnapshot = {schemaVersion: number; activated: number; receivedTotal: number; updated: string; rows: Record<string, number[]>};
const POWER_BI_FALLBACK: PowerBiSnapshot = savedPowerBi;
const CATALOGUE_DATA = "./data/institutes.json";
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
    leaders: "Лидеры активации", attention: "Требуют внимания", fullList: "Список НИИ и организаций проекта",
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
    leaders: "Белсендіру көшбасшылары", attention: "Назар аудару қажет", fullList: "Жобадағы ҒЗИ және ұйымдар тізімі",
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
  if (row.signed === null) return { key: "not", label: lang === "ru" ? "Договор не указан" : "Шарт белгісіз" };
  if (!row.signed) return { key: "not", label: t.notOnboarded };
  if (row.activated === 0) return { key: "attention", label: t.needsAttention };
  if (!row.licenses || row.activated > row.licenses) return { key: "early", label: lang === "ru" ? "Уточнить места" : "Орын санын нақтылау" };
  const value = ratio(row);
  if (value >= .8) return { key: "excellent", label: t.excellent };
  if (value >= .5) return { key: "track", label: t.onTrack };
  return { key: "early", label: t.early };
}

function formatNumber(value: number, lang: Lang) {
  return new Intl.NumberFormat(lang === "ru" ? "ru-RU" : "kk-KZ").format(value);
}

function BarRow({ row, lang, tone }: { row: Institute; lang: Lang; tone: "good" | "bad" }) {
  const value = ratio(row);
  return <div className="rank-row">
    <div className="rank-copy"><strong>{shortName(lang === "ru" ? row.nameRu : row.nameKz)}</strong><span>{row.region}</span></div>
    <div className="rank-score">{row.licenses ? `${Math.round(value * 100)}%` : "0%"}</div>
    <div className="mini-track"><i className={tone} style={{ width: `${Math.min(100, Math.max(value * 100, row.activated ? 3 : 0))}%` }} /></div>
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
  const [rows, setRows] = useState<Institute[]>(institutes);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshState, setRefreshState] = useState<"idle" | "ok" | "error">("idle");
  const t = copy[lang];
  const projectStart = Date.UTC(2026, 2, 30);
  const projectEnd = Date.UTC(2027, 2, 29);
  const [today, setToday] = useState(Date.UTC(2026, 10, 5));
  useEffect(() => { setToday(Date.now()); }, []);
  const remainingDays = Math.max(0, Math.ceil((projectEnd - today) / 86400000));
  const elapsedPercent = Math.min(100, Math.max(0, Math.round((today - projectStart) / (projectEnd - projectStart) * 100)));

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    try {
      const stamp = Date.now();
      const [sheetResponse, powerBiResponse] = await Promise.all([
        fetch(`${CATALOGUE_DATA}?t=${stamp}`, { cache: "no-store" }),
        fetch(`${POWER_BI_DATA}?t=${stamp}`, { cache: "no-store" }),
      ]);
      if (!sheetResponse.ok) throw new Error(`Google Sheets: ${sheetResponse.status}`);
      if (!powerBiResponse.ok) throw new Error(`Power BI snapshot: ${powerBiResponse.status}`);
      const catalogue = await sheetResponse.json() as Institute[];
      const nextPowerBi = await powerBiResponse.json() as PowerBiSnapshot;
      if (!Array.isArray(catalogue) || catalogue.length < 72 || nextPowerBi.schemaVersion !== 2) throw new Error("Invalid snapshot");
      const next = catalogue.map(row => {
        const pair = nextPowerBi.rows[String(row.id)];
        if (!pair || pair.length !== 2 || pair.some(n => !Number.isSafeInteger(n) || n < 0)) throw new Error("Missing institute metrics");
        return {...row, started: pair[0], activated: pair[1]};
      });
      if (next.reduce((sum, row) => sum + row.activated, 0) !== nextPowerBi.activated) throw new Error("Activation total mismatch");
      setPowerBi(nextPowerBi);
      setRows(next);
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
  const unsigned = rows.filter(i => i.signed === false).sort((a, b) => b.licenses - a.licenses);
  const totalLicenses = rows.reduce((sum, i) => sum + i.licenses, 0);
  const totalActivated = rows.reduce((sum, i) => sum + i.activated, 0);
  const nationalRate = totalLicenses > 0 ? totalActivated / totalLicenses : 0;
  const regions = [...new Set(rows.map(i => i.region))].sort((a, b) => a.localeCompare(b));
  const selected = rows.find(i => i.id === selectedId) ?? rows[0];
  const nameOf = (row: Institute) => cleanName(lang === "ru" ? row.nameRu : row.nameKz);

  const leaders = signed.filter(i => i.activated > 0 && i.licenses > 0).sort((a, b) => ratio(b) - ratio(a) || b.activated - a.activated);
  const attention = signed.filter(i => i.activated === 0).sort((a, b) => b.licenses - a.licenses);

  const rowsWithContracts = rows.filter(row => row.signed !== false);
  const filtered = useMemo(() => {
    const q = query.toLocaleLowerCase();
    const rows = rowsWithContracts.filter(row => {
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
        <p>{lang === "ru" ? "Данные могут отображаться с задержкой до 48 часов." : "Деректер 48 сағатқа дейін кешігіп көрсетілуі мүмкін."}<b>{lang === "ru" ? "Последнее обновление Power BI" : "Power BI соңғы жаңартылуы"}: {powerBi.updated}</b><small>{lang === "ru" ? "Договоры и места: Google Sheets, проверено 05.11.2026. У двух новых организаций не указаны номера и места; у Национального центра тестирования не указан договор. Сумма логинов по организациям — 907, итог Power BI — 871. Проценты рассчитаны по указанным местам; значения выше 100% требуют уточнения заявок." : "Шарттар мен орындар: Google Sheets, 05.11.2026 тексерілді. Екі жаңа ұйымның нөмірі мен орын саны, Ұлттық тестілеу орталығының шарты көрсетілмеген. Ұйымдар бойынша логиндер сомасы — 907, Power BI қорытындысы — 871. Пайыз көрсетілген орындармен есептеледі; 100%-дан жоғары мәндер өтінімді нақтылауды қажет етеді."}</small>{refreshState === "error" && <small>{lang === "ru" ? "Не удалось получить свежие данные — показана сохранённая версия." : "Жаңа деректерді алу мүмкін болмады — сақталған нұсқа көрсетілді."}</small>}</p>
      </aside>

      <section className="project-card card">
        <div className="project-head"><b>{lang === "ru" ? "СРОКИ ПРОЕКТА · 12 МЕСЯЦЕВ" : "ЖОБА МЕРЗІМІ · 12 АЙ"}</b><span>{lang === "ru" ? `Осталось ${remainingDays} дн. · пройдено ${elapsedPercent}%` : `${remainingDays} күн қалды · ${elapsedPercent}% өтті`}</span></div>
        <div className="project-progress"><i style={{ width: `${elapsedPercent}%` }} /></div>
        <div className="months"><span>мар’26</span><span>апр</span><span>май</span><span>июн</span><span>июл</span><span>авг</span><span>сен</span><span>окт</span><span>ноя</span><span>дек</span><span>янв</span><span>фев</span><span>мар’27</span></div>
        <div className="project-dates"><b>30.03.2026</b><b>29.03.2027</b></div>
      </section>

      <section className="summary-grid" aria-label="Key metrics">
        <article className="summary-card contract-summary">
          <div><span className="dot good" /><span>{t.signed}</span><strong>{signed.length}</strong></div>
          <div><span className="dot bad" /><span>{t.unsigned}</span><strong>{unsigned.length}</strong></div>
        </article>
        <article className="summary-card"><span>{t.licenses}</span><strong>{formatNumber(totalLicenses, lang)}</strong></article>
        <article className="summary-card"><span>{t.activated}</span><strong className="green-value">{formatNumber(totalActivated, lang)}</strong></article>
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
          <div className="profile-metric navy"><span>{t.licenses}</span><strong>{selected.licenses ? formatNumber(selected.licenses, lang) : "—"}</strong></div>
          <div className="profile-metric blue"><span>{t.started}</span><strong>{selected.started}</strong></div>
          <div className="profile-metric sky"><span>{t.activated}</span><strong>{selected.activated}</strong></div>
          <div className="profile-metric green"><span>{t.rate}</span><strong>{selected.licenses ? `${Math.round(ratio(selected) * 100)}%` : "—"}</strong></div>
        </div>
        <div className="profile-details"><div><span>NII — {selected.sourceIdMissing ? "—" : String(selected.id).padStart(2, "0")}</span><h3>{nameOf(selected)}</h3><p>{selected.region} · {selected.district}</p></div><div><span className={`pill ${statusFor(selected,lang).key}`}>{statusFor(selected,lang).label}</span><small>{t.contract}: <b>{selected.signed === null ? "—" : selected.signed ? t.yes : t.no}</b></small></div></div>
      </section>

      <section className="card table-card">
        <div className="section-heading"><div><h2>{t.fullList}</h2><p>{t.tableNote}</p></div><b>{filtered.length}</b></div>
        <div className="filters"><label><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder={t.search} /></label><select value={region} onChange={e => setRegion(e.target.value)}><option value="all">{t.allRegions}</option>{regions.map(r => <option key={r}>{r}</option>)}</select><select value={status} onChange={e => setStatus(e.target.value)}><option value="all">{t.allStatuses}</option><option value="excellent">{t.excellent}</option><option value="track">{t.onTrack}</option><option value="early">{t.early}</option><option value="attention">{t.needsAttention}</option></select></div>
        <div className="table-wrap"><table><thead><tr><th>№</th><th><button onClick={() => changeSort("name")}>{t.name} ↕</button></th><th><button onClick={() => changeSort("region")}>{t.region} ↕</button></th><th><button onClick={() => changeSort("licenses")}>{t.licenses} ↕</button></th><th><button onClick={() => changeSort("started")}>{t.started} ↕</button></th><th><button onClick={() => changeSort("activated")}>{t.activated} ↕</button></th><th><button onClick={() => changeSort("rate")}>{t.rate} ↕</button></th><th>{t.status}</th></tr></thead><tbody>{filtered.map(row => <tr key={row.id} onClick={() => { setSelectedId(row.id); document.querySelector(".profile-card")?.scrollIntoView({behavior:"smooth"}); }}><td>{row.sourceIdMissing ? "—" : row.id}</td><td><strong>{nameOf(row)}</strong><small>{row.district}</small></td><td>{row.region}</td><td>{row.licenses ? formatNumber(row.licenses, lang) : "—"}</td><td>{row.started}</td><td>{row.activated}</td><td><div className="rate-cell"><b>{row.licenses ? `${Math.round(ratio(row)*100)}%` : "—"}</b><span><i style={{ width: `${Math.min(100, ratio(row) * 100)}%` }} /></span></div></td><td><span className={`pill ${statusFor(row,lang).key}`}>{statusFor(row,lang).label}</span></td></tr>)}</tbody></table></div>
      </section>

      <section className="card unsigned-card">
        <div className="section-heading"><div><h2>{t.unsignedTitle}</h2><p>{t.unsignedHint}</p></div><b>{unsigned.length}</b></div>
        <div className="unsigned-grid">{unsigned.map(row => <button key={row.id} onClick={() => { setSelectedId(row.id); document.querySelector(".profile-card")?.scrollIntoView({behavior:"smooth"}); }}><span>{String(row.id).padStart(2,"0")}</span><div><strong>{shortName(nameOf(row))}</strong><small>{row.region} · {row.district}</small></div><b>{formatNumber(row.licenses,lang)}</b></button>)}</div>
      </section>
    </div>

    <footer><div className="shell"><b>{t.footer}</b><span>Power BI + Google Sheets</span></div></footer>
  </main>;
}
