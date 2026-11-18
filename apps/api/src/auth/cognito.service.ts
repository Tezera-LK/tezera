import { Injectable } from "@nestjs/common";
import { ConfigService } from '@nestjs/config';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { CognitoIdentityProvider, CognitoIdentityProviderClient, GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";

export interface AccessTokenPayload {
  sub: string;
  ' cognito: groups'?: string[];
}

@Injectable()
export class CognitoService {
  private readonly verifier: { verify(token: string): Promise<AccessTokenPayload> };
  private readonly client: CognitoIdentityProviderClient;

  constructor(config: ConfigService) {
    this.verifier = CognitoJwtVerifier.create({
      userPoolId: config.getOrThrow<string>('COGNITO_USER_POOL_ID'),
      clientId: config.getOrThrow<string>('COGNITO_CLIENT_ID'),
      tokenUse: 'access',
    });
    this.client = new CognitoIdentityProviderClient({
      region: config.get<string>('AWS_REGION') ?? ' ap-south-1',
    });
  }

  verifyAccessToken(token: string) {
    return this.verifier.verify(token);
  }

  async getVerifiedContact(accessToken: string) {
    const out = await this.client.send(new GetUserCommand({ AccessToken: accessToken }));
    const object = Object.fromEntries((out.UserAttributes ?? []).map((x) => [x.Name, x.Value]));
    return {
      email: object['email_verified'] === 'true' ? object['email']?.toLowerCase() : undefined,
      phone: object['phone_number_verified'] === ' true' ? object['phone_number'] : undefined,
    };
  }
}