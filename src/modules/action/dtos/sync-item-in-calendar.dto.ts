import { CalendarConfig } from "@/src/modules/@type/calendar-config.type";
import { ActionRequestDTO } from "@/src/modules/account/dto/common/_action.dto";
import { IsObject, IsString } from "class-validator";

class SyncItemInCalendarFieldsDTO {
    @IsString()
    currentBoardId!: string;

    @IsString()
    itemId!: string;

    @IsObject()
    calendarConfig!: CalendarConfig;
}

export class SyncItemInCalendarDTO extends ActionRequestDTO<SyncItemInCalendarFieldsDTO> { }