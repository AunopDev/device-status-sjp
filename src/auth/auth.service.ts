import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';

interface AuthenticatedUser {
  uuid: string;
  username: string;
  email: string;
  password_hash: string;
  created_at: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  login(username: string, password_hash: string) {
    const user = this.usersService.findByUsername(username);

    if (!user) {
      return null;
    }

    const authenticatedUser = user as unknown as AuthenticatedUser;

    if (authenticatedUser.password_hash !== password_hash) {
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
