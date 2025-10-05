import {
  PasswordField,
  StringField,
} from '../../../decorators/field.decorators';

export class CreateUserReqDto {
  @StringField()
  fullName: string;

  @StringField()
  phone: string;

  @PasswordField()
  password: string;
}
