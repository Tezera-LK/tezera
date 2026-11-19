import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import { CognitoService } from './cognito.service';

@Module({
  controllers: [AuthController],
  providers: [CognitoService, AuthGuard, RolesGuard],
  exports: [CognitoService, AuthGuard, RolesGuard],
})

export class AuthModule { }
