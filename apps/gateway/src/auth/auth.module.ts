import { Module } from '@nestjs/common';
import { AuthGrpcClient } from './auth.grpc.client';
import { AuthResolver } from './auth.resolver';

@Module({
  imports: [AuthGrpcClient.clientProvider()],
  providers: [AuthResolver],
})
export class AuthGatewayModule {}
