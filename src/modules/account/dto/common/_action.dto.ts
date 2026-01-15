import { ValidateNested } from "class-validator";
import { PayloadDTO } from "./payload.action.dto";
import { RuntimeMetaDataDTO } from "./runtime-meta-data.dto";
import { Type } from "class-transformer";

export class ActionRequestDTO<
    TInputFields extends Record<string,any> = Record<string, any>
> {
    @ValidateNested()
    @Type(() => PayloadDTO)
    payload!: PayloadDTO<TInputFields>;

    @ValidateNested()
    @Type(() => RuntimeMetaDataDTO)
    runtimeMetadata!: RuntimeMetaDataDTO;
}