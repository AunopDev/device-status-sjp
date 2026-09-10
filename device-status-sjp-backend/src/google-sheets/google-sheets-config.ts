export const GOOGLE_SHEET_RANGES = {
  user: 'user!A:N',
  decoder: 'decoder!A:Q',
  node: 'node!A:O',
  device: 'device!A:AA',
  project: 'project!A:X',
} as const;

export type GoogleSheetName = keyof typeof GOOGLE_SHEET_RANGES;
