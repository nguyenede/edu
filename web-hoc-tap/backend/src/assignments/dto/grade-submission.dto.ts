import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class GradeSubmissionDto {
  @IsNumber()
  @Min(0, { message: 'Score cannot be negative' })
  @IsNotEmpty({ message: 'Score is required' })
  score: number;

  @IsString()
  @IsOptional()
  feedback?: string;
}
