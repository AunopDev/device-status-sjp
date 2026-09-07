import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly authService = inject(AuthService);
  readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);

  username = signal('');
  password = signal('');
  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');

  submit(): void {
    const username = this.username().trim();
    const password = this.password();

    if (!username || !password) {
      this.errorMessage.set('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.login(username, password).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err?.status === 401
            ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
            : 'ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง',
        );
      },
    });
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }
}
