import createClient from 'openapi-fetch';
import type { components, paths } from './schema.js';

export type ReadinessResponse =
  paths['/api/v1/health/ready']['get']['responses'][200]['content']['application/json'];
export type ApiProblem =
  paths['/api/v1/health/ready']['get']['responses'][503]['content']['application/problem+json'];
export type AccountSummary = components['schemas']['AccountSummaryDto'];
export type VerificationChallenge = components['schemas']['VerificationChallengeResponseDto'];
export type FamilySummary = components['schemas']['FamilySummaryDto'];
export type FamilyMember = components['schemas']['FamilyMemberDto'];
export type ActiveInvitation = components['schemas']['ActiveInvitationDto'];
export type FamilyActivityPage = components['schemas']['FamilyActivityPageDto'];
export type PhotoUploadedActivitySummaryV1 =
  components['schemas']['PhotoUploadedActivitySummaryV1Dto'];
export type BabySummary = components['schemas']['BabySummaryDto'];
export type PhotoSummary = components['schemas']['PhotoSummaryDto'];
export type PhotoUploadBatch = components['schemas']['PhotoUploadBatchDto'];
export type PhotoUploadInstruction = Omit<
  components['schemas']['PhotoUploadInstructionDto'],
  'fields'
> & {
  fields: Record<string, string>;
};
export type PhotoManagementPage = components['schemas']['PhotoManagementPageDto'];

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
    async listFamilies(): Promise<components['schemas']['FamilyListResponseDto']> {
      const result = await client.GET('/api/v1/families');
      return requireData<components['schemas']['FamilyListResponseDto']>(
        result.data,
        result.error,
        result.response,
      );
    },
    async createFamily(
      body: components['schemas']['CreateFamilyRequestDto'],
    ): Promise<FamilySummary> {
      const result = await client.POST('/api/v1/families', {
        body,
        headers: await mutationHeaders(),
      });
      return requireData<FamilySummary>(result.data, result.error, result.response);
    },
    async activateFamily(familyId: string): Promise<AccountSummary> {
      const result = await client.POST('/api/v1/families/{familyId}/activate', {
        params: { path: { familyId } },
        headers: await mutationHeaders(),
      });
      return requireData<AccountSummary>(result.data, result.error, result.response);
    },
    async getFamily(familyId: string): Promise<FamilySummary> {
      const result = await client.GET('/api/v1/families/{familyId}', {
        params: { path: { familyId } },
      });
      return requireData<FamilySummary>(result.data, result.error, result.response);
    },
    async listFamilyMembers(
      familyId: string,
    ): Promise<components['schemas']['FamilyMemberListResponseDto']> {
      const result = await client.GET('/api/v1/families/{familyId}/members', {
        params: { path: { familyId } },
      });
      return requireData<components['schemas']['FamilyMemberListResponseDto']>(
        result.data,
        result.error,
        result.response,
      );
    },
    async changeFamilyMemberRole(
      familyId: string,
      membershipId: string,
      body: components['schemas']['ChangeMemberRoleRequestDto'],
    ): Promise<FamilyMember> {
      const result = await client.PATCH('/api/v1/families/{familyId}/members/{membershipId}/role', {
        params: { path: { familyId, membershipId } },
        body,
        headers: await mutationHeaders(),
      });
      return requireData<FamilyMember>(result.data, result.error, result.response);
    },
    async removeFamilyMember(familyId: string, membershipId: string): Promise<void> {
      const result = await client.DELETE('/api/v1/families/{familyId}/members/{membershipId}', {
        params: { path: { familyId, membershipId } },
        headers: await mutationHeaders(),
      });
      if (!result.response.ok) requireData(result.data, result.error, result.response);
    },
    async leaveFamily(familyId: string): Promise<AccountSummary> {
      const result = await client.DELETE('/api/v1/families/{familyId}/membership', {
        params: { path: { familyId } },
        headers: await mutationHeaders(),
      });
      return requireData<AccountSummary>(result.data, result.error, result.response);
    },
    async createFamilyInvitation(
      familyId: string,
    ): Promise<components['schemas']['CreatedInvitationDto']> {
      const result = await client.POST('/api/v1/families/{familyId}/invitations', {
        params: { path: { familyId } },
        headers: await mutationHeaders(),
      });
      return requireData<components['schemas']['CreatedInvitationDto']>(
        result.data,
        result.error,
        result.response,
      );
    },
    async listFamilyInvitations(
      familyId: string,
    ): Promise<components['schemas']['InvitationListResponseDto']> {
      const result = await client.GET('/api/v1/families/{familyId}/invitations', {
        params: { path: { familyId } },
      });
      return requireData<components['schemas']['InvitationListResponseDto']>(
        result.data,
        result.error,
        result.response,
      );
    },
    async revokeFamilyInvitation(familyId: string, invitationId: string): Promise<void> {
      const result = await client.DELETE('/api/v1/families/{familyId}/invitations/{invitationId}', {
        params: { path: { familyId, invitationId } },
        headers: await mutationHeaders(),
      });
      if (!result.response.ok) requireData(result.data, result.error, result.response);
    },
    async acceptFamilyInvitation(
      body: components['schemas']['AcceptInvitationRequestDto'],
    ): Promise<components['schemas']['AcceptInvitationResponseDto']> {
      const result = await client.POST('/api/v1/family-invitations/accept', {
        body,
        headers: await mutationHeaders(),
      });
      return requireData<components['schemas']['AcceptInvitationResponseDto']>(
        result.data,
        result.error,
        result.response,
      );
    },
    async listFamilyActivities(
      familyId: string,
      query: { limit?: number; cursor?: string } = {},
    ): Promise<FamilyActivityPage> {
      const result = await client.GET('/api/v1/families/{familyId}/activities', {
        params: { path: { familyId }, query },
      });
      return requireData<FamilyActivityPage>(result.data, result.error, result.response);
    },
    async listBabies(
      familyId: string,
      includeArchived = false,
    ): Promise<components['schemas']['BabyListResponseDto']> {
      const result = await client.GET('/api/v1/families/{familyId}/babies', {
        params: { path: { familyId }, query: { includeArchived } },
      });
      return requireData<components['schemas']['BabyListResponseDto']>(
        result.data,
        result.error,
        result.response,
      );
    },
    async createBaby(
      familyId: string,
      body: components['schemas']['CreateBabyRequestDto'],
    ): Promise<BabySummary> {
      const result = await client.POST('/api/v1/families/{familyId}/babies', {
        params: { path: { familyId } },
        body,
        headers: await mutationHeaders(),
      });
      return requireData<BabySummary>(result.data, result.error, result.response);
    },
    async getBaby(familyId: string, babyId: string): Promise<BabySummary> {
      const result = await client.GET('/api/v1/families/{familyId}/babies/{babyId}', {
        params: { path: { familyId, babyId } },
      });
      return requireData<BabySummary>(result.data, result.error, result.response);
    },
    async updateBaby(
      familyId: string,
      babyId: string,
      body: components['schemas']['UpdateBabyRequestDto'],
    ): Promise<BabySummary> {
      const result = await client.PATCH('/api/v1/families/{familyId}/babies/{babyId}', {
        params: { path: { familyId, babyId } },
        body,
        headers: await mutationHeaders(),
      });
      return requireData<BabySummary>(result.data, result.error, result.response);
    },
    async activateBaby(familyId: string, babyId: string): Promise<AccountSummary> {
      const result = await client.POST('/api/v1/families/{familyId}/babies/{babyId}/activate', {
        params: { path: { familyId, babyId } },
        headers: await mutationHeaders(),
      });
      return requireData<AccountSummary>(result.data, result.error, result.response);
    },
    async archiveBaby(familyId: string, babyId: string): Promise<AccountSummary> {
      const result = await client.POST('/api/v1/families/{familyId}/babies/{babyId}/archive', {
        params: { path: { familyId, babyId } },
        headers: await mutationHeaders(),
      });
      return requireData<AccountSummary>(result.data, result.error, result.response);
    },
    async restoreBaby(familyId: string, babyId: string): Promise<BabySummary> {
      const result = await client.POST('/api/v1/families/{familyId}/babies/{babyId}/restore', {
        params: { path: { familyId, babyId } },
        headers: await mutationHeaders(),
      });
      return requireData<BabySummary>(result.data, result.error, result.response);
    },
    async createPhotoUploadBatch(
      familyId: string,
      babyId: string,
      body: components['schemas']['CreatePhotoBatchRequestDto'],
    ): Promise<PhotoUploadBatch & { uploadInstructions?: PhotoUploadInstruction[] }> {
      const result = await client.POST(
        '/api/v1/families/{familyId}/babies/{babyId}/photo-upload-batches',
        {
          params: { path: { familyId, babyId } },
          body,
          headers: await mutationHeaders(),
        },
      );
      return requireData<PhotoUploadBatch>(result.data, result.error, result.response);
    },
    async getPhotoUploadBatch(
      familyId: string,
      babyId: string,
      batchId: string,
    ): Promise<PhotoUploadBatch> {
      const result = await client.GET(
        '/api/v1/families/{familyId}/babies/{babyId}/photo-upload-batches/{batchId}',
        {
          params: { path: { familyId, babyId, batchId } },
        },
      );
      return requireData<PhotoUploadBatch>(result.data, result.error, result.response);
    },
    async reissuePhotoUpload(
      familyId: string,
      babyId: string,
      batchId: string,
      photoId: string,
    ): Promise<PhotoUploadInstruction> {
      const result = await client.POST(
        '/api/v1/families/{familyId}/babies/{babyId}/photo-upload-batches/{batchId}/photos/{photoId}/reissue',
        {
          params: { path: { familyId, babyId, batchId, photoId } },
          headers: await mutationHeaders(),
        },
      );
      return requireData<components['schemas']['PhotoUploadInstructionDto']>(
        result.data,
        result.error,
        result.response,
      );
    },
    async completePhotoUpload(
      familyId: string,
      babyId: string,
      batchId: string,
      photoId: string,
    ): Promise<void> {
      const result = await client.POST(
        '/api/v1/families/{familyId}/babies/{babyId}/photo-upload-batches/{batchId}/photos/{photoId}/complete',
        {
          params: { path: { familyId, babyId, batchId, photoId } },
          headers: await mutationHeaders(),
        },
      );
      if (!result.response.ok) requireData(result.data, result.error, result.response);
    },
    async updatePhoto(
      familyId: string,
      babyId: string,
      photoId: string,
      body: components['schemas']['UpdatePhotoRequestDto'],
    ): Promise<PhotoSummary> {
      const result = await client.PATCH(
        '/api/v1/families/{familyId}/babies/{babyId}/photos/{photoId}',
        {
          params: { path: { familyId, babyId, photoId } },
          body,
          headers: await mutationHeaders(),
        },
      );
      return requireData<PhotoSummary>(result.data, result.error, result.response);
    },
    async updatePhotoBatch(
      familyId: string,
      babyId: string,
      batchId: string,
      body: components['schemas']['BatchUpdatePhotosRequestDto'],
    ): Promise<components['schemas']['PhotoListResponseDto']> {
      const result = await client.PATCH(
        '/api/v1/families/{familyId}/babies/{babyId}/photo-upload-batches/{batchId}/photos',
        {
          params: { path: { familyId, babyId, batchId } },
          body,
          headers: await mutationHeaders(),
        },
      );
      return requireData<components['schemas']['PhotoListResponseDto']>(
        result.data,
        result.error,
        result.response,
      );
    },
    async publishPhotos(
      familyId: string,
      babyId: string,
      batchId: string,
      body: components['schemas']['PublishPhotosRequestDto'],
    ): Promise<components['schemas']['PhotoListResponseDto']> {
      const result = await client.POST(
        '/api/v1/families/{familyId}/babies/{babyId}/photo-upload-batches/{batchId}/publish',
        {
          params: { path: { familyId, babyId, batchId } },
          body,
          headers: await mutationHeaders(),
        },
      );
      return requireData<components['schemas']['PhotoListResponseDto']>(
        result.data,
        result.error,
        result.response,
      );
    },
    async managePhotos(
      familyId: string,
      babyId: string,
      query: {
        scope?: 'mine' | 'family';
        status?:
          | 'AWAITING_UPLOAD'
          | 'QUEUED'
          | 'PROCESSING'
          | 'DRAFT'
          | 'PUBLISHED'
          | 'TRASHED'
          | 'FAILED';
        limit?: number;
        cursor?: string;
      } = {},
    ): Promise<PhotoManagementPage> {
      const result = await client.GET('/api/v1/families/{familyId}/babies/{babyId}/photos/manage', {
        params: { path: { familyId, babyId }, query },
      });
      return requireData<PhotoManagementPage>(result.data, result.error, result.response);
    },
    async getPhotoPreview(
      familyId: string,
      babyId: string,
      photoId: string,
      variant: 'THUMBNAIL' | 'DISPLAY' | 'ARCHIVE' = 'DISPLAY',
    ): Promise<components['schemas']['PhotoPreviewDto']> {
      const result = await client.GET(
        '/api/v1/families/{familyId}/babies/{babyId}/photos/{photoId}/preview',
        {
          params: { path: { familyId, babyId, photoId }, query: { variant } },
        },
      );
      return requireData<components['schemas']['PhotoPreviewDto']>(
        result.data,
        result.error,
        result.response,
      );
    },
    async trashPhoto(familyId: string, babyId: string, photoId: string): Promise<PhotoSummary> {
      const result = await client.POST(
        '/api/v1/families/{familyId}/babies/{babyId}/photos/{photoId}/trash',
        {
          params: { path: { familyId, babyId, photoId } },
          headers: await mutationHeaders(),
        },
      );
      return requireData<PhotoSummary>(result.data, result.error, result.response);
    },
    async restorePhoto(familyId: string, babyId: string, photoId: string): Promise<PhotoSummary> {
      const result = await client.POST(
        '/api/v1/families/{familyId}/babies/{babyId}/photos/{photoId}/restore',
        {
          params: { path: { familyId, babyId, photoId } },
          headers: await mutationHeaders(),
        },
      );
      return requireData<PhotoSummary>(result.data, result.error, result.response);
    },
    async discardPhoto(familyId: string, babyId: string, photoId: string): Promise<void> {
      const result = await client.DELETE(
        '/api/v1/families/{familyId}/babies/{babyId}/photos/{photoId}',
        {
          params: { path: { familyId, babyId, photoId } },
          headers: await mutationHeaders(),
        },
      );
      if (!result.response.ok) requireData(result.data, result.error, result.response);
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
