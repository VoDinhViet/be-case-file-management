import { StringField } from '../../../decorators/field.decorators';

export class UpdateFcmTokenReqDto {
  @StringField({ maxLength: 512 })
  fcmToken: string;
}

