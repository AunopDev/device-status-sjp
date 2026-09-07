import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { GoogleSheetsModule } from './google-sheets/google-sheets-module';
import { DeviceStatusModule } from './device-status/device-status.module';

@Module({
  imports: [AuthModule, UserModule, GoogleSheetsModule, DeviceStatusModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
