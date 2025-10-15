import { StringField, StringFieldOptional } from '../../../decorators/field.decorators';

export class SendFcmNotificationReqDto {
  @StringField()
  userId: string;

  @StringField()
  title: string;

  @StringField()
  body: string;

  @StringFieldOptional()
  imageUrl?: string;
}

