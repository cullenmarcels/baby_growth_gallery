import createClient from 'openapi-fetch';
import type { components, paths } from './schema.js';

export type ReadinessResponse =
  paths['/api/v1/health/ready']['get']['responses'][200]['content']['application/json'];
export type ApiProblem =
  paths['/api/v1/health/ready']['get']['responses'][503]['content']['application/problem+json'];
export type AccountSummary = components['schemas']['AccountSummaryDto'];
export type VerificationChallenge = components['schemas']['VerificationChallengeResponseDto'];

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly problem?: ApiProblem,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export async function getReadiness(
  baseUrl: string,
  signal?: AbortSignal,
): Promise<ReadinessResponse> {
  const client = createClient<paths>({ baseUrl, credentials: 'include' });
  const options = signal ? { signal } : {};
  const { data, error, response } = await client.GET('/api/v1/health/ready', options);

  if (!data) {
    const problem = error as ApiProblem | undefined;
    throw new ApiClientError(
      problem?.detail ?? 'API readiness request failed',
      response.status,
      problem,
    );
  }

  return data;
}

export interface ApiClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

export function createApiClient({ baseUrl, fetchImpl }: ApiClientOptions) {
  const client = createClient<paths>({
    baseUrl,
    credentials: 'include',
    ...(fetchImpl ? { fetch: fetchImpl } : {}),
  });
  let csrfToken: string | undefined;

  const requireData = <T>(data: T | undefined, error: unknown, response: Response): T => {
    if (data !== undefined) return data;
    const problem = error as ApiProblem | undefined;
    if (response.status === 403) csrfToken = undefined;
    throw new ApiClientError(problem?.detail ?? 'API request failed', response.status, problem);
  };

  const getCsrfToken = async (): Promise<string> => {
    const result = await client.GET('/api/v1/auth/csrf');
    const data = requireData<components['schemas']['CsrfTokenResponseDto']>(
      result.data,
      result.error,
      result.response,
    );
    csrfToken = data.csrfToken;
    return data.csrfToken;
  };

  const mutationHeaders = async (): Promise<{ 'x-csrf-token': string }> => ({
    'x-csrf-token': csrfToken ?? (await getCsrfToken()),
  });

  return {
    getCsrfToken,
    clearCsrfToken(): void {
      csrfToken = undefined;
    },
    async getSession(): Promise<AccountSummary> {
      const result = await client.GET('/api/v1/auth/session');
      return requireData<AccountSummary>(result.data, result.error, result.response);
    },
    async requestChallenge(
      body: components['schemas']['VerificationChallengeRequestDto'],
    ): Promise<VerificationChallenge> {
      const result = await client.POST('/api/v1/auth/verification-challenges', {
        body,
        headers: await mutationHeaders(),
      });
      return requireData<VerificationChallenge>(result.data, result.error, result.response);
    },
    async register(body: components['schemas']['RegisterRequestDto']): Promise<AccountSummary> {
      const result = await client.POST('/api/v1/auth/register', {
        body,
        headers: await mutationHeaders(),
      });
      const account = requireData<AccountSummary>(result.data, result.error, result.response);
      csrfToken = undefined;
      await getCsrfToken();
      return account;
    },
    async loginPassword(
      body: components['schemas']['PasswordLoginRequestDto'],
    ): Promise<AccountSummary> {
      const result = await client.POST('/api/v1/auth/login/password', {
        body,
        headers: await mutationHeaders(),
      });
      const account = requireData<AccountSummary>(result.data, result.error, result.response);
      csrfToken = undefined;
      await getCsrfToken();
      return account;
    },
    async loginCode(body: components['schemas']['CodeLoginRequestDto']): Promise<AccountSummary> {
      const result = await client.POST('/api/v1/auth/login/code', {
        body,
        headers: await mutationHeaders(),
      });
      const account = requireData<AccountSummary>(result.data, result.error, result.response);
      csrfToken = undefined;
      await getCsrfToken();
      return account;
    },
    async resetPassword(body: components['schemas']['PasswordResetRequestDto']): Promise<void> {
      const result = await client.POST('/api/v1/auth/password/reset', {
        body,
        headers: await mutationHeaders(),
      });
      if (!result.response.ok) requireData(result.data, result.error, result.response);
      csrfToken = undefined;
    },
    async logout(): Promise<void> {
      const result = await client.POST('/api/v1/auth/logout', {
        headers: await mutationHeaders(),
      });
      if (!result.response.ok) requireData(result.data, result.error, result.response);
      csrfToken = undefined;
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
