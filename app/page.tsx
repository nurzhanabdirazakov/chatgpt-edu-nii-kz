"use client";

import { useMemo, useState } from "react";
import { institutes, type Institute } from "./data";

type Lang = "ru" | "kz";
type SortKey = "name" | "region" | "licenses" | "started" | "activated" | "rate";

const POWER_BI = { started: 240, activated: 190, updated: "13.07.2026, 11:07" };

const copy = {
  ru: {
    eyebrow: "Национальный мониторинг • Казахстан",
    title: "Подключение научно-исследовательских институтов к ChatGPT Edu",
    intro: "Открытая сводка по договорам, выдаче доступов и активации сотрудников научных организаций.",
    updated: "Данные Power BI обновлены",
    sheet: "Снимок Google Sheets: 16.07.2026",
    total: "Всего НИИ", licenses: "Заявленные места", started: "Получили логин", activated: "Активировали", rate: "Нац. активация",
    signed: "Подписали договор", unsigned: "Не подписали", of: "из", institutes: "организаций",
    timeline: "Прогресс проекта", contracts: "Договоры", access: "Доступы", activation: "Активация", complete: "завершено",
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
    total: "Барлық ҒЗИ", licenses: "Сұралған орындар", started: "Логин алды", activated: "Белсендірді", rate: "Ұлттық белсендіру",
    signed: "Шартқа қол қойды", unsigned: "Қол қоймады", of: "ішінен", institutes: "ұйым",
    timeline: "Жоба барысы", contracts: "Шарттар", access: "Қолжетімділік", activation: "Белсендіру", complete: "аяқталды",
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
  return value.replace(/^\s*["“]+|["”]+\s*$/g, "").replace(/\s+/g, " ").trim();
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
  const t = copy[lang];

  const signed = institutes.filter(i => i.signed);
  const unsigned = institutes.filter(i => !i.signed).sort((a, b) => b.licenses - a.licenses);
  const totalLicenses = institutes.reduce((sum, i) => sum + i.licenses, 0);
  const nationalRate = totalLicenses > 0 ? POWER_BI.activated / totalLicenses : 0;
  const regions = [...new Set(institutes.map(i => i.region))].sort((a, b) => a.localeCompare(b));
  const selected = institutes.find(i => i.id === selectedId) ?? institutes[0];
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
  }, [query, region, status, sort, lang]);

  function changeSort(key: SortKey) {
    setSort(current => current.key === key ? { key, dir: current.dir === 1 ? -1 : 1 } : { key, dir: key === "name" || key === "region" ? 1 : -1 });
  }

  return <main>
    <header className="topbar">
      <div className="shell nav-inner">
        <a className="brand" href="#top" aria-label="ChatGPT Edu NII Dashboard"><span className="brand-mark">NII</span><span>ChatGPT Edu</span></a>
        <div className="language" aria-label="Language switcher">
          <button className={lang === "ru" ? "active" : ""} onClick={() => setLang("ru")}>RU</button>
          <button className={lang === "kz" ? "active" : ""} onClick={() => setLang("kz")}>KZ</button>
        </div>
      </div>
    </header>

    <section className="hero" id="top">
      <div className="shell hero-grid">
        <div>
          <div className="eyebrow"><span />{t.eyebrow}</div>
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
          <div className="data-stamp"><b>{t.updated}: {POWER_BI.updated}</b><span>{t.sheet}</span></div>
        </div>
        <div className="hero-meter" aria-label={`${Math.round(nationalRate * 100)}%`}>
          <div className="ring" style={{ "--progress": `${nationalRate * 360}deg` } as React.CSSProperties}><div><strong>{Math.round(nationalRate * 100)}%</strong><span>{t.activation}</span></div></div>
          <small>{POWER_BI.activated} / {formatNumber(totalLicenses, lang)}</small>
        </div>
      </div>
    </section>

    <div className="shell dashboard">
      <section className="kpi-grid" aria-label="Key metrics">
        {[
          ["01", t.total, institutes.length, "navy"], ["02", t.licenses, totalLicenses, "blue"],
          ["03", t.started, POWER_BI.started, "sky"], ["04", t.activated, POWER_BI.activated, "green"],
          ["05", t.rate, `${Math.round(nationalRate * 100)}%`, "amber"],
        ].map(([no, label, value, tone]) => <article className={`kpi ${tone}`} key={String(no)}><span>{no}</span><p>{label}</p><strong>{typeof value === "number" ? formatNumber(value, lang) : value}</strong></article>)}
      </section>

      <section className="contract-grid">
        <article className="card contract-card">
          <div className="section-heading"><div><span className="kicker">01 — ONBOARDING</span><h2>{t.contracts}</h2></div><b>{Math.round(signed.length / institutes.length * 100)}%</b></div>
          <div className="contract-split"><div className="signed"><strong>{signed.length}</strong><span>{t.signed}</span></div><div className="unsigned"><strong>{unsigned.length}</strong><span>{t.unsigned}</span></div></div>
          <div className="progress"><i style={{ width: `${signed.length / institutes.length * 100}%` }} /></div>
          <p className="muted">{signed.length} {t.of} {institutes.length} {t.institutes}</p>
        </article>

        <article className="card timeline-card">
          <div className="section-heading"><div><span className="kicker">02 — ROADMAP</span><h2>{t.timeline}</h2></div><b>{Math.round(nationalRate * 100)}%</b></div>
          <div className="timeline">
            <div className="done"><span>1</span><b>{t.contracts}</b><small>50% {t.complete}</small></div>
            <div className="done"><span>2</span><b>{t.access}</b><small>{POWER_BI.started}</small></div>
            <div><span>3</span><b>{t.activation}</b><small>{Math.round(nationalRate * 100)}% {t.complete}</small></div>
          </div>
        </article>
      </section>

      <section className="card profile-card">
        <div className="section-heading"><div><span className="kicker">03 — SPOTLIGHT</span><h2>{t.profile}</h2></div></div>
        <label className="profile-search"><span>⌕</span><input list="institutes" defaultValue={nameOf(selected)} onChange={e => { const found = institutes.find(i => nameOf(i) === e.target.value); if (found) setSelectedId(found.id); }} placeholder={t.profileHint} /></label>
        <datalist id="institutes">{institutes.slice().sort((a,b) => nameOf(a).localeCompare(nameOf(b))).map(i => <option key={i.id} value={nameOf(i)} />)}</datalist>
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
        <article className="card ranking"><div className="section-heading"><div><span className="kicker">04 — PERFORMANCE</span><h2>{t.leaders}</h2><p>{t.leaderHint}</p></div><b>{leaders.length}</b></div><div className="rank-list">{leaders.map(row => <BarRow key={row.id} row={row} lang={lang} tone="good" />)}</div></article>
        <article className="card ranking"><div className="section-heading"><div><span className="kicker">05 — FOLLOW-UP</span><h2>{t.attention}</h2><p>{t.attentionHint}</p></div><b>{attention.length}</b></div><div className="rank-list">{attention.map(row => <BarRow key={row.id} row={row} lang={lang} tone="bad" />)}</div></article>
      </section>

      <section className="card table-card">
        <div className="section-heading"><div><span className="kicker">06 — DIRECTORY</span><h2>{t.fullList}</h2><p>{t.tableNote}</p></div><b>{filtered.length}</b></div>
        <div className="filters"><label><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder={t.search} /></label><select value={region} onChange={e => setRegion(e.target.value)}><option value="all">{t.allRegions}</option>{regions.map(r => <option key={r}>{r}</option>)}</select><select value={status} onChange={e => setStatus(e.target.value)}><option value="all">{t.allStatuses}</option><option value="excellent">{t.excellent}</option><option value="track">{t.onTrack}</option><option value="early">{t.early}</option><option value="attention">{t.needsAttention}</option></select></div>
        <div className="table-wrap"><table><thead><tr><th>№</th><th><button onClick={() => changeSort("name")}>{t.name} ↕</button></th><th><button onClick={() => changeSort("region")}>{t.region} ↕</button></th><th><button onClick={() => changeSort("licenses")}>{t.licenses} ↕</button></th><th><button onClick={() => changeSort("started")}>{t.started} ↕</button></th><th><button onClick={() => changeSort("activated")}>{t.activated} ↕</button></th><th><button onClick={() => changeSort("rate")}>{t.rate} ↕</button></th><th>{t.status}</th></tr></thead><tbody>{filtered.map(row => <tr key={row.id} onClick={() => { setSelectedId(row.id); document.querySelector(".profile-card")?.scrollIntoView({behavior:"smooth"}); }}><td>{row.id}</td><td><strong>{nameOf(row)}</strong><small>{row.district}</small></td><td>{row.region}</td><td>{formatNumber(row.licenses, lang)}</td><td>{row.started}</td><td>{row.activated}</td><td><b>{row.licenses ? `${Math.round(ratio(row)*100)}%` : "—"}</b></td><td><span className={`pill ${statusFor(row,lang).key}`}>{statusFor(row,lang).label}</span></td></tr>)}</tbody></table></div>
      </section>

      <section className="card unsigned-card">
        <div className="section-heading"><div><span className="kicker">07 — ONBOARDING QUEUE</span><h2>{t.unsignedTitle}</h2><p>{t.unsignedHint}</p></div><b>{unsigned.length}</b></div>
        <div className="unsigned-grid">{unsigned.map(row => <button key={row.id} onClick={() => { setSelectedId(row.id); document.querySelector(".profile-card")?.scrollIntoView({behavior:"smooth"}); }}><span>{String(row.id).padStart(2,"0")}</span><div><strong>{shortName(nameOf(row))}</strong><small>{row.region} · {row.district}</small></div><b>{formatNumber(row.licenses,lang)}</b></button>)}</div>
      </section>

      <aside className="disclaimer"><div>!</div><p><strong>{t.disclaimerTitle}</strong>{t.disclaimer}<b>{t.updated}: {POWER_BI.updated}</b></p></aside>
    </div>

    <footer><div className="shell"><b>{t.footer}</b><span>Power BI + Google Sheets</span></div></footer>
  </main>;
}
