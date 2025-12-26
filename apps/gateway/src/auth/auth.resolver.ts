import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import * as microservices from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { GraphQLError } from 'graphql';
import { AuthServiceGrpc } from './auth.grpc.client';
import { AuthPayload, RegisterInput, LoginInput } from './dto';

function parseGrpcAppError(err: any) {
  const md = err?.metadata;
  const raw = md?.get?.('x-app-error')?.[0];

  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {}
  }

  // fallback nếu server chưa attach metadata
  return {
    code: 'INTERNAL',
    message: err?.message ?? 'Internal error',
    status: 500,
  };
}

@Resolver()
export class AuthResolver {
  private svc: AuthServiceGrpc;

  constructor(@Inject('AUTH_GRPC') private client: microservices.ClientGrpc) {
    this.svc = this.client.getService<AuthServiceGrpc>('AuthService');
  }

  @Mutation(() => AuthPayload)
  async register(@Args('input') input: RegisterInput): Promise<AuthPayload> {
    try {
      return await firstValueFrom(this.svc.Register(input));
    } catch (err) {
      const e = parseGrpcAppError(err);
      throw new GraphQLError(e.message, {
        extensions: {
          code: e.code,
          http: { status: e.status },
          details: e.details,
          traceId: e.traceId,
        },
      });
    }
  }

  @Mutation(() => AuthPayload)
  async login(@Args('input') input: LoginInput): Promise<AuthPayload> {
    try {
      return await firstValueFrom(this.svc.Login(input));
    } catch (err) {
      const e = parseGrpcAppError(err);
      throw new GraphQLError(e.message, {
        extensions: {
          code: e.code,
          http: { status: e.status },
          details: e.details,
          traceId: e.traceId,
        },
      });
    }
  }
}
