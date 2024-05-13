import React, { act } from 'react';

import { renderHook, waitFor } from '@testing-library/react';

import { useServiceMutation, RequestInitWithPathPrefix } from '../src/index';
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
}

test('basic method call should return expected data', async () => {
  const queryClient = new QueryClient();
  const wrapper: FC<PropsWithChildren> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const { result } = renderHook(() => useServiceMutation(FakeService.FakeMethod), { wrapper });

  await act(async () => {
    await result.current.mutateAsync({ id: 1, name: 'Hello' });
  });

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
