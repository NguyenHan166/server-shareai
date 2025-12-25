import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AuthService } from './auth.service';

type RegisterRequest = { email: string; username: string; password: string };
type LoginRequest = { emailOrUsername: string; password: string };
type AuthResponse = { accessToken: string; userId: string };

@Controller()
export class AuthController {
  constructor(private auth: AuthService) {}

  @GrpcMethod('AuthService', 'Register')
  async register(data: RegisterRequest): Promise<AuthResponse> {
    return this.auth.register(data.email, data.username, data.password);
  }

  @GrpcMethod('AuthService', 'Login')
  async login(data: LoginRequest): Promise<AuthResponse> {
    return this.auth.login(data.emailOrUsername, data.password);
  }
}
