import { Logger } from "@mondaycom/apps-sdk/dist/types/utils/logger";
import { Injectable } from "@nestjs/common";
import axios from "axios";

@Injectable()
export class AuthService{
    private readonly logger: Logger = new Logger(AuthService.name);

    

    async exchangeCodeForToken(code: string): Promise<string>{
        const oauth2Url = 'https://auth.example.com/oauth2/token';


        const body = {
            code: code,
            Client_id: process.env.CLIENT_ID,
            Client_secret: process.env.CLIENT_SECRET,
            redirect_uri: process.env.REDIRECT_URI,
            grant_type: 'authorization_code'
        }

        const response = await axios.post(oauth2Url, body, {
            headers: {
                'Content-Type': 'application/json'
            }
        })

        return response.data.access_token;
    }
}