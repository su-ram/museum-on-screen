import { searchAll } from "./index.js";

const q = process.argv[2] ?? "monet";
const { artworks, errors } = await searchAll({ query: q, limit: 5 });
for (const a of artworks) console.log(`[${a.source}] ${a.title} — ${a.artist}\n   ${a.originalImageUrl}`);
console.log(`\n${artworks.length} results`, Object.keys(errors).length ? errors : "");
