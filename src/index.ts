import { createContext, useContext } from 'react';
import {
  useMutation,
  UseMutationOptions,
  UseMutationResult,
  useQuery,
  UseQueryOptions,
  UseQueryResult,
} from '@tanstack/react-query';

// Note on generic types:
// - I represents the input type for the service method, or the request.
// - O represents the output type for the service method, or the response.
// - M represents the service method itself.

// Represents the static methods from the generated service client.
export type ServiceMethod<I, O> = (req: I, initReq: RequestInitWithPathPrefix) => Promise<O>;

// Extends the standard `RequestInit` accepted by `fetch()` with a `pathPrefix`
// property that is used by the generated gateway methods to prefix the URL.
export interface RequestInitWithPathPrefix extends RequestInit {
  pathPrefix?: string;
}

// Represents an error returned by calling a service method.
export type ServiceError = Error | ErrorResponse;

// Represents a function that handles errors returned from a service method.
export type OnErrorHandler<O> = (error: Error | ErrorResponse) => O | null;

// Represents the standard error response returned from the server.
export interface ErrorResponse {
  // Non-standard, but a useful customization. Could be typed as `Code` from
  // google/rpc/code.pb.
  codeName?: string;
  code: number;
  message: string;
  details: unknown[];
}

// Represents the `useServiceQuery` options. This is the same as
// `UseQueryOptions` except that `queryFn` is handled internally, so must not
// be provided. Additionally an `onError` handler can be provided to provide
// customized error handling.
type UseServiceQueryOptions<M extends ServiceMethod<Parameters<M>[0], ReturnType<M>>> = Omit<
  UseQueryOptions<Awaited<ReturnType<M>>, ServiceError>,
  'queryFn'
> & {
  onError?: OnErrorHandler<ReturnType<M>>;
};

// Represents the `useServiceMutation` options. This is the same as
// `UseMutationOptions` except that `mutationFn` is handled internally, so must
// not be provided.
type UseServiceMutationOptions<M extends ServiceMethod<Parameters<M>[0], ReturnType<M>>> = Omit<
  UseMutationOptions<Awaited<ReturnType<M>>, ServiceError, Parameters<M>[0], unknown>,
  'mutationFn'
>;

// Wraps `useQuery` from react-query, pulling request configuration from context
// and making it easier to call generated service clients.
export function useServiceQuery<M extends ServiceMethod<Parameters<M>[0], Awaited<ReturnType<M>>>>(
  method: M,
  req: Parameters<M>[0],
  options?: UseServiceQueryOptions<M>,
): UseQueryResult<Awaited<ReturnType<M>>, ServiceError> {
  const reqCtx = useContext(ServiceContext);
  return useQuery({
    ...options!,
    queryFn: () => {
      const resp = method(req, {
        ...reqCtx,
        headers: {
          'Content-Type': 'application/json',
          ...reqCtx.headers,
        },
      });
      if (options?.onError) {
        return resp.catch(options.onError) as Awaited<ReturnType<M>>;
      }
      return resp;
    },
  });
}

// Wraps `useMutation` from react-query, pulling request configuration from
// context and making it easier to call generated service clients.
export function useServiceMutation<
  M extends ServiceMethod<Parameters<M>[0], Awaited<ReturnType<M>>>,
>(
  method: M,
  options?: UseServiceMutationOptions<M>,
): UseMutationResult<Awaited<ReturnType<M>>, ServiceError> {
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

// Represents the context object for injecting request options.
//
// Example:
//
// <ServiceContext.Provider value={options}>
//   {children}
// </ServiceContext.Provider>
//
// Where options can include `pathPrefix` or any of the options in `RequestInit`.
//
// https://microsoft.github.io/PowerBI-JavaScript/interfaces/_node_modules_typedoc_node_modules_typescript_lib_lib_dom_d_.requestinit.html
export const ServiceContext = createContext({} as RequestInitWithPathPrefix);

// Returns true if the error is an error response.
export function isErrorResponse(error: Error | ErrorResponse): error is ErrorResponse {
  return (error as ErrorResponse).code !== undefined;
}
