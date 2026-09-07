import { google } from 'googleapis';

import auth from './google-sheets-credentials';

const sheets = google.sheets({ version: 'v4', auth });

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
if (!GOOGLE_SHEET_ID) {
  throw new Error('GOOGLE_SHEET_ID is not defined in environment variables');
}

export default async function (range: string) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: range,
  });

  const rows = res.data.values;
  if (!rows || rows.length < 2) {
    console.log('No data found.');
    return [];
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  const objects = dataRows
    .map((row) => {
      const obj: Record<string, unknown> = {};
      headers.forEach((header, i) => {
        if (typeof header !== 'string' || header.startsWith('ignore:')) return;

        const value: unknown = row[i];

        const isValue = value === undefined || value === '' ? null : value;
        if (isValue === null) return;

        if (!header.startsWith('option:')) {
          obj[header] = isValue;
          return;
        }

        const [option, key] = header.split(':');
        if (!option || !key) return;

        const options = obj[option];
        if (
          typeof options !== 'object' ||
          options === null ||
          Array.isArray(options)
        ) {
          obj[option] = {};
        }

        (obj[option] as Record<string, unknown>)[key] = isValue;
      });

      return obj;
    })
    .filter((obj) => typeof obj.uuid === 'string' && obj.uuid.trim() !== '');

  return objects;
}
