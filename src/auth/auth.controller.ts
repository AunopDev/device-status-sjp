import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    const user = this.authService.login(
      loginDto.username,
      loginDto.password_hash,
    );

    if (!user) {
      throw new UnauthorizedException('Username or password is incorrect');
    }

    return {
      message: 'Login successful',
      user,
    };
  }
}
