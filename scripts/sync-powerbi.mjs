// Read the PUBLIC, RENDERED report only. No Power BI API or credentials.
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const REPORT_URL = 'https://app.powerbi.com/view?r=eyJrIjoiMmI5ZGE3NjctYmVkYi00MmUyLTk5YmEtMzQyOTJmZThhNTE0IiwidCI6IjQ0YWY2MTM1LTFmMTYtNGU3ZS04MzViLTAwYWY1MTdkZTNmNyIsImMiOjl9';
const OUTPUT = new URL('../public/data/power-bi.json', import.meta.url);
const source = await readFile(new URL('../app/data.ts', import.meta.url), 'utf8');
const marker = 'export const institutes: Institute[] = ';
if (!source.includes(marker)) throw new Error('Catalogue format changed');
const catalogue = JSON.parse(source.slice(source.indexOf('[', source.indexOf(marker) + marker.length), source.lastIndexOf('];') + 1));
function normalize(s) {
  return s.toLowerCase().replace(/ё/g, 'е')
    .replace(/республиканское\s+государственное\s+предприятие\s+на\s+праве\s+хозяйственного\s+ведения/gu, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
function match(name) {
  const a = normalize(name);
  const scores = catalogue.map(item => {
    const scores = [item.nameRu, item.nameKz].map(n => {
      const b = normalize(n);
      if (a === b) return 1;
      if (a.includes(b) || b.includes(a)) return Math.min(a.length,b.length)/Math.max(a.length,b.length);
      const aa = new Set(a.split(' ').filter(w=>w.length>2));
      const bb = new Set(b.split(' ').filter(w=>w.length>2));
      return [...aa].filter(w=>bb.has(w)).length / Math.max(aa.size,bb.size,1);
    });
    return {id:item.id,score:Math.max(...scores)};
  }).sort((a,b)=>b.score-a.score);
  if (scores[0].score < .78 || scores[0].score-scores[1].score < .12)
    throw new Error(`Ambiguous institute: ${name}; candidates ${JSON.stringify(scores.slice(0,2))}`);
  return scores[0].id;
}
const browser = await chromium.launch({headless:true});
const context = await browser.newContext({locale:'ru-RU',viewport:{width:2200,height:10000}});
const page = await context.newPage();
page.setDefaultTimeout(45000);
await mkdir('sync-evidence',{recursive:true});
async function readTable(index,label) {
  const grids = page.getByRole('grid').filter({has:page.getByRole('columnheader',{name:'Область',exact:true})});
  if (await grids.count() !== 2) throw new Error('Expected two access tables');
  const grid = grids.nth(index);
  await grid.hover();
  await page.getByRole('button',{name:'Режим фокусировки',exact:true}).filter({visible:true}).click();
  const focused = page.getByRole('grid').filter({visible:true});
  await focused.waitFor({state:'visible'});
  for(let i=0;i<150;i++) {
    const collapsed = focused.getByRole('button',{name:'Collapsed',exact:true});
    if (!await collapsed.count()) break;
    await collapsed.first().click();
    await page.waitForTimeout(350);
  }
  await page.waitForTimeout(1000);
  if (await focused.getByRole('button',{name:'Collapsed',exact:true}).count()) throw new Error('Unexpanded hierarchy');
  const table = await focused.evaluate(g => ({
    expected:Number(g.getAttribute('aria-rowcount')),
    rows:[...g.querySelectorAll('[role=row]')].map(r=>({
      name:r.querySelector('[role=rowheader]')?.textContent?.trim(),
      parent:!!r.querySelector('[role=rowheader] [role=button]'),
      values:[...r.querySelectorAll('[role=gridcell]')].map(c=>c.textContent.trim())
    }))
  }));
  await writeFile(`sync-evidence/${label}.json`,JSON.stringify(table,null,2));
  if (!table.expected || table.rows.length < table.expected) throw new Error(`Incomplete ${label}: ${table.rows.length}/${table.expected}`);
  const result = {};
  let total;
  for (const row of table.rows) {
    if (!row.name || row.parent) continue;
    const value=Number(row.values[0]?.replace(/[\s\u00a0]/g,''));
    if (!Number.isSafeInteger(value)||value<0) throw new Error(`Invalid value: ${row.name}`);
    if(row.name==='Итого') {total=value;continue;}
    const id=match(row.name);
    if(id in result) throw new Error(`Duplicate institute ${id}`);
    result[id]=value;
  }
  if(Object.keys(result).length<30 || !total) throw new Error(`Incomplete ${label}`);
  await page.getByRole('button',{name:'Назад к отчету',exact:true}).click();
  await page.waitForTimeout(700);
  return {result,total};
}
try {
  await page.goto(REPORT_URL,{waitUntil:'domcontentloaded',timeout:120000});
  await page.getByRole('grid').first().waitFor({state:'visible',timeout:120000});
  await page.getByRole('button',{name:'Следующая страница',exact:true}).click();
  await page.getByText('Педагоги, которые получили логин и пароль',{exact:true}).waitFor({state:'visible',timeout:120000});
  await page.waitForTimeout(3000);
  const timestamp=(await page.locator('body').innerText()).match(/\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}:\d{2}/)?.[0];
  if(!timestamp) throw new Error('Missing source timestamp');
  const received=await readTable(0,'received');
  const activated=await readTable(1,'activated');
  const sum=Object.values(activated.result).reduce((a,b)=>a+b,0);
  if(sum!==activated.total) throw new Error(`Activated total mismatch: ${sum}/${activated.total}`);
  const rows=Object.fromEntries(catalogue.map(i=>[i.id,[received.result[i.id]??0,activated.result[i.id]??0]]));
  for(const [id,[r,a]] of Object.entries(rows)) if(a>r) throw new Error(`Activated exceeds received: ${id}`);
  const snapshot={schemaVersion:2,metrics:['received','activated'],activated:sum,receivedTotal:received.total,
    receivedRowSum:Object.values(received.result).reduce((a,b)=>a+b,0),
    updated:timestamp.replace(' ', ', '),checkedAt:new Date().toISOString(),rows};
  await writeFile(OUTPUT,JSON.stringify(snapshot,null,2)+'\n');
  console.log(`Validated ${Object.keys(rows).length} institutes, ${sum} activated. Source: ${timestamp}`);
} catch(error) {
  await page.screenshot({path:'sync-evidence/error.png'}).catch(()=>{});
  throw error;
} finally {await browser.close();}
