

export const index = 4;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/donations/one-time-viem/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/4.B91Ry-vX.js","_app/immutable/chunks/62BVG-0M.js","_app/immutable/chunks/IHki7fMi.js"];
export const stylesheets = ["_app/immutable/assets/4.crwMbBlP.css"];
export const fonts = [];
