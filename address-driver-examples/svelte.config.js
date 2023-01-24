import adapter from '@sveltejs/adapter-auto';
import preprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://github.com/sveltejs/svelte-preprocess
	// for more information about preprocessors
	preprocess: preprocess(),

	kit: {
		adapter: adapter()
	},

	build: {
		target: 'es2020'
	},
	optimizeDeps: {
		esbuildOptions: {
			target: 'es2020'
		}
	}
};

export default config;
