import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { GoogleSheetsService } from './../google-sheets/google-sheets-service';

@Controller('google-sheets')
@UseGuards(AuthGuard)
export class GoogleSheetsController {
  constructor(private readonly googleSheetsService: GoogleSheetsService) {}

  @Get('users')
  findUsers(): Promise<unknown[]> {
    return this.googleSheetsService.findAll('user');
  }

  @Get('nodes')
  findNodes(): Promise<unknown[]> {
    return this.googleSheetsService.findAll('node');
  }

  @Get('devices')
  findDevices(): Promise<unknown[]> {
    return this.googleSheetsService.findAll('device');
  }

  @Get('projects')
  findProjects(): Promise<unknown[]> {
    return this.googleSheetsService.findAll('project');
  }

  @Get('decoders')
  findDecoders(): Promise<unknown[]> {
    return this.googleSheetsService.findAll('decoder');
  }
}
