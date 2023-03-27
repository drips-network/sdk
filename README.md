# Drips JavaScript SDK

The JavaScript SDK for 💦 [drips.network](https://drips.network/).

Drips is an 💎 Ethereum protocol for creating continuous funding streams (Drips) and splitting funding streams among multiple recipients. With Drips, no 💸 commissions, predatory 👔 middle-men, or 🏦 banks are involved.

Drips is a part of the [Radicle](https://radicle.xyz/) ecosystem of projects. See the [docs](https://v2.docs.drips.network/docs/whats-a-drip.html) for more details about the Drips protocol and its use.

## Installing

To add the SDK into your project run:

```bash
npm install radicle-dev/drips-js-sdk
```

## Usage

To use the SDK import from `radicle-drips`. For example:

```ts
import { NFTDriverClient } from 'radicle-drips';
```

## API Documentation

You can find the API documentation [here](https://drips-js-sdk-api.netlify.app/).

You can also browse the docs locally:

- Clone the project.
- Run `npm install`.
- Open `docs/index.html` in your web browser.

## Running the Examples Apps

The repository contains two example apps (built with `SvelteKit`) demonstrating how you can start building on Drips with the SDK.
They also serve as "interactive" documentation, covering the major client's operations.
These examples are not production-ready applications and do not demonstrate software engineering best practices in building Svelte apps.

To run the `NFTDriverClient` examples app locally:

- From the project's root dir run `cd nft-driver-examples/`
- Run `npm run dev -- --open`

You can find a hosted version of the `NFTDriverClient` examples app [here](https://nftdriver-examples-app.netlify.app/).

To run the `AddressDriverClient` examples app locally:

- From the project's root dir run `cd address-driver-examples/`
- Run `npm run dev -- --open`

You can find a hosted version of the `AddressDriverClient` examples app [here](https://address-driver-examples.netlify.app/).
