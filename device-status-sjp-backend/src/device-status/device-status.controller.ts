import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { DeviceStatusService } from './device-status.service';

@Controller('device-status')
@UseGuards(AuthGuard)
export class DeviceStatusController {
  constructor(private readonly deviceStatusService: DeviceStatusService) {}

  @Get('devices')
  getDevices(): ReturnType<DeviceStatusService['getDevices']> {
    return this.deviceStatusService.getDevices();
  }
}
