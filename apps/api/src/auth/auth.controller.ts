import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
import { RolesGuard } from "./roles.guard";
import { Roles } from "./roles.decorator";
import type { User } from "@prisma/client";

@Controller()
export class AuthController {
  @Get('me')
  @UseGuards(AuthGuard, RolesGuard)
  me(@Req() req: { user: User }) {
    return req.user;
  }

  @Get('organiser/ping') // test only
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('organiser')
  ping() {
    return { ok: true };
  }
}