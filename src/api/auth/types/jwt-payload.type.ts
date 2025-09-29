import { RoleEnum } from './role.enum';

export type JwtPayloadType = {
  id: string;
  sessionId: string;
  role: RoleEnum;
  iat: number;
  exp: number;
};
