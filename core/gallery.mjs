// What the gallery shows: every part on every body, every base form, the
// user's own pets, expressions, props and evolved forms.
// Returns { title, columns: [label], rows: [{ label, cells: [{ art, pose }] }] };
// pose sets Rig channels (expressions, props, seated lift) for that cell.
import { compose, LIBRARY, EYE_EXPRESSIONS, MOUTH_EXPRESSIONS } from "./compose.mjs"
import { FORMS } from "../forms/forms.mjs"

// Each body row borrows a base form's colours so the sheet reads as a cast,
// not one colour repeated.
const ROW_FORMS = ["ember", "slate", "prism", "mochi", "jinx", "tide", "shell", "drift", "lyra", "bit"]

function rowLook(i, body) {
  const form = FORMS[ROW_FORMS[i % ROW_FORMS.length]]
  return { body, eyes: "dot", mouth: "smile", topper: "none", accessories: [], pattern: "none",
           palette: form.look.palette.hashed ? { body: "#8FB8DE" } : form.look.palette }
}

// Poses that show a pet at work and at play (the gallery's "action" rows).
export const POSES = {
  idle: {},
  working: { seat: "chair", desk: "laptopKeysL", lift: -3, eyes: "open", mouth: "tongue" },
  shell: { seat: "chair", desk: "terminalOn", lift: -3, mouth: "tongue" },
  thinking: { over: "thought2", eyes: "up", gazeX: -0.6, gazeY: -0.6 },
  needsYou: { hand: "signQ", eyes: "wide", mouth: "o" },
  done: { eyes: "happy", mouth: "grin", armL: 70, armR: 70 },
  sleeping: { eyes: "closed", mouth: "base", over: "zzz2", sy: 0.94 },
  reading: { hand: "magnifier", eyes: "open", gazeX: 0.6, gazeY: 0.3 }
}

const cell = (art, pose) => ({ art, pose: pose || {} })

export const SECTIONS = ["forms", "mine", "evolved", "actions", "expressions", "props", "bodies", "eyes", "mouths", "toppers", "accessories", "patterns"]

export function build(section, theme, pets) {
  const bodies = Object.keys(LIBRARY.bodies)
  const names = Object.keys(FORMS)
  if (section === "forms") {
    return { title: "Base forms", columns: names.map(n => FORMS[n].label),
             rows: [{ label: "", cells: names.map(n => cell(compose(FORMS[n].look, theme, n))) },
                    { label: "", cells: names.map(n => cell(compose(FORMS[n].look, theme, n), POSES.working)) }] }
  }
  if (section === "evolved") {
    return { title: "Evolved forms", columns: names.map(n => FORMS[n].label + " → " + FORMS[n].evolution),
             rows: [{ label: "", cells: names.map(n => cell(compose(Object.assign({}, FORMS[n].look, { evolution: FORMS[n].evolution }), theme, n, { evolved: true }))) }] }
  }
  if (section === "mine") {
    const list = pets || []
    const evo = p => compose(p.look, theme, p.provider, { evolved: true })
    return { title: "Your pets", columns: list.map(p => p.name),
             rows: [{ label: "", cells: list.map(p => cell(compose(p.look, theme, p.provider))) },
                    { label: "", cells: list.map(p => cell(compose(p.look, theme, p.provider), POSES.working)) },
                    { label: "", cells: list.map(p => cell(evo(p))) }] }
  }
  if (section === "actions") {
    const poses = Object.keys(POSES)
    return { title: "Poses", columns: poses,
             rows: names.map(n => ({ label: FORMS[n].label, cells: poses.map(k => cell(compose(FORMS[n].look, theme, n), POSES[k])) })) }
  }
  if (section === "expressions") {
    return { title: "Expressions (eyes, then mouths)", columns: [...EYE_EXPRESSIONS, ...MOUTH_EXPRESSIONS],
             rows: ["ember", "slate", "jinx", "shell"].map(n => {
               const art = compose(FORMS[n].look, theme, n)
               return { label: FORMS[n].label, cells: [...EYE_EXPRESSIONS.map(e => cell(art, { eyes: e })), ...MOUTH_EXPRESSIONS.map(m => cell(art, { mouth: m }))] }
             }) }
  }
  if (section === "props") {
    const art = compose(FORMS.ember.look, theme, "claude")
    const props = Object.keys(art.props)
    const pose = name => {
      const p = art.props[name]
      return { [p.slot]: name, lift: p.slot === "seat" && name === "chair" ? -3 : 0 }
    }
    const rows = []
    for (let i = 0; i < props.length; i += 12)
      rows.push({ label: "", cells: props.slice(i, i + 12).map(n => cell(art, Object.assign(pose(n), { caption: n }))) })
    return { title: "Props", columns: [], rows }
  }
  const table = { eyes: "eyes", mouths: "mouths", toppers: "toppers", accessories: "accessories", patterns: "patterns" }[section]
  if (section === "bodies") {
    return { title: "Bodies", columns: bodies.map(b => LIBRARY.bodies[b].label),
             rows: ROW_FORMS.slice(0, 4).map((f, i) => ({ label: FORMS[f].label, cells: bodies.map(b => cell(compose(rowLook(i, b), theme))) })) }
  }
  if (!table) return { title: "", columns: [], rows: [] }
  const parts = Object.keys(LIBRARY[table]).filter(k => k !== "none")
  const apply = (look, part) => {
    if (table === "eyes") look.eyes = part
    else if (table === "mouths") look.mouth = part
    else if (table === "toppers") look.topper = part
    else if (table === "accessories") look.accessories = [part]
    else look.pattern = part
    return look
  }
  return {
    title: section.charAt(0).toUpperCase() + section.slice(1) + " on every body",
    columns: parts.map(p => LIBRARY[table][p].label + (LIBRARY[table][p].unlockLevel ? ` (Lv ${LIBRARY[table][p].unlockLevel})` : "")),
    rows: bodies.map((b, i) => ({ label: LIBRARY.bodies[b].label, cells: parts.map(p => cell(compose(apply(rowLook(i, b), p), theme))) }))
  }
}
