export const photoKeys = {
  all: ['photos'] as const,
  batch: (familyId: string, babyId: string, batchId: string) =>
    ['photos', familyId, babyId, 'batch', batchId] as const,
  manage: (familyId: string, babyId: string, scope: string, status: string) =>
    ['photos', familyId, babyId, 'manage', scope, status] as const,
  published: (familyId: string, babyId: string) =>
    ['photos', familyId, babyId, 'published'] as const,
  timeline: (familyId: string, babyId: string) => ['photos', familyId, babyId, 'timeline'] as const,
  detail: (familyId: string, babyId: string, photoId: string) =>
    ['photos', familyId, babyId, 'detail', photoId] as const,
  preview: (familyId: string, babyId: string, photoId: string, variant: string) =>
    ['photos', familyId, babyId, 'preview', photoId, variant] as const,
};
