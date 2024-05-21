import { UseMutationResult, useMutation } from '@tanstack/react-query';
import { useContext } from 'react';
import { ServiceContext } from '.';
import { ServiceMethod, UseServiceMutationOptions, ServiceError } from './types';

/**
 * Wraps `useMutation` from react-query, pulling request configuration from
 * Context and making it easier to call generated service clients.
 */
export function useServiceMutation<
  M extends ServiceMethod<Parameters<M>[0], Awaited<ReturnType<M>>>,
  C = unknown,
>(
  method: M,
  options?: UseServiceMutationOptions<M, C>,
): UseMutationResult<Awaited<ReturnType<M>>, ServiceError, Partial<Parameters<M>[0]>, C> {
  const reqCtx = useContext(ServiceContext);
  return useMutation({
    ...options!,
    mutationFn: (req) => {
      const resp = method(req, {
        ...reqCtx,
        headers: {
          'Content-Type': 'application/json',
          ...reqCtx.headers,
        },
      });
      return resp;
    },
  });
}
