

export const index = 3;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/donations/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/3.6XyjXGPy.js","_app/immutable/chunks/62BVG-0M.js","_app/immutable/chunks/IHki7fMi.js","_app/immutable/chunks/D3xHD3xP.js","_app/immutable/chunks/BTqfQ_O8.js"];
export const stylesheets = ["_app/immutable/assets/3.BDcQWZi5.css"];
export const fonts = [];
