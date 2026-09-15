export const babyKeys = {
  all: ['babies'] as const,
  family: (familyId: string) => ['babies', familyId] as const,
  familyWithArchived: (familyId: string) => ['babies', familyId, 'with-archived'] as const,
  detail: (familyId: string, babyId: string) => ['babies', familyId, babyId] as const,
};
