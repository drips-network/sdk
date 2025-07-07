

export const index = 10;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/drip-lists/update-viem/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/10.C_OQQveQ.js","_app/immutable/chunks/62BVG-0M.js","_app/immutable/chunks/IHki7fMi.js"];
export const stylesheets = ["_app/immutable/assets/10.DhGtm3er.css"];
export const fonts = [];
