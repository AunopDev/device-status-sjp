import { Injectable } from '@nestjs/common';
import getGoogleSheet from '../google-sheets-data/googleSheet';

@Injectable()
export class DevicesService {
  async findAll(): Promise<unknown[]> {
    return getGoogleSheet('device!A:AA');
  }
}
