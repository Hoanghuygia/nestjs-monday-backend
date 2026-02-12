import { IsArray, IsNumber, IsObject, IsOptional } from 'class-validator';

export class SuccessResponseDTO<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  @IsOptional()
  @IsNumber()
  count: number;

  @IsOptional()
  @IsArray()
  records: T[];

  @IsOptional()
  @IsObject()
  payload: any;

  constructor() {
    this.count = 0;
    this.records = [];
  }
}
