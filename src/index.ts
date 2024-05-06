import { createContext, useContext } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';

// Represents the static methods from the generated service client.
export type ServiceMethod<Request extends object = object, Response extends object = object> = (
  req: Request,
  initReq: RequestInitWithPathPrefix,
) => Promise<Response>;

// Extends the standard `RequestInit` accepted by `fetch()` with a `pathPrefix`
// property that is used by the generated gateway methods to prefix the URL.
export interface RequestInitWithPathPrefix extends RequestInit {
  pathPrefix?: string;
}

// Represents the request object for a given service method.
export type ServiceRequest<E extends ServiceMethod> = Parameters<E>[0];

// Represents the response object for a given service method.
export type ServiceResponse<E extends ServiceMethod> = ReturnType<E>;

// Represents an error returned by calling a service method.
export type ServiceError = Error | ErrorResponse;

// Represents a function that handles errors returned from a service method.
export type OnErrorHandler<E extends ServiceMethod> = (
  error: Error | ErrorResponse,
) => ReturnType<E> | null;

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
type UseServiceQueryOptions<E extends ServiceMethod> = Omit<
  UseQueryOptions<Awaited<ServiceResponse<E>>, ServiceError>,
  'queryFn'
> & {
  onError?: OnErrorHandler<E>;
};

// Represents the result of calling `useServiceQuery`.
type UseServiceQueryResult<E extends ServiceMethod> = UseQueryResult<
  Awaited<ServiceResponse<E>>,
  ServiceError
>;

// Wraps `useQuery` from react-query, pulling request configuration from context
// and making it easier to call generated service clients.
export function useServiceQuery<E extends ServiceMethod>(
  method: E,
  req: ServiceRequest<E>,
  options?: UseServiceQueryOptions<E>,
): UseServiceQueryResult<E> {
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
        return resp.catch(options.onError) as Promise<Awaited<ServiceResponse<E>>>;
      }
      return resp as Promise<Awaited<ServiceResponse<E>>>;
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
