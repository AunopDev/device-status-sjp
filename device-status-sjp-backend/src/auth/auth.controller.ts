import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SessionService } from './session.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly sessionService: SessionService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    if (typeof loginDto.username !== 'string' || typeof loginDto.password !== 'string' || loginDto.username.trim().length === 0 || loginDto.username.length > 100 || loginDto.password.length === 0 || loginDto.password.length > 200) {
      throw new UnauthorizedException('Username or password is incorrect');
    }
    const user = await this.authService.login(
      loginDto.username,
      loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Username or password is incorrect');
    }

    return {
      message: 'Login successful',
      user,
      token: this.sessionService.create(),
    };
  }
}
