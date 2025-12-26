import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus, Metadata } from '@grpc/grpc-js';
import { AppException, ErrorStatus } from '@shareai/contracts/src';

// helper: map HTTP-like status -> gRPC status
function toGrpcStatus(httpStatus: number): number {
  if (httpStatus === 400) return GrpcStatus.INVALID_ARGUMENT;
  if (httpStatus === 401) return GrpcStatus.UNAUTHENTICATED;
  if (httpStatus === 403) return GrpcStatus.PERMISSION_DENIED;
  if (httpStatus === 404) return GrpcStatus.NOT_FOUND;
  if (httpStatus === 409) return GrpcStatus.ALREADY_EXISTS;
  if (httpStatus === 429) return GrpcStatus.RESOURCE_EXHAUSTED;
  return GrpcStatus.INTERNAL;
}

@Catch()
export class GrpcExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    console.log('🔥 GrpcExceptionFilter caught:', exception);
    console.log('Exception type:', exception?.constructor?.name);
    console.log('Is AppException?', exception instanceof AppException);

    const rpc = host.switchToRpc();
    const handlerPath = (rpc.getContext?.() as any)?.handler?.path ?? 'grpc';

    const payload =
      exception instanceof AppException
        ? {
            ...exception.payload,
            status:
              exception.payload.status ??
              ErrorStatus[exception.payload.code] ??
              500,
            service: exception.payload.service ?? 'auth',
            path: exception.payload.path ?? handlerPath,
            timestamp: new Date().toISOString(),
          }
        : {
            code: 'INTERNAL',
            message: exception?.message ?? 'Internal error',
            status: 500,
            service: 'auth',
            path: handlerPath,
            timestamp: new Date().toISOString(),
          };

    // Level 2 payload (proto-like, type safe on your side)
    // Chưa encode google.rpc.Status-bin ở đây để tránh bạn phải build extra libs ngay.
    // Ta gắn payload JSON vào gRPC metadata "x-app-error" (Gateway đọc được).
    const md = new Metadata();
    md.set('x-app-error', JSON.stringify(payload));

    const error = {
      code: toGrpcStatus(payload.status),
      message: payload.message,
      metadata: md,
    };

    throw new RpcException(error);
  }
}
