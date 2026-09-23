export const milestoneKeys = {
  all: ['milestones'] as const,
  templates: (familyId: string, babyId: string) =>
    ['milestones', familyId, babyId, 'templates'] as const,
  overview: (familyId: string, babyId: string, fromOn: string) =>
    ['milestones', familyId, babyId, 'overview', fromOn] as const,
  list: (familyId: string, babyId: string, state: 'PENDING' | 'COMPLETED') =>
    ['milestones', familyId, babyId, 'list', state] as const,
  detail: (familyId: string, babyId: string, milestoneId: string) =>
    ['milestones', familyId, babyId, 'detail', milestoneId] as const,
};
