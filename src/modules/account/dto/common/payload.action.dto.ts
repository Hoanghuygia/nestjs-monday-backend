import { IsNotEmpty, IsNumber, IsObject, IsString } from "class-validator";

export class PayloadDTO<
    TInputFields extends Record<string, any> = Record<string, any>
> {
    @IsString()
    @IsNotEmpty()
    blockKind!: string;

    @IsObject()
    credentialsValues!: Record<string, any>;

    @IsObject()
    inboundFieldValues!: Record<string, any>;

    @IsObject()
    inputFields!: TInputFields;

    @IsNumber()
    recipeId!: number;

    @IsNumber()
    integrationId!: number;
}