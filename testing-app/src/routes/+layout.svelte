<script>
  import {page} from '$app/stores';
  import WalletConnect from '$lib/components/WalletConnect.svelte';

  const tabs = [
    {name: 'Drip Lists', path: '/drip-lists'},
    {name: 'Donations', path: '/donations'},
    {name: 'Collect', path: '/collect'},
    {name: 'Utils', path: '/utils'},
  ];
</script>

<div class="container">
  <header class="header">
    <div class="header-content">
      <h1>🚰 DRIPS SDK TESTING APP 🚰</h1>
      <p>Explore the Drips SDK through a simple web interface</p>
    </div>
    <div class="wallet-section">
      <WalletConnect />
    </div>
  </header>

  <nav class="nav">
    <ul>
      <li><a href="/" class:active={$page.url.pathname === '/'}>Home</a></li>
      {#each tabs as tab}
        <li>
          <a
            href={tab.path}
            class:active={$page.url.pathname.startsWith(tab.path)}
          >
            {tab.name}
          </a>
        </li>
      {/each}
    </ul>
  </nav>

  <div class="warning-banner">
    <div class="warning-title">⚠️ WARNING: TESTING APP ONLY ⚠️</div>
    <div class="warning-text">
      DO NOT USE WITH REAL FUNDS! This is an exploration and testing application
      only.<br />
      Use with caution and only connect wallets with test funds. This app is NOT
      safe for production use.
    </div>
  </div>

  <main class="content">
    <slot />
  </main>
</div>

<style>
  :global(body) {
    font-family: 'Courier New', monospace;
    background-color: #c0c0c0;
    margin: 0;
    padding: 0;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    background-color: #c0c0c0;
    min-height: 100vh;
  }

  .header {
    background-color: #008080;
    color: white;
    padding: 20px;
    border-bottom: 3px solid #000080;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
  }

  .header-content {
    text-align: center;
  }

  .header h1 {
    margin: 0;
    font-size: 24px;
    text-shadow: 2px 2px 0px #000000;
  }

  .wallet-section {
    display: flex;
    justify-content: center;
    width: 100%;
  }

  .nav {
    background-color: #808080;
    border-bottom: 2px solid #000000;
    padding: 0;
  }

  .nav ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
  }

  .nav li {
    border-right: 2px solid #000000;
  }

  .nav li:first-child {
    border-left: 2px solid #000000;
  }

  .nav li:last-child {
    border-right: 2px solid #000000;
  }

  .nav a {
    display: block;
    padding: 15px 25px;
    text-decoration: none;
    color: #000000;
    background-color: #c0c0c0;
    border: 2px outset #c0c0c0;
    font-weight: bold;
  }

  .nav a:hover {
    background-color: #e0e0e0;
  }

  .nav a.active {
    background-color: #ffffff;
    border: 2px inset #c0c0c0;
  }

  .warning-banner {
    background-color: #ff4444;
    color: white;
    padding: 15px 20px;
    margin: 10px;
    border: 3px solid #cc0000;
    border-radius: 5px;
    text-align: center;
    font-weight: bold;
    font-size: 16px;
    box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.3);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
    100% {
      opacity: 1;
    }
  }

  .warning-banner .warning-title {
    font-size: 20px;
    margin-bottom: 8px;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
  }

  .warning-banner .warning-text {
    font-size: 14px;
    line-height: 1.4;
  }

  .content {
    padding: 20px;
    background-color: #ffffff;
    margin: 10px;
    border: 2px inset #c0c0c0;
    min-height: 500px;
  }
</style>
