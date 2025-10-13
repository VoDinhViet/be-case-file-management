import { CaseStatusEnum } from '../../../database/schemas';
import { EnumFieldOptional } from '../../../decorators/field.decorators';

export class UpdateCaseReqDto {
  @EnumFieldOptional(() => CaseStatusEnum, { default: CaseStatusEnum.PENDING })
  status?: CaseStatusEnum; // Trạng thái vụ án
}
