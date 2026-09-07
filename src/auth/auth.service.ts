import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
  constructor(private readonly userService: UserService) {}

  async login(username: string, password: string) {
    const user = await this.userService.findByUsername(username);

    if (!user) {
      return null;
    }

    const authenticatedUser = user;

    const passwordMatches = await bcrypt.compare(
      password,
      authenticatedUser.password_hash,
    );

    if (!passwordMatches) {
      return null;
    }

    return {
      uuid: authenticatedUser.uuid,
      username: authenticatedUser.username,
      email: authenticatedUser.email,
      created_at: authenticatedUser.created_at,
    };
  }
}
