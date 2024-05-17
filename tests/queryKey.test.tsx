import { queryKey } from '../src/queryKey';
import { RequestInitWithPathPrefix } from '../src/types';

interface FakeRequest {
  id: number;
  name: string;
}

interface FakeResponse {
  req: FakeRequest;
  initReq?: RequestInitWithPathPrefix;
}

class FakeService {
  static FakeMethod(
    this: void,
    req: FakeRequest,
    initReq?: RequestInitWithPathPrefix,
  ): Promise<FakeResponse> {
    return Promise.resolve({ req, initReq });
  }
}

test('query key with request', () => {
  const key = queryKey(FakeService.FakeMethod, { id: 1, name: 'Hello' });
  expect(key).toEqual(['FakeMethod', { id: 1, name: 'Hello' }]);
});

test('query key with only method', () => {
  const key = queryKey(FakeService.FakeMethod);
  expect(key).toEqual(['FakeMethod']);
});
