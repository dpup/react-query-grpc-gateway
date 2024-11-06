// These two rules are disabled to allow for the context usage pattern here
// where each handler modifies the same context object.
/* eslint @typescript-eslint/no-explicit-any: 0 */
/* eslint @typescript-eslint/no-unsafe-argument: 0 */

import { useQueryClient } from '@tanstack/react-query';
import { ServiceError, ServiceMethod } from './types';
import { queryKey } from './queryKey';

export interface SideEffectOptions<TSourceReq, TSourceResp, TTargetReq, TTargetResp> {
  /**
   * Maps the querykey for the source request to the target request. If not
   * provided, the source key is used. The value is passed like so:
   *
   *     queryKey(someMethod, mapKey(req));
   */
  mapKey?: (update: TSourceReq) => TTargetReq;

  /**
   * Optimistically patches the target query's data with the update from from
   * the source query. For example, an update to a user record might
   * optimistically update the user record and a list of users.
   */
  patchFn?: (oldData: TTargetResp, update: TSourceReq) => TTargetResp;

  /**
   * Updates the target query's data with the result from the source query. This
   * is helpful if the mutation had side effects not captured in the request
   * payload.
   */
  updateFn?: (oldData: TTargetResp, result: TSourceResp) => TTargetResp;

  /**
   * If specified, the target query will be invalidated on mutation. This is
   * useful if there are known side-effects but the response from the source
   * query does not capture them. 'true' will trigger the default refetch
   * behavior of 'active', while 'active', 'inactive', 'all', and 'none' can be
   * used to specify other behaviors per `invalidateQueries`.
   * 'remove' will simply remove the query from the cache.
   */
  invalidate?: boolean | 'active' | 'inactive' | 'all' | 'remove' | 'none';
}

type SideEffectContext = Record<string, unknown>;

/**
 * Represents a subset of MutationOptions from React Query.
 */
export interface SideEffectHandlers<TSourceReq, TSourceResp> {
  onMutate: (req: TSourceReq) => Promise<SideEffectContext> | SideEffectContext;
  onSuccess: (
    result: TSourceResp,
    req: TSourceReq,
    _context: SideEffectContext,
  ) => Promise<void> | void;
  onError: (
    error: ServiceError,
    req: TSourceReq,
    context: SideEffectContext,
  ) => Promise<void> | void;
}

/**
 * Specifies a side effect handler for a mutation. Side effects can
 * optimistically patch the data associated with a query, update the data, or
 * invalidate the query entirely.
 *
 * Consider an `updateUser` endpoint that allows for partial updates to a user
 * record. The shape of the response mirrors the `readUser` endpoint, as does
 * the query key.
 *
 *     useServiceMutation(updateUser, {
 *       retryDelay: 1000,
 *       ...chain(
 *         sideEffect(readUser, {
 *           patch: (oldUser, update) => ({ ...oldUser, ...update } }),
 *           update: (newUser) => newUser,
 *         }),
 *         sideEffect(listUsers, {
 *           mapKey: ({ workspaceId }) => workspaceId,
 *           invalidate: true,
 *         }),
 *       ),
 *     });
 *
 */
export function sideEffect<TSourceReq, TSourceResp, TTargetReq, TTargetResp>(
  m: ServiceMethod<TTargetReq, TTargetResp>,
  options: SideEffectOptions<TSourceReq, TSourceResp, TTargetReq, TTargetResp>,
): SideEffectHandlers<TSourceReq, TSourceResp> {
  const queryClient = useQueryClient();
  const { mapKey = (x) => x, patchFn: patch, updateFn: update, invalidate } = options;
  return {
    onMutate: async (req: TSourceReq) => {
      const key = queryKey(m as any, mapKey ? mapKey(req) : undefined);
      await queryClient.cancelQueries({ queryKey: key });
      let originalData: TTargetResp;
      queryClient.setQueryData(key, (oldData: TTargetResp) => {
        originalData = oldData;
        return patch ? patch(oldData, req) : oldData;
      });
      return { [key.join('-')]: originalData! };
    },
    onSuccess: async (result: TSourceResp, req: TSourceReq, _context: SideEffectContext) => {
      const key = queryKey(m as any, mapKey ? mapKey(req) : undefined);
      if (update) {
        queryClient.setQueryData(key, (oldData: TTargetResp) => update(oldData, result));
      }
      if (invalidate === 'remove') {
        queryClient.removeQueries({ queryKey: key });
      } else if (invalidate) {
        await queryClient.invalidateQueries({
          queryKey: key,
          refetchType: typeof invalidate == 'string' ? invalidate : 'active',
        });
      }
    },
    onError: (_error: ServiceError, req: TSourceReq, context: SideEffectContext) => {
      const key = queryKey(m as any, mapKey ? mapKey(req) : undefined);
      const originalData = context[key.join('-')];
      queryClient.setQueryData(key, originalData);
    },
  };
}

export function chainSideEffects<TSourceReq, TSourceResp>(
  ...mutations: SideEffectHandlers<TSourceReq, TSourceResp>[]
) {
  return {
    onMutate: async (req: TSourceReq) => {
      const context = {};
      for (const mutation of mutations) {
        Object.assign(context, await mutation?.onMutate(req));
      }
      return context;
    },
    onSuccess: async (result: TSourceResp, req: TSourceReq, context: any) => {
      for (const mutation of mutations) {
        await mutation?.onSuccess(result, req, context);
      }
    },
    onError: async (error: ServiceError, req: TSourceReq, context: any) => {
      for (const mutation of mutations) {
        await mutation?.onError(error, req, context);
      }
    },
  };
}

// Directly patches the target query's data with the update from the source
// query. Intended to be used with the `patch` option of `sideEffect`.
export function patchFn<TSourceReq, TTargetResp>(
  oldData: TTargetResp,
  update: TSourceReq,
): TTargetResp {
  return { ...oldData, ...update };
}

// Directly updates the target's query data with the result from the source
// query. Intended to be used with the `update` option of `sideEffect`.
export function updateFn<TSourceResp, TTargetResp>(
  _oldData: TTargetResp,
  result: TSourceResp,
): TTargetResp {
  return result as unknown as TTargetResp;
}
