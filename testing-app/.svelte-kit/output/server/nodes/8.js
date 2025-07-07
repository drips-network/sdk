

export const index = 8;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/drip-lists/get/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/8.C8NcTQBU.js","_app/immutable/chunks/62BVG-0M.js","_app/immutable/chunks/IHki7fMi.js"];
export const stylesheets = ["_app/immutable/assets/8.Bzrer8Pn.css"];
export const fonts = [];
