# Drips JS SDK
A Javascript SDK for 💦 [drips.network](https://drips.network/). 

Drips is an 💎 Ethereum protocol for creating continuous funding streams (Drips) and splitting funding streams among multiple recipients. With Drips there are no 💸 commissions, predatory 👔 middle-men, or 🏦 banks involved. 

Drips is a part of the [Radicle](https://radicle.xyz/) ecosystem of projects. See the [Drips docs](https://docs.drips.network/) for more details about the Drips protocol and how to use it.

### How To Use This SDK

The Drips SDK is intended to be used by developers primarily as a Javascript package installed into their projects. We plan to add the project to npm soon, but for now, users can include it into their project's package.json as a dependency by using this command:

`npm i https://github.com/radicle-dev/drips-js-sdk#v0.1.1`

### API Documentation in TypeDoc

The SDK contains API/type-level documentation, generated using TypeDoc.

To browse it, clone this project to your local machine, and open docs/index.html in your local web browser.

### Getting Started With Examples

The `examples/web` directory contains example code that illustrates how Drips can be incorporated into a web project. To get started exploring the Drips SDK through these examples, we recommend first cloning repository to your local machine:

`git clone https://github.com/radicle-dev/drips-js-sdk.git`

Now change directory to the directory for the web example:

`cd examples/web`

Next, you'll need to install the javascript dependencies for the example project using npm (you'll need to make sure npm installed on your machine before completing this step):

`npm i`

Once the dependencies have been installed, you can start Svelte. Svelte is a lightweight local web server:

`npm run dev`

You should now have a web server running the web-based Drips SDK example locally. Open your web browser and go to [http://localhost:8080/index.html](http://localhost:8080/index.html). You should see a simple UI that will let you explore the majority of the Drips SDK functionality. A few notes:

1. Take a look at the code in examples/web/src/App.svelte to see how this example web app is utilizing DripsClient, and play around with the code in App.svelte and the other *.svelte fiiles in src/components.

2. By default, the example is set to work with the Drips contracts on the Rinkeby test network. If you want to use a different network for testing, you'll need to change the `networkToUse` variable in App.svelte.

3. You will need to click on the `Connect` button in the UI to connect your MetaMask or WalletConnect wallet before the other functionality will be enabled.

Enjoy!

### Related Resources

The [Technical Overview](https://docs.drips.network/docs/for-developers/technical-overview) page from the Drips documentation gives a concise high-level overview of how Drips works, as well as providing links to all of the project's repositories. 

The [Smart Contract and Subgraph Details][https://docs.drips.network/docs/for-developers/smart-contract-and-subgraph-details] page from the Drips docuemntation provides an aggregated list of details for all of the project's smart contracts and subgraphs for all networks where Drips has been deployed.

