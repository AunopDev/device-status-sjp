import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PublicUser, UserService } from './user.service';

@Controller('user')
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll(): Promise<PublicUser[]> {
    return this.userService.findAllPublic();
  }
}
