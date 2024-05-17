import React from 'react';

import { renderHook, waitFor } from '@testing-library/react';

import {
  useServiceQuery,
  RequestInitWithPathPrefix,
  ServiceContext,
  isErrorResponse,
} from '../src/index';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

test('basic service call', async () => {
  const queryClient = new QueryClient();
  const wrapper: FC<PropsWithChildren> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const { result } = renderHook(
    () => useServiceQuery(FakeService.FakeMethod, { id: 1, name: 'Hello' }),
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

test('service call with custom query key', async () => {
  const queryClient = new QueryClient();
  const wrapper: FC<PropsWithChildren> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const { result } = renderHook(
    () =>
      useServiceQuery(FakeService.FakeMethod, { id: 1, name: 'Hello' }, { queryKey: ['mykey', 1] }),
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

test('service context should override request options', async () => {
  const queryClient = new QueryClient();
  const wrapper: FC<PropsWithChildren> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <ServiceContext.Provider value={{ headers: { 'X-Custom': 'FooBar' } }}>
        {children}
      </ServiceContext.Provider>
    </QueryClientProvider>
  );

  const { result } = renderHook(
    () => useServiceQuery(FakeService.FakeMethod, { id: 1, name: 'Hello' }),
    { wrapper },
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  if (result.current.data) {
    expect(result.current.data.req.id).toEqual(1);
    expect(result.current.data.req.name).toEqual('Hello');
    expect(result.current.data.initReq).toEqual({
      headers: { 'Content-Type': 'application/json', 'X-Custom': 'FooBar' },
    });
  } else {
    fail('Expected data to be defined');
  }
});

test('onerror handler should be able to recover from an error', async () => {
  const queryClient = new QueryClient();
  const wrapper: FC<PropsWithChildren> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const { result } = renderHook(
    () =>
      useServiceQuery(
        FakeService.ErrorMethod,
        { id: 1, name: 'Hello' },
        {
          onError: (e) => {
            if (isErrorResponse(e) && e.code === 16) {
              return null;
            }
            throw e;
          },
        },
      ),
    { wrapper },
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual(null);
});
