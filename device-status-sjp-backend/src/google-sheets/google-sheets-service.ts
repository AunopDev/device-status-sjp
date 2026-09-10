import { Injectable } from '@nestjs/common';
import getGoogleSheet from './google-sheets';
import { GOOGLE_SHEET_RANGES } from './google-sheets-config';

@Injectable()
export class GoogleSheetsService {
  async findAll(
    sheetName: 'project' | 'node' | 'device' | 'user' | 'decoder',
  ): Promise<unknown[]> {
    return getGoogleSheet(GOOGLE_SHEET_RANGES[sheetName]);
  }
}
