import { Injectable } from '@nestjs/common';
import getGoogleSheet from '../google-sheets-data/googleSheet';

@Injectable()
export class NodesService {
  async findAll(): Promise<unknown[]> {
    return getGoogleSheet('node!A:O');
  }
}
