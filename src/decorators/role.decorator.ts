import { SetMetadata } from '@nestjs/common';
import { RoleEnum } from '../api/auth/types/role.enum';
import { ROLE_KEY } from '../constants/app.constant';

export const Roles = (...role: RoleEnum[]) => SetMetadata(ROLE_KEY, role);
