import { Controller } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { Metadata, status as GrpcStatus } from '@grpc/grpc-js';
import { AuthService } from './auth.service';
import { AppException, ErrorStatus } from '@shareai/contracts/src';

type RegisterRequest = { email: string; username: string; password: string };
type LoginRequest = { emailOrUsername: string; password: string };
type AuthResponse = { accessToken: string; userId: string };

@Controller()
export class AuthController {
  constructor(private auth: AuthService) {}

  private handleException(exception: any): never {
    const payload =
      exception instanceof AppException
        ? {
            ...exception.payload,
            status:
              exception.payload.status ??
              ErrorStatus[exception.payload.code] ??
              500,
            service: 'auth',
          }
        : {
            code: 'INTERNAL',
            message: exception?.message ?? 'Internal error',
            status: 500,
            service: 'auth',
          };

    const md = new Metadata();
    md.set('x-app-error', JSON.stringify(payload));

    const grpcStatus =
      payload.status === 400
        ? GrpcStatus.INVALID_ARGUMENT
        : payload.status === 401
          ? GrpcStatus.UNAUTHENTICATED
          : payload.status === 403
            ? GrpcStatus.PERMISSION_DENIED
            : payload.status === 404
              ? GrpcStatus.NOT_FOUND
              : payload.status === 409
                ? GrpcStatus.ALREADY_EXISTS
                : GrpcStatus.INTERNAL;

    throw new RpcException({
      code: grpcStatus,
      message: payload.message,
      metadata: md,
    });
  }

  @GrpcMethod('AuthService', 'Register')
  async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      return await this.auth.register(data.email, data.username, data.password);
    } catch (err) {
      this.handleException(err);
    }
  }

  @GrpcMethod('AuthService', 'Login')
  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      return await this.auth.login(data.emailOrUsername, data.password);
    } catch (err) {
      this.handleException(err);
    }
  }
}
