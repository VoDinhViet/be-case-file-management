import { StringField, UUIDField } from '../../../decorators/field.decorators';

export class CreateTokenReqDto {
  @UUIDField()
  userId!: string;

  @StringField()
  tokenExpo: string;
}
