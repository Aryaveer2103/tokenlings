// Dev-only: refreshes the enums in schema/pets.schema.json from the parts
// library, the forms and the evolutions, so the schema never drifts from the
// code (test/config.test.mjs checks it). Run: node tools/gen-schema.mjs
import { readFile, writeFile } from "node:fs/promises"
import { LIBRARY } from "../core/compose.mjs"
import { FORMS, SIGNATURE_MOVES, MOVE_ALIASES } from "../forms/forms.mjs"
import { EVOLUTION_NAMES } from "../assets/parts/evolutions.mjs"

const url = new URL("../schema/pets.schema.json", import.meta.url)
const schema = JSON.parse(await readFile(url, "utf8"))
const pet = schema.properties.pets.items.properties
const look = pet.look.properties
look.body.enum = Object.keys(LIBRARY.bodies)
look.eyes.enum = Object.keys(LIBRARY.eyes)
look.mouth.enum = Object.keys(LIBRARY.mouths)
look.topper.enum = Object.keys(LIBRARY.toppers)
look.pattern.enum = Object.keys(LIBRARY.patterns)
look.accessories.items.enum = Object.keys(LIBRARY.accessories)
look.evolution = { enum: EVOLUTION_NAMES, description: "Which evolved form this pet takes" }
look.evolved = { enum: ["auto", "on", "off"], default: "auto", description: "auto: evolves at level 10 (with progression on)" }
look.variant = { enum: ["auto", "off"], default: "auto", description: "auto: a second, third … pet of the same provider gets its own colours, accessory and a nudge to one trait, seeded from its account folder. off: the pure base form." }
pet.baseForm.enum = Object.keys(FORMS)
pet.signatureMove = { enum: [...SIGNATURE_MOVES, ...Object.keys(MOVE_ALIASES)],
  description: "Double-click plays it. Older names (" + Object.keys(MOVE_ALIASES).join(", ") + ") are read as their successors." }
await writeFile(url, JSON.stringify(schema, null, 2) + "\n")
console.log("schema updated")
