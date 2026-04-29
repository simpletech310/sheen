export const SHEEN = {
  ink: '#0A0A0A',
  bone: '#FAFAF7',
  cobalt: '#1E40FF',
  wax: '#C9A961',
  mist: '#E8E6E0',
  smoke: '#6E6E6A',
  good: '#157449',
  bad: '#A12B2B',
} as const;

export type SheenToken = keyof typeof SHEEN;
