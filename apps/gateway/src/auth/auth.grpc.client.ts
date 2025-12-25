import { Injectable, OnModuleInit } from '@nestjs/common';
import * as microservices from '@nestjs/microservices';
import { join } from 'path';
import { Observable } from 'rxjs';

export type AuthResponse = { accessToken: string; userId: string };
export type RegisterRequest = {
  email: string;
  username: string;
  password: string;
};
export type LoginRequest = { emailOrUsername: string; password: string };

export interface AuthServiceGrpc {
  Register(data: RegisterRequest): Observable<AuthResponse>;
  Login(data: LoginRequest): Observable<AuthResponse>;
}

@Injectable()
export class AuthGrpcClient implements OnModuleInit {
  private svc!: AuthServiceGrpc;

  constructor(private client: microservices.ClientGrpc) {}

  onModuleInit() {
    this.svc = this.client.getService<AuthServiceGrpc>('AuthService');
  }

  get service() {
    return this.svc;
  }

  static clientProvider() {
    return microservices.ClientsModule.register([
      {
        name: 'AUTH_GRPC',
        transport: microservices.Transport.GRPC,
        options: {
          url: process.env.AUTH_GRPC_URL ?? 'localhost:50051',
          package: 'shareai.auth',
          protoPath: require.resolve('@shareai/proto/auth.proto'),
        },
      },
    ]);
  }
}
