# Drips JavaScript SDK

The JavaScript SDK for 💦 [drips.network](https://drips.network/).

Drips is an 💎 Ethereum protocol for creating continuous funding streams (Drips) and splitting funding streams among multiple recipients. With Drips, no 💸 commissions, predatory 👔 middle-men, or 🏦 banks are involved.

Drips is a part of the [Radicle](https://radicle.xyz/) ecosystem of projects. See the [docs](https://v2.docs.drips.network/docs/whats-a-drip.html) for more details about the Drips protocol and and its use.

## Installing

We plan to add the project to npm soon, but you can now include it into your project's `package.json` as a dependency by using this command:

```bash
npm install https://github.com/radicle-dev/drips-js-sdk#v2
```

## Documentation

The SDK contains documentation generated using [TypeDoc](https://typedoc.org/).

To browse it locally, clone the project, install the project's dependencies, and open `docs/index.html` in your web browser.

Alternatively, visit the hosted version [here](https://melodious-bombolone-ca37e0.netlify.app/).

## Getting Started With Examples

The `examples-app` directory contains example code that illustrates how Drips can be incorporated into a web project. To get started exploring the Drips SDK through these examples, we recommend first cloning repository to your local machine:

```bash
git clone -b v2 https://github.com/radicle-dev/drips-js-sdk.git
```

Now change directory to the directory for the web example:

```bash
cd examples-app
```

Next, install the project dependencies for the example app using npm:

```bash
npm install
```

Finally, to start the web-based Drips SDK example locally run:

```bash
npm run dev
```

Open your web browser and go to [localhost](http://localhost:8080). You should see a simple UI that will let you explore most of the Drips SDK functionality.

A few notes:

1. Take a look at the code in `examples-app/src/Header.svelte` to see how this example web app is utilizing the `AddressDriverClient` and the `DripsSubgraphClient`, and play around with the code in all \*.svelte files in src/components.

2. You will need to click on the `Connect` button in the UI to connect your MetaMask or WalletConnect wallet before the other functionality will be enabled.

3. There is a hosted version of the examples-app [here](https://lovely-froyo-8d2419.netlify.app/).

Enjoy!

## Related Resources

The [Technical Overview](https://v2.docs.drips.network/docs/for-developers/technical-overview) page from the Drips documentation gives a concise high-level overview of how Drips works, as well as provides links to all of the project's repositories.

The [Smart Contract and Subgraph Details](https://v2.docs.drips.network/docs/for-developers/smart-contract-and-subgraph-details) page from the Drips documentation provides an aggregated list of details for all of the project's smart contracts and subgraphs for all networks where Drips has been deployed.
