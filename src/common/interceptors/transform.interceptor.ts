import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { StandardResponse } from '../filters/dtos/standard-response';
import { SuccessResponseDTO } from '../filters/dtos/success-response.dto';
@Injectable()
export class TransformInterceptor<T extends Record<string, any>>
  implements NestInterceptor<T, StandardResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<StandardResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        const successData = new SuccessResponseDTO<T>();
        
        if (data && data.records && Array.isArray(data.records)) {
          successData.records = data.records;
          successData.count = data.count ?? data.records.length;
        } else {
          successData.records = Array.isArray(data) ? data : [data];
          successData.count = Array.isArray(data) ? data.length : 1;
        }
        return StandardResponse.success(successData, "SUCCESS");
      }),
    );
  }
}