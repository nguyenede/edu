import { IsNotEmpty, IsString, Length } from 'class-validator';

export class JoinClassDto {
  @IsString()
  @IsNotEmpty({ message: 'Class code is required' })
  @Length(6, 6, { message: 'Class code must be exactly 6 characters' })
  code: string;
}
