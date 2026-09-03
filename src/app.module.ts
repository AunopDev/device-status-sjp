import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { GoogleSheetsModule } from './google-sheets/google-sheets.module';
import { DevicesModule } from './devices/devices.module';
import { NodesModule } from './nodes/nodes.module';
import { DecodersModule } from './decoders/decoders.module';

@Module({
  imports: [
    AuthModule,
    GoogleSheetsModule,
    DevicesModule,
    NodesModule,
    DecodersModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
