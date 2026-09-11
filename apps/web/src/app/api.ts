import { createApiClient } from '@baby-growth-gallery/api-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
if (!API_BASE_URL) throw new Error('VITE_API_BASE_URL is required');

export const api = createApiClient({ baseUrl: API_BASE_URL });
