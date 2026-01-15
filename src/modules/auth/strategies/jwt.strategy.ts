import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from 'src/shared/interfaces/jwt-payload'; 

@Injectable()
export class JwtMagicLinkStrategy extends PassportStrategy(Strategy, 'magic-jwt') {
  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret ,
    });
  }

  async validate(payload: JwtPayload) {
  return { userId: payload.sub, email: payload.email };
}
}





