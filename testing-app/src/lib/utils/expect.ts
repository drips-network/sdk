interface FailedExpectation {
  failed: true;
}

interface MetExpectation<T> {
  failed: false;
  result: T;
}

export async function expect<T extends (() => any) | (() => Promise<any>)>(
  func: T,
  toMatchCondition: (result: Awaited<ReturnType<T>>) => boolean,
  within = 300000,
  checkingEvery = 1000,
  debug = false,
): Promise<MetExpectation<Awaited<ReturnType<T>>> | FailedExpectation> {
  const numberOfChecks = Math.floor(within / checkingEvery);

  const checks = Array.from(Array(numberOfChecks).keys()).map(() => func);

  for (const check of checks) {
    const result = await check();

    const conditionMatches = toMatchCondition(result);

    if (debug) console.log({result, conditionMatches});

    if (conditionMatches) {
      return {
        failed: false,
        result,
      };
    }

    await new Promise(r => setTimeout(r, checkingEvery));
  }

  return {
    failed: true,
  };
}
