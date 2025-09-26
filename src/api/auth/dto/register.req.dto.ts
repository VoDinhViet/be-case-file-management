import {
  PasswordField,
  StringField,
} from '../../../decorators/field.decorators';

export class RegisterReqDto {

  @StringField()
  fullName!: string;

  @StringField()
  phone!: string;

  @PasswordField()
  password!: string;

  @StringField()
  referralCode!: string;
}
