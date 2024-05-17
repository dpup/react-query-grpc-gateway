import { UseQueryResult, useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useContext } from 'react';
import { ServiceContext } from '.';
import {
  RequestInitWithPathPrefix,
  ServiceError,
  ServiceMethod,
  UseServiceQueryOptions,
} from './types';

// Wraps `useQuery` from react-query, pulling request configuration from context
// and making it easier to call generated service clients.
export function useServiceQuery<M extends ServiceMethod<Parameters<M>[0], Awaited<ReturnType<M>>>>(
  method: M,
  req: Parameters<M>[0],
  options?: UseServiceQueryOptions<M>,
): UseQueryResult<Awaited<ReturnType<M>>, ServiceError> {
  const reqCtx = useContext(ServiceContext);
  return useQuery(queryOptions(method, req, reqCtx, options));
}

// Returns the options object for `useQuery` based on the service method. Can
// be used with `useSuspenseQuery` for data loading.
export function queryOptions<M extends ServiceMethod<Parameters<M>[0], Awaited<ReturnType<M>>>>(
  method: M,
  req: Parameters<M>[0],
  reqInit?: RequestInitWithPathPrefix,
  options?: UseServiceQueryOptions<M>,
): UseQueryOptions<Awaited<ReturnType<M>>, ServiceError> {
  return {
    ...options!,
    queryFn: () => {
      const resp = method(req, {
        ...reqInit,
        headers: {
          'Content-Type': 'application/json',
          ...reqInit?.headers,
        },
      });
      if (options?.onError) {
        return resp.catch(options.onError) as Awaited<ReturnType<M>>;
      }
      return resp;
    },
  };
}
