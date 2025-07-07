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
	() => import('./nodes/14')
];

export const server_loads = [];

export const dictionary = {
		"/": [2],
		"/donations": [3],
		"/donations/continuous-ethers": [4],
		"/donations/continuous-viem": [5],
		"/donations/one-time-ethers": [6],
		"/donations/one-time-viem": [7],
		"/drip-lists": [8],
		"/drip-lists/create-ethers": [9],
		"/drip-lists/create-viem": [10],
		"/drip-lists/get": [11],
		"/drip-lists/update-ethers": [12],
		"/drip-lists/update-viem": [13],
		"/utils": [14]
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