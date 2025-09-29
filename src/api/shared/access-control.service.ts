import { Injectable } from '@nestjs/common';
import { RoleEnum } from '../auth/types/role.enum';

interface IsAuthorizedParams {
  currentRole: RoleEnum;
  requiredRole: RoleEnum;
}

@Injectable()
export class AccessControlService {
  private hierarchies: Array<Map<string, number>> = [];
  private priority: number = 1;

  constructor() {
    this.buildRoles([RoleEnum.STAFF, RoleEnum.ADMIN]);
  }

  private buildRoles(roles: RoleEnum[]) {
    const hierarchy: Map<string, number> = new Map();

    roles.forEach((role) => {
      hierarchy.set(role, this.priority);
      this.priority++;
    });

    this.hierarchies.push(hierarchy);
  }

  public isAuthorized({ currentRole, requiredRole }: IsAuthorizedParams) {
    for (const hierarchy of this.hierarchies) {
      const priority = hierarchy.get(currentRole);
      const requiredPriority = hierarchy.get(requiredRole);

      if (priority && requiredPriority && priority >= requiredPriority) {
        return true;
      }
    }

    return false;
  }

  // public async isInOpenTime() {
  //   const { openTime, closeTime, openFullTime } = (
  //     await this.settingsService.getEnvSettings()
  //   )[0];
  //
  //   const currentHour = new Date().getHours();
  //   if (openFullTime) {
  //     return true;
  //   }
  //
  //   return (
  //     currentHour >= openTime.getHours() && currentHour < closeTime.getHours()
  //   );
  // }
}
