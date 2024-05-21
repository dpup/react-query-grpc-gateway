import { ServiceMethod } from './types';

/**
 * Returns a default query key for a service method and request object. The key
 * structure should not be depended on and considered internal. It is subject to
 * change.
 */
export function queryKey<M extends ServiceMethod<Parameters<M>[0], Awaited<ReturnType<M>>>>(
  method: M,
  req?: Parameters<M>[0],
): [string] | [string, Parameters<M>[0]] {
  if (req === undefined) return [method.name];
  return [method.name, req];
}
