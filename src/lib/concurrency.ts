export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  mapper: (item: T, index: number) => Promise<R>,
  concurrency = 5,
): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("A concorrência deve ser um inteiro positivo.");
  }

  const results = new Array<R>(items.length);
  let nextIndex = 0;
  let failed = false;
  let failure: unknown;

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (!failed) {
        const index = nextIndex;
        if (index >= items.length) return;
        nextIndex += 1;

        try {
          results[index] = await mapper(items[index], index);
        } catch (error) {
          if (!failed) {
            failed = true;
            failure = error;
          }
          return;
        }
      }
    }),
  );

  if (failed) throw failure;
  return results;
}
