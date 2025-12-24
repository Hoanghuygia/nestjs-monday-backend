import { IsArray, IsNumber } from 'class-validator';

export class ErrorResponseDTO<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  @IsNumber()
  count: number;

  @IsArray()
  records: T[];

  constructor() {
    this.count = 0;
    this.records = [];
  }
}
