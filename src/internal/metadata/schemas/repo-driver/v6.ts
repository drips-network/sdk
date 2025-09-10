import z from "zod";

export const orcidSplitReceiverSchema = z.object({
  type: z.literal('orcid'),
  weight: z.number(),
  accountId: z.string(),
  orcidId: z.string()
});

// TODO: actually export new version
// should allow orcidSplitReceiverSchema as a dependency
// for repoDriverAccountSplitsSchema