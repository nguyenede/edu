import { IsNotEmpty, IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsDateString, Min } from 'class-validator';

export class CreateQuizDto {
  @IsString()
  @IsNotEmpty({ message: 'Quiz title is required' })
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  classId?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  timeLimit?: number; // in minutes

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxAttempts?: number;

  @IsDateString()
  @IsOptional()
  deadline?: string;

  @IsBoolean()
  @IsOptional()
  showAnswers?: boolean;

  @IsBoolean()
  @IsOptional()
  showScore?: boolean;

  @IsBoolean()
  @IsOptional()
  isRealtime?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  questionIds?: string[];
}
