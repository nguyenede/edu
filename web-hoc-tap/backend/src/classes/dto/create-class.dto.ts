import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateClassDto {
  @IsString()
  @IsNotEmpty({ message: 'Class name is required' })
  @Length(2, 50, { message: 'Class name must be between 2 and 50 characters' })
  name: string;
}
