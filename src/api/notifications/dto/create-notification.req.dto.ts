import { StringField } from '../../../decorators/field.decorators';

export class CreateNotificationReqDto {
  @StringField()
  title!: string;

  @StringField()
  body!: string;
}
