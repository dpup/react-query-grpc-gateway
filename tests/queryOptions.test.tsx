import React from 'react';

import { renderHook, waitFor } from '@testing-library/react';

import { RequestInitWithPathPrefix, queryOptions } from '../src/index';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { PropsWithChildren } from 'react';
import { FC } from 'react';

interface FakeRequest {
  id: number;
  name: string;
}

interface FakeResponse {
  req: FakeRequest;
  initReq?: RequestInitWithPathPrefix;
}

// Fake gRPC gateway service that satisfies the interface but simply echos back
// the Request and the RequestInit objects.
class FakeService {
  static FakeMethod(
    this: void,
    req: FakeRequest,
    initReq?: RequestInitWithPathPrefix,
  ): Promise<FakeResponse> {
    return Promise.resolve({ req, initReq });
  }
  static ErrorMethod(
    this: void,
    _req: FakeRequest,
    _initReq?: RequestInitWithPathPrefix,
  ): Promise<FakeResponse> {
    return Promise.reject({
      code: 16,
      message: 'This is an error',
    });
  }
}

// Tests mostly used to help verify type information for `queryOptions` which is
// diverging between hooks and becoming less usable as a single definition. A
// future version may need to provide abstractions for calling `useSuspenseQuery`
// etc. directly.

test('useQuery', async () => {
  const queryClient = new QueryClient();
  const wrapper: FC<PropsWithChildren> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const { result } = renderHook(
    () => useQuery(queryOptions(FakeService.FakeMethod, { id: 1, name: 'Hello' })),
    { wrapper },
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  if (result.current.data) {
    expect(result.current.data.req.id).toEqual(1);
    expect(result.current.data.req.name).toEqual('Hello');
    expect(result.current.data.initReq).toEqual({
      headers: { 'Content-Type': 'application/json' },
    });
  } else {
    fail('Expected data to be defined');
  }
});

test('useSuspenseQuery', async () => {
  const queryClient = new QueryClient();
  const wrapper: FC<PropsWithChildren> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  // Minimal suspense call, mostly to verify typescript types.
  const { result } = renderHook(
    () => useSuspenseQuery(queryOptions(FakeService.FakeMethod, { id: 1, name: 'Hello' })),
    { wrapper },
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  if (result.current.data) {
    expect(result.current.data.req.id).toEqual(1);
    expect(result.current.data.req.name).toEqual('Hello');
    expect(result.current.data.initReq).toEqual({
      headers: { 'Content-Type': 'application/json' },
    });
  } else {
    fail('Expected data to be defined');
  }
});
