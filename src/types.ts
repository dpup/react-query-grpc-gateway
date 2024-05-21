// Note on generic types:
// - I represents the input type for the service method, or the request.
// - O represents the output type for the service method, or the response.
// - M represents the service method itself.
// - C represents a context.
// - Q represents a QueryKey.

import { QueryKey, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query';

/** Represents the static methods from the generated service client. */
export type ServiceMethod<I, O> = (req: I, initReq: RequestInitWithPathPrefix) => Promise<O>;

/**
 * Extends the standard `RequestInit` accepted by `fetch()` with a `pathPrefix`
 *property that is used by the generated gateway methods to prefix the URL.
 */
export interface RequestInitWithPathPrefix extends RequestInit {
  pathPrefix?: string;
}

/** Represents an error returned by calling a service method. */
export type ServiceError = Error | ErrorResponse;

/** Represents a function that handles errors returned from a service method. */
export type OnErrorHandler<O> = (error: Error | ErrorResponse) => O | null;

/** Represents the standard error response returned from the server. */
export interface ErrorResponse {
  // Non-standard, but a useful customization. Could be typed as `Code` from
  // google/rpc/code.pb.
  codeName?: string;
  code: number;
  message: string;
  details: unknown[];
}

/**
 * Represents the `useServiceQuery` options. This is the same as
 * `UseQueryOptions` except that `queryFn` is handled internally, so must not
 * be provided and `queryKey` becomes optional.
 * Additionally an `onError` handler can be provided to provide customized error
 * handling.
 */
export type UseServiceQueryOptions<
  M extends ServiceMethod<Parameters<M>[0], ReturnType<M>>,
  Q extends QueryKey,
> = Omit<UseQueryOptions<Awaited<ReturnType<M>>, ServiceError>, 'queryFn' | 'queryKey'> & {
  onError?: OnErrorHandler<ReturnType<M>>;
} & {
  queryKey?: Q;
};

/** Represents the `useServiceMutation` options. This is the same as
 * `UseMutationOptions` except that `mutationFn` is handled internally, so must
 * not be provided.
 */
export type UseServiceMutationOptions<
  M extends ServiceMethod<Parameters<M>[0], ReturnType<M>>,
  C = unknown,
> = Omit<
  UseMutationOptions<Awaited<ReturnType<M>>, ServiceError, Parameters<M>[0], C>,
  'mutationFn'
>;

/** Returns true if the error is an error response. */
export function isErrorResponse(error: Error | ErrorResponse): error is ErrorResponse {
  return (error as ErrorResponse).code !== undefined;
}
