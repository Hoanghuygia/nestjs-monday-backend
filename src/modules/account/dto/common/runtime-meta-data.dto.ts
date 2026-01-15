import { IsNotEmpty, IsString } from "class-validator";

export class RuntimeMetaDataDTO {
    @IsString()
    @IsNotEmpty()
    actionUuid!: string;
    
    @IsString()
    @IsNotEmpty()
    triggerUuid!: string;
}