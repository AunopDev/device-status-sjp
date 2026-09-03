import { Injectable } from '@nestjs/common';
import getGoogleSheet from '../google-sheets-data/googleSheet';

@Injectable()
export class ProjectService {
  async findAll(): Promise<unknown[]> {
    return getGoogleSheet('project!A:X');
  }
}
