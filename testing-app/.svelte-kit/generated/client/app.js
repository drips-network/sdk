export { matchers } from './matchers.js';

export const nodes = [
	() => import('./nodes/0'),
	() => import('./nodes/1'),
	() => import('./nodes/2'),
	() => import('./nodes/3'),
	() => import('./nodes/4'),
	() => import('./nodes/5'),
	() => import('./nodes/6'),
	() => import('./nodes/7'),
	() => import('./nodes/8'),
	() => import('./nodes/9'),
	() => import('./nodes/10'),
	() => import('./nodes/11'),
	() => import('./nodes/12'),
	() => import('./nodes/13'),
	() => import('./nodes/14'),
	() => import('./nodes/15')
];

export const server_loads = [];

export const dictionary = {
		"/": [2],
		"/collect": [3],
		"/donations": [4],
		"/donations/continuous-ethers": [5],
		"/donations/continuous-viem": [6],
		"/donations/one-time-ethers": [7],
		"/donations/one-time-viem": [8],
		"/drip-lists": [9],
		"/drip-lists/create-ethers": [10],
		"/drip-lists/create-viem": [11],
		"/drip-lists/get": [12],
		"/drip-lists/update-ethers": [13],
		"/drip-lists/update-viem": [14],
		"/utils": [15]
	};

export const hooks = {
	handleError: (({ error }) => { console.error(error) }),
	
	reroute: (() => {}),
	transport: {}
};

export const decoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.decode]));

export const hash = false;

export const decode = (type, value) => decoders[type](value);

export { default as root } from '../root.svelte';