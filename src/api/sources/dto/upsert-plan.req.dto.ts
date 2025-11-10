import {
  DateFieldOptional,
  StringFieldOptional,
} from '../../../decorators/field.decorators';

export class UpsertPlanReqDto {
  @StringFieldOptional({
    description: 'Kết quả điều tra',
  })
  investigationResult?: string;

  @StringFieldOptional({
    each: true,
    description: 'Danh sách vật chứng',
    example: ['Dao gây án', 'Súng K59', 'Ma túy 50g'],
  })
  exhibits?: string[];

  @StringFieldOptional({
    description: 'Mục đích yêu cầu điều tra tiếp theo',
  })
  nextInvestigationPurpose?: string;

  @StringFieldOptional({
    each: true,
    description: 'Nội dung điều tra tiếp theo',
    example: ['Hỏi cung bị can', 'Xác minh nhân thân'],
  })
  nextInvestigationContent?: string[];

  @StringFieldOptional({
    each: true,
    description: 'Lực lượng tham gia',
    example: ['Điều tra viên Nguyễn Văn A', 'Cán bộ điều tra tổng hợp'],
  })
  participatingForces?: string[];

  @DateFieldOptional({
    description: 'Ngày bắt đầu',
  })
  startDate?: Date;

  @DateFieldOptional({
    description: 'Ngày kết thúc',
  })
  endDate?: Date;

  @StringFieldOptional({
    description: 'Ngân sách',
  })
  budget?: string;
}

