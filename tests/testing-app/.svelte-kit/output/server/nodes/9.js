

export const index = 9;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/drip-lists/update-ethers/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/9.B2KW8haW.js","_app/immutable/chunks/62BVG-0M.js","_app/immutable/chunks/IHki7fMi.js"];
export const stylesheets = ["_app/immutable/assets/9.nkHczZI2.css"];
export const fonts = [];
