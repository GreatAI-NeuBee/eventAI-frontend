// src/utils/toiletutils.ts
export type Toilet = {
  id: string;
  position: [number, number];
  label?: string;
  fixtures?: number;
};

export function addToilet(
  toilets: Toilet[],
  position: [number, number],
  options?: { label?: string; fixtures?: number }
): Toilet[] {
  const id = `toilet-${Date.now()}`;
  return [
    ...toilets,
    {
      id,
      position,
      label: options?.label ?? `Toilet ${toilets.length + 1}`,
      fixtures: options?.fixtures ?? 4,
    },
  ];
}
