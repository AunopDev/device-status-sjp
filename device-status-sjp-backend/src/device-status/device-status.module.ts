import { Module } from '@nestjs/common';
import { GoogleSheetsModule } from '../google-sheets/google-sheets-module';
import { DeviceStatusController } from './device-status.controller';
import { DeviceStatusService } from './device-status.service';

@Module({
  imports: [GoogleSheetsModule],
  controllers: [DeviceStatusController],
  providers: [DeviceStatusService],
})
export class DeviceStatusModule {}
