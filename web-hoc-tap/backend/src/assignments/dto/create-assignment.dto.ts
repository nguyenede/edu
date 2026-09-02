import { IsNotEmpty, IsString, IsOptional, IsNumber, IsDateString, Min } from 'class-validator';

export class CreateAssignmentDto {
  @IsString()
  @IsNotEmpty({ message: 'Assignment title is required' })
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty({ message: 'Class ID is required' })
  classId: string;

  @IsString()
  @IsOptional()
  quizId?: string;

  @IsString()
  @IsOptional()
  documentFileId?: string;

  @IsDateString()
  @IsOptional()
  deadline?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxScore?: number;
}
