import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { SessionService } from '../auth/session.service';
import { AuthGuard } from '../auth/auth.guard';

@Module({
  controllers: [UserController],
  providers: [UserService, SessionService, AuthGuard],
  exports: [UserService, SessionService, AuthGuard],
})
export class UserModule {}
