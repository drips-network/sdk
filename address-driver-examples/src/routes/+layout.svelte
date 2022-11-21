<script>
	import Header from './Header.svelte';
	import './styles.css';
</script>

<div class="app">
	<Header />

	<main>
		<slot />
	</main>

	<footer>
		<p>
			The code is for demonstration purposes only - <strong>not for production</strong>.
		</p>
		<p class="copywrite">
			Developed by the <a class="radicle" href="https://radicle.xyz/">Radicle</a>
			<a href="https://discord.com/channels/841318878125490186/930862758017245215"
				><span class="funding">Drips</span></a
			> Team 🖤
		</p>
	</footer>
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 1rem;
		width: 100%;
		max-width: 64rem;
		margin: 0 auto;
		box-sizing: border-box;
	}

	footer {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 12px;
	}

	footer a {
		font-weight: bold;
	}

	.funding {
		color: rgb(50, 136, 235);
	}

	.radicle {
		color: rgb(0, 207, 42);
	}

	@media (min-width: 480px) {
		footer {
			padding: 12px 0;
		}
	}
</style>
