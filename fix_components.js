const fs = require('fs');
let sr = fs.readFileSync('apps/storefront/src/components/sections/SectionRenderer.tsx', 'utf8');
sr = sr.replace(/content=\{section\.content\}/g, 'content={section.content || {}}');
sr = sr.replace(/content=\{section\.content as any\}/g, 'content={(section.content || {}) as any}');
sr = sr.replace(/style=\{section\.style\}/g, 'style={section.style || {}}');
sr = sr.replace(/settings=\{section\.settings\}/g, 'settings={section.settings || {}}');
fs.writeFileSync('apps/storefront/src/components/sections/SectionRenderer.tsx', sr);

let pgs = fs.readFileSync('apps/storefront/src/components/sections/ProductGridSection.tsx', 'utf8');
pgs = pgs.replace('export function ProductGridSection({ content, style }: { content: Record<string, any>, style?: any }) {', 'export function ProductGridSection({ content, style }: { content: Record<string, any>, style?: any }) {\n  content = content || {};\n  style = style || {};');
fs.writeFileSync('apps/storefront/src/components/sections/ProductGridSection.tsx', pgs);
