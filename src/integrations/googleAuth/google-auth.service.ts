import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class GoogleAuthService {
  private client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  async verifyGoogleToken(idToken: string) {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (!payload) throw new UnauthorizedException('Invalid Google token');

      return {
        googleId: payload.sub, 
        issuer: payload.iss, 
        audience: payload.aud, 
        email: payload.email,
        emailVerified: payload.email_verified,
        name: payload.name,
        firstName: payload.given_name,
        lastName: payload.family_name,
        picture: payload.picture,
        locale: payload.locale,
        issuedAt: payload.iat, 
        expiresAt: payload.exp, 
        hostedDomain: payload.hd,
        nonce: payload.nonce,
        azp: payload.azp, 
      };
    } catch (err) {
      throw new UnauthorizedException('Google token invalid or expired');
    }
  }
}
