import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { CognitoService } from "./cognito.service";
import { roleFromGroups } from "./roles";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private cognito: CognitoService, private prisma: PrismaService) { }

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const header: string | undefined = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException();
    const token = header.slice(7);

    let payload;
    try {
      payload = await this.cognito.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException();
    }

    const role = roleFromGroups(payload['cognito:groups']);
    if (!role) throw new ForbiddenException('ROLE_MISSING');

    let user = await this.prisma.user.findUnique({ where: { cognitoSub: payload.sub } });
    if (!user) {
      const { email, phone } = await this.cognito.getVerifiedContact(token);
      if (!email && !phone) throw new ForbiddenException('CONTACT_NOT_VERIFIED');
      try {
        user = await this.prisma.user.create({
          data: { cognitoSub: payload.sub, email, phone, role },
        });
      } catch {
        user = await this.prisma.user.findUnique({ where: { cognitoSub: payload.sub } });
        if (!user) throw new ForbiddenException('PROFILE_FAILED');
      }
    } else if (user.role !== role) {
      user = await this.prisma.user.update({ where: { id: user.id }, data: { role } });
    }
    if (user.status !== 'active') throw new ForbiddenException('ACCOUNT_NOT_ACTIVE');
    req.auth = payload;
    req.user = user;
    return true;
  }
}