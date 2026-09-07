import { Module } from '@nestjs/common';
import { GoogleSheetsController } from './google-sheets-controller';
import { GoogleSheetsService } from './google-sheets-service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  controllers: [GoogleSheetsController],
  providers: [GoogleSheetsService],
})
export class GoogleSheetsModule {}
