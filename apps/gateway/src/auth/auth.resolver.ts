import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import * as microservices from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AuthGrpcClient, AuthServiceGrpc } from './auth.grpc.client';
import { AuthPayload, RegisterInput, LoginInput } from './dto';

@Resolver()
export class AuthResolver {
  private svc: AuthServiceGrpc;

  constructor(@Inject('AUTH_GRPC') private client: microservices.ClientGrpc) {
    this.svc = this.client.getService<AuthServiceGrpc>('AuthService');
  }

  @Mutation(() => AuthPayload)
  async register(@Args('input') input: RegisterInput): Promise<AuthPayload> {
    const res = await firstValueFrom(this.svc.Register(input));
    return res;
  }

  @Mutation(() => AuthPayload)
  async login(@Args('input') input: LoginInput): Promise<AuthPayload> {
    const res = await firstValueFrom(this.svc.Login(input));
    return res;
  }
}
