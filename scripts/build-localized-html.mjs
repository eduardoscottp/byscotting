import { readFile, writeFile, mkdir } from "node:fs/promises";
import ts from "typescript";

// Reuse the page copy so the initial HTML and React metadata stay in sync.
const source = await readFile(new URL("../src/copy.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
});
const { copy } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
const escape = (text) => text.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
let html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
html = html.replace('<html lang="es">', '<html lang="en">')
  .replace(/<title>[^<]*<\/title>/, `<title>${escape(copy.en.title)}</title>`);
for (const [attribute, name, value] of [
  ["name", "description", copy.en.metaDescription],
  ["property", "og:title", copy.en.ogTitle],
  ["property", "og:description", copy.en.ogDescription],
  ["property", "og:url", "https://byscotting.com/en"],
]) {
  html = html.replace(new RegExp(`<meta\\s+${attribute}="${name}"\\s+content="[^"]*"\\s*/?>`),
    `<meta ${attribute}="${name}" content="${escape(value)}" />`);
}
html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, '<link rel="canonical" href="https://byscotting.com/en" />');
await mkdir(new URL("../dist/en/", import.meta.url), { recursive: true });
await writeFile(new URL("../dist/en/index.html", import.meta.url), html);
