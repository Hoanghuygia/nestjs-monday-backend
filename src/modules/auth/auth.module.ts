import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { TokenCacheService } from "./token-cache.service";
import { AccountService } from "../account/account.service";
import { ManageService } from "../management/manage.service";

@Module({
    controllers: [AuthController],
    providers: [AuthService, TokenCacheService, AccountService, ManageService],
    exports: [AuthService]
})
export class AuthModule { }