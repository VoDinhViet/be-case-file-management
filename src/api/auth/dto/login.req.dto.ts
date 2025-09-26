import {
  PasswordField,
  StringField,
} from '../../../decorators/field.decorators';

export class LoginReqDto {
  @StringField()
  username!: string;

  @PasswordField()
  password!: string;
}
