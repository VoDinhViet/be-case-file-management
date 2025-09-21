import { Exclude, Expose } from 'class-transformer';
import { StringField } from '../../../decorators/field.decorators';

@Exclude()
export class RegisterResDto {
  @Expose()
  @StringField()
  userId!: string;
}
