# React Query for gRPC Gateway

A custom hook using [TanStack Query](https://github.com/tanstack/query) that
makes calling gRPC Gateway methods simpler. This hook is intended to be used
with [generated TypeScript clients](https://github.com/dpup/protoc-gen-grpc-gateway-ts).

## Installation

```sh
# pnpm
pnpm add react-query-grpc-gateway

# yarn
yarn add react-query-grpc-gateway

# npm
npm install react-query-grpc-gateway
```

## Usage

- [Queries](#queries)
- [Mutations](#mutations)
- [Managing side effects](#side-effects)
- [Advanced usage](#advanced-usage)

### Queries

`useServiceQuery` is a drop in replacement for `useQuery` that allows for the propagation of request configuration through the context.

Assuming you have a proto definition for a `UserService` with a `GetUser`
method, then your original code might look as follows:

#### Without `useServiceQuery`

```ts
const UserProfilePage ({ userID }) => {
  const result = useQuery({
    queryKey: ['user', userID],
    queryFn: () => getUser({ id: userID }, {
      pathPrefix: API_HOST,
      credentials: 'include',
      headers: {
        'X-CSRF-Protection': 1
      }
    }),
  });
  if (result.isLoading) return <LoadingScreen />;
  else if (result.isError) return <ErrorPage error={result.error} />;
  else <UserProfile user={result.data} />
}
```

#### With `useServiceQuery`

In your root App component update it to include a `ServiceContext.Provider` and
configure any global configuration for making requests. This can include headers,
authentication tokens, and any properties that get forwarded to the standard
`fetch` library.

```ts
const AppProviders = ({ children }) => {
  const requestOptions = {
    pathPrefix: API_HOST,
    credentials: 'include',
    headers: {
      'X-CSRF-Protection': 1,
    },
  };
  return (
    <QueryClientProvider client={queryClient}>
      <ServiceContext.Provider value={requestOptions}>{children}</ServiceContext.Provider>
    </QueryClientProvider>
  );
};
```

Then in your component that's loading data, update it to use `useServiceQuery`:

```ts
const UserProfilePage ({ userID }) => {
  const result = useServiceQuery(getUser, { id: userID });
  if (result.isLoading) return <LoadingScreen />;
  else if (result.isError) return <ErrorPage error={result.error} />;
  else <UserProfile user={result.data} />
}
```

The arguments for `useServiceQuery` are:

1. The service method.
2. The request object.
3. Standard `useQuery` options with the addition of an `onError` handler.

`onError` can be used to customize error handling behavior at the request level,
for example, don't even show React Query that a 401 occurred.

### Mutations

`useServiceMutation` is a drop in replacement for `useMutation`.

```ts
const mutation = useServiceMutation(UserService.UpdateUser);
mutation.mutate({ id: userID, name: newName });
```

### Side Effects

React Query's `useMutation` accepts handlers for `onMutate`, `onSuccess`,
`onError`, and `onSettled`. When executing a query you often find yourself
needing to manage the data from other queries, which can get cumbersome.

The `sideEffect` function creates mutation handlers that make it easy to manage
such dependent queries.

In the following example calling `updateUser` will optimistically update the
data associated with `getUser` and will invalidate the results of `getUserList`:

```ts
export const useUpdateUser = () => {
  return useServiceMutation(updateUser, {
    ...chainSideEffects(
      sideEffect(getUser, {
        mapKey: ({ workspaceId, userId }) => ({ workspaceId, userId }),
        patchFn,
        updateFn,
      }),
      sideEffect(getUserList, {
        mapKey: (_update) => null,
        invalidate: true,
      }),
    ),
  });
};
```

In the above example `updateUser` is considered the source query. `getUser` and
`getUserList` are target queries. For the target query, the following things
happen:

1. Any pending queries are cancelled.
2. If `patchFn` is provided, cached data is optimistically updated in place `onMutate`.
3. If the request succeeds and `updateFn` is provided, cached data is updated accordingly.
4. If the request succeeds and `invalidate` is specified, the query is invalidated.
5. If the request errors, then any optimistic updates are reverted.

The options for `sideEffect` are:

#### `mapKey?: (update: TSourceReq) => TTargetReq;`

Maps the query key for the source request to an equivalent target request that
should be invalidated.

In the above example, `getUser` for a specific workspace & user is matched,
while for `getUserList` all cached results are matched.

#### `patchFn?: (oldData: TTargetResp, update: TSourceReq) => TTargetResp;`

A function that is used to optimistically update the stored value for a target
query based on the source request. The default `patchFn` copies all fields from
the update onto the original object.

#### `updateFn?: (oldData: TTargetResp, result: TSourceResp) => TTargetResp;`

A function that is used to process the source queries response and update the
target query accordingly. The default `updateFn` replaces the target response
with the source response. This only works if the queries share the same
interface, as in the above example which assumes that `updateUser` returns the
same data as `getUser`.

#### `invalidate?: boolean;`

If specified, the target query is invalidated on success. If you want to
invalidate all keys associated with an endpoint, have `mapKey` return null.

### Advanced Usage

`queryOptions` can be used for consistency if you need to prefetch queries or
use suspenses.

```ts
const ctx = useServiceContext();
const { data: currentWorkspace } = useSuspenseQuery(
  queryOptions(getUser, { userId }, ctx, {
    staleTime: 60 * 1000,
  }),
);
```

`queryKey` generates a default query key for a service method and request. It is
provided as a convenience and can be overridden in the options param.

If you need to use the auto-generated query key manually, you can do so like
this:

```ts
await queryClient.invalidateQueries({
  queryKey: queryKey(listUsers, filter),
});
```

## Contributing

If you find issues or spot possible improvements, please submit a pull-request.
