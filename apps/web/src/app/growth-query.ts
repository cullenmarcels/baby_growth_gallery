export const growthKeys = {
  all: ['growth'] as const,
  scope: (familyId: string, babyId: string, birthDate: string, sex: string | null) =>
    ['growth', familyId, babyId, birthDate, sex] as const,
};
