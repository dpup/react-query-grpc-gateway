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

`useServiceQuery` is a drop in replacement for `useQuery` that allows for the propagation of request configuration through the context.

Assuming you have a proto definition for a `UserService` with a `ReadUser`
method, then your original code might look as follows:

#### Original

```ts
const UserProfilePage ({ userID }) => {
  const { isLoading, isError, error, data } = useQuery({
    queryKey: ['user', userID],
    queryFn: () => UserService.ReadUser({ id: userID }, {
      pathPrefix: API_HOST,
      credentials: 'include',
      headers: {
        'X-CSRF-Protection': 1
      }
    }),
  });
  if (isLoading) return <LoadingScreen />;
  else if (isError) return <ErrorPage error={error} />;
  else <UserProfile user={data} />
}
```

#### Updated

In your root App component update it to include a `ServiceContext.Provider`:

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

Then back in your component that's loading data, update it to use `useServiceQuery`:

```ts
const UserProfilePage ({ userID }) => {
  const { isLoading, isError, error, data } = useServiceQuery(
    UserService.ReadUser,
    { id: userID },
    { queryKey: ['user', userID] },
  );
  if (isLoading) return <LoadingScreen />;
  else if (isError) return <ErrorPage error={error} />;
  else <UserProfile user={data} />
}
```

The arguments for `useServiceQuery` are:

1. The service method.
2. The request object.
3. Standard `useQuery` options with the addition of `pathPrefix` and `onError` fields.

`pathPrefix` is useful if you are doing cross-origin API calls.

`onError` can be used to customize error handling behavior at the request level,
for example, don't even show React Query that a 401 occurred.

## Contributing

If you find issues or spot possible improvements, please submit a pull-request.
