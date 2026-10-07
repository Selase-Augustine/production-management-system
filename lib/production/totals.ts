export function sumQuantities(values: Array<number | string>) {
  return values.reduce((sum: number, v) => sum + Number(v), 0);
}

export function uniqueConstraintKey(shiftId: string, productId: string) {
  return `${shiftId}::${productId}`;
}

export function assertNoDuplicateProducts(productIds: string[]) {
  const seen = new Set<string>();
  for (const id of productIds) {
    if (seen.has(id)) return false;
    seen.add(id);
  }
  return true;
}
