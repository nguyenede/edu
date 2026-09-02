import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateQuestionBankDto {
  @IsString()
  @IsNotEmpty({ message: 'Question bank name is required' })
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
