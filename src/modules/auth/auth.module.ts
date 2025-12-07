import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { TokenCacheService } from "./token-cache.service";

@Module({
    controllers:[AuthController],
    providers: [AuthService, TokenCacheService]
})

export class AuthModule {}