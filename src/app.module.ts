import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { GoogleSheetsModule } from './google-sheets/google-sheets.module';
import { DevicesModule } from './device/devices.module';
import { NodesModule } from './node/nodes.module';
// import { DecodersModule } from './decoder/decoders.module';
import { UserService } from './user/user.service';
import { UserController } from './user/user.controller';
import { UserModule } from './user/user.module';
import { ProjectModule } from './project/project.module';

@Module({
  imports: [
    AuthModule,
    GoogleSheetsModule,
    DevicesModule,
    NodesModule,
    // DecodersModule,
    UserModule,
    ProjectModule,
  ],

  controllers: [AppController, UserController],
  providers: [AppService, UserService],
})
export class AppModule {}
