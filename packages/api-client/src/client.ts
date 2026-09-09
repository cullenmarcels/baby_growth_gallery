import createClient from 'openapi-fetch';
import type { paths } from './schema.js';

export type ReadinessResponse =
  paths['/api/v1/health/ready']['get']['responses'][200]['content']['application/json'];
export type ApiProblem =
  paths['/api/v1/health/ready']['get']['responses'][503]['content']['application/problem+json'];

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
  const client = createClient<paths>({ baseUrl });
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
