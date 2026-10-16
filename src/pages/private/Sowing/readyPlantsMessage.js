/** WhatsApp "ready plants" message built from capacity board rows. */

const MR_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"]

const CROP_MR = {
  watermelon: "टरबूज",
  papaya: "पपई",
  muskmelon: "खरबूज",
  banana: "केळी",
  chilli: "मिरची",
  chili: "मिरची",
  tomato: "टोमॅटो",
  cucumber: "काकडी",
  marigold: "झेंडू",
  cabbage: "कोबी",
  cauliflower: "फ्लॉवर",
  capsicum: "ढोबळी मिरची",
  brinjal: "वांगी",
  drumstick: "शेवगा",
  onion: "कांदा",
}

const VARIETY_MR = {
  impact: "इम्पॅक्ट",
  prachand: "प्रचंड",
  navkiran: "नवकिरण",
  sweetangel: "स्वीट एंजल",
  simbha: "सिंबा",
  vijay: "विजय",
  redking: "रेडकिंग",
  maxx: "मॅक्स",
  candy: "कँडी",
  force9: "फोर्स 9",
  bahubali: "बाहुबली",
  bahubaliplus: "बाहुबली प्लस",
  layalpur: "लायलपूर",
  virat: "विराट",
  tarzan: "टारझन",
  singham: "सिंघम",
  runner: "रनर",
  marvel: "मार्व्हल",
  melody: "मेलडी",
  vikrum77: "विक्रम 77",
  vikram77: "विक्रम 77",
  "15no": "15 नं",
  taiwan: "तैवान",
  shabnam: "शबनम",
  vasai: "वसई",
}

const TEXT = {
  mr: {
    title: "तयार होणारी रोपे",
    tableHead: "तारीख  वाण  संख्या",
    readyNow: "रेडी मध्ये",
    plants: "रोपे",
    asOf: "दि.",
  },
  en: {
    title: "ready plants",
    tableHead: "Date  Variety  Plants",
    readyNow: "Ready now",
    plants: "plants",
    asOf: "As on",
  },
}

export const LAYOUT_TABLE = "table"
export const LAYOUT_VARIETY = "variety"

function key(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

export function cropName(name, lang) {
  return (lang === "mr" && CROP_MR[key(name)]) || name
}

export function varietyName(name, lang) {
  return (lang === "mr" && VARIETY_MR[key(name)]) || name
}

function digits(text, lang) {
  return lang === "mr" ? String(text).replace(/\d/g, (d) => MR_DIGITS[d]) : String(text)
}

/** DD-MM-YYYY or YYYY-MM-DD → YYYY-MM-DD. */
function ymd(day) {
  const text = String(day || "")
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10)
  const [d, m, y] = text.split("-")
  return y && m && d ? `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}` : ""
}

function plusDays(ymdStr, days) {
  const [y, m, d] = ymdStr.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

function shortDate(ymdStr, lang) {
  const [, m, d] = ymdStr.split("-")
  return digits(`${d}/${m}`, lang)
}

function longDate(ymdStr, lang) {
  const [y, m, d] = ymdStr.split("-")
  return digits(`${d}/${m}/${y}`, lang)
}

/** Default layout: day-slot crops read best as one date table, longer slots as a block per variety. */
export function defaultLayout(rows) {
  const oneDay = rows.filter((row) => Number(row.slotDays) === 1).length
  return oneDay * 2 >= rows.length ? LAYOUT_TABLE : LAYOUT_VARIETY
}

/**
 * Dated ready counts for one variety, from today to `days` ahead.
 * A slot that started before today is dated today; overdue plants ride on the current slot.
 */
export function readyLines(row, { today, days, count }) {
  const last = days ? plusDays(today, days) : null
  const lines = new Map()
  for (const cell of [row.current, ...(row.upcoming || [])]) {
    if (!cell) continue
    const qty = count === "free" ? Math.max(0, Number(cell.net) || 0) : Number(cell.ready) || 0
    if (qty <= 0) continue
    let date = ymd(cell.startDay) || today
    if (date < today) date = today
    if (last && date > last) continue
    lines.set(date, (lines.get(date) || 0) + qty)
  }
  return [...lines.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, qty]) => ({ date, qty }))
}

/** Crop groups in display order, each with its varieties' lines. Empty varieties are dropped. */
export function messageGroups(rows, { today, days = 30, count = "ready", includeShed = true }) {
  const byCrop = new Map()
  for (const row of rows || []) {
    const lines = readyLines(row, { today, days, count })
    const readyNow = includeShed ? Number(row.stock?.readyNow) || 0 : 0
    if (!lines.length && !readyNow) continue
    if (!byCrop.has(row.plantName)) byCrop.set(row.plantName, [])
    byCrop.get(row.plantName).push({ row, lines, readyNow })
  }
  return [...byCrop.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([plantName, varieties]) => ({
      plantName,
      varieties: varieties.sort((a, b) => a.row.subtypeName.localeCompare(b.row.subtypeName)),
      layout: defaultLayout(varieties.map((v) => v.row)),
    }))
}

function tableBlock(group, lang) {
  const t = TEXT[lang]
  const out = [`*${cropName(group.plantName, lang)} ${t.title}*`]
  for (const v of group.varieties) {
    if (v.readyNow) out.push(`${t.readyNow} ${varietyName(v.row.subtypeName, lang)} = ${v.readyNow} ${t.plants}`)
  }
  const dated = group.varieties
    .flatMap((v) => v.lines.map((line) => ({ ...line, variety: varietyName(v.row.subtypeName, lang) })))
    .sort((a, b) => a.date.localeCompare(b.date) || a.variety.localeCompare(b.variety))
  if (dated.length) {
    out.push(t.tableHead)
    for (const line of dated) out.push(`${shortDate(line.date, lang)} ${line.variety} ${line.qty}`)
  }
  return out.join("\n")
}

function varietyBlocks(group, lang) {
  const t = TEXT[lang]
  return group.varieties.map((v) => {
    const out = [`*${varietyName(v.row.subtypeName, lang)} ${cropName(group.plantName, lang)} ${t.title}*`]
    if (v.readyNow) out.push(`${t.readyNow} = ${v.readyNow} ${t.plants}`)
    for (const line of v.lines) out.push(`${shortDate(line.date, lang)} = ${line.qty} ${t.plants}`)
    return out.join("\n")
  })
}

/**
 * Full message. `layouts` overrides the per-crop layout; `crops` limits which crops are included.
 */
export function buildReadyMessage(rows, options) {
  const { today, lang = "mr", crops = null, layouts = {}, title = "" } = options
  const groups = messageGroups(rows, options).filter((g) => !crops || crops.includes(g.plantName))
  const blocks = []
  if (title) blocks.push(`*${title}*\n${TEXT[lang].asOf} ${longDate(today, lang)}`)
  for (const group of groups) {
    const layout = layouts[group.plantName] || group.layout
    if (layout === LAYOUT_TABLE) blocks.push(tableBlock(group, lang))
    else blocks.push(...varietyBlocks(group, lang))
  }
  return blocks.join("\n\n")
}
