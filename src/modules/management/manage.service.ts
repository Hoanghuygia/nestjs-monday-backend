import { 
    EnvironmentVariablesManager, 
    SecretsManager, 
    SecureStorage, 
    Storage 
} from '@mondaycom/apps-sdk';
import { ApiClient } from '@mondaydotcomorg/api';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MondayServerSdk } from 'monday-sdk-js';
import initMonday from 'monday-sdk-js';
import { JsonValue } from 'node_modules/@mondaycom/apps-sdk/dist/types/types/general';

@Injectable()
export class ManageService {
    private readonly secureStorage: InstanceType<typeof SecureStorage>;
    private readonly secretManager: InstanceType<typeof SecretsManager>;
    private readonly environmentManager: InstanceType<typeof EnvironmentVariablesManager>;

    constructor(private configService: ConfigService) {
         
        this.secureStorage = new SecureStorage();
        this.secretManager = new SecretsManager();
        this.environmentManager = new EnvironmentVariablesManager();
    }

    getServer(token: string, apiVersion: string = this.configService.get<string>('API_VERSION', "2025-10")): MondayServerSdk {
        return initMonday({ token, apiVersion });
    }

    getMondayClient(token: string, apiVersion: string = this.configService.get<string>('API_VERSION', "2025-10")): ApiClient {
        return new ApiClient({ token, apiVersion });
    }

    getSecureStorage(): InstanceType<typeof SecureStorage> {
        return this.secureStorage;
    }

    getSecretManager(): InstanceType<typeof SecretsManager> {
        return this.secretManager;
    }

    getEnv(key: string): JsonValue | undefined {
        return this.environmentManager.get(key);
    }

    getSecret(key: string): JsonValue | undefined {
        return this.secretManager.get(key);
    }

    createStorage(accessToken: string): InstanceType<typeof Storage> {
        return new Storage(accessToken);
    }
}
