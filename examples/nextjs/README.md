This is an implementation of the Radicle Drips SDK written with NextJs + Wagmi. This simple example implements the DripsClient and the SubgraphClient. It also reads data from the daiContract and hubContract

<img width="1488" alt="Screenshot 2022-10-16 at 15 26 22" src="https://user-images.githubusercontent.com/20168921/196040962-f917c9a3-5c9a-40b8-91d6-48411e1bf2d9.png">

## Getting Started

First, install all dependencies:

```bash
npm i
# or
yarn
```

Then, run the server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

When you click on Approve DAI, wait for few minutes to allow the transaction to execute.
You would to create an env file where you keep your provider ID details. There is a sample env file in the project.

You can start editing the page by modifying `pages/index.js`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/api-routes/introduction) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.js`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/api-routes/introduction) instead of React pages.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
