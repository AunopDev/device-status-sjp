import { Injectable } from '@nestjs/common';
import getGoogleSheet from '../google-sheets-data/googleSheet';

@Injectable()
export class DecodersService {
  async findAll(): Promise<unknown[]> {
    return getGoogleSheet('decoder!A:Q');
  }
}
