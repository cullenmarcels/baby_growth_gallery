export function isUsername(value: string): boolean {
  const normalized = value.normalize('NFC');
  return (
    [...normalized].length <= 32 &&
    !/[^\p{Script=Han}a-zA-Z0-9_-]/u.test(normalized) &&
    /[\p{Script=Han}a-zA-Z0-9]/u.test(normalized)
  );
}
