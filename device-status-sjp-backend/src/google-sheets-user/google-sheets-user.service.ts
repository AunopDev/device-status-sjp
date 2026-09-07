import { Injectable } from '@nestjs/common';
import getGoogleSheet from '../google-sheets/google-sheets';

@Injectable()
export class GoogleSheetsUserService {
  async findAll(): Promise<unknown[]> {
    return await getGoogleSheet('user!A:N');
  }
}
