import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { AuthGatewayModule } from './auth/auth.module';
import { HealthResolver } from './health.resolver';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      playground: true, // dev only
      includeStacktraceInErrorResponses: false,
      formatError: (error) => {
        const extensions = error.extensions || {};
        const formatted: any = {
          message: error.message,
          code: extensions.code || 'INTERNAL_SERVER_ERROR',
        };
        if (extensions.details) {
          formatted.details = extensions.details;
        }
        if (extensions.traceId) {
          formatted.traceId = extensions.traceId;
        }
        return formatted;
      },
    }),
    AuthGatewayModule,
  ],
  providers: [HealthResolver],
})
export class AppModule {}
