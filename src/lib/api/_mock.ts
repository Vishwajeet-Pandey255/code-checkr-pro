export const delay = <T>(value: T, ms = 250): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

export const uid = () => Math.random().toString(36).slice(2, 10);