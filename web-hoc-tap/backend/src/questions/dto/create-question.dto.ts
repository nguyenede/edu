import { IsNotEmpty, IsString, IsEnum, IsOptional, IsArray, ValidateNested, IsNumber, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

class QuestionOptionDto {
  @IsString()
  @IsNotEmpty({ message: 'Option content is required' })
  content: string;

  @IsBoolean()
  isCorrect: boolean;

  @IsNumber()
  @IsOptional()
  orderIndex?: number;

  @IsString()
  @IsOptional()
  matchKey?: string;
}

export class CreateQuestionDto {
  @IsString()
  @IsOptional()
  questionBankId?: string;

  @IsString()
  @IsNotEmpty({ message: 'Question content is required' })
  content: string;

  @IsString()
  @IsNotEmpty({ message: 'Question type is required' })
  type: string; // MULTIPLE_CHOICE, MULTIPLE_SELECT, TRUE_FALSE, SHORT_ANSWER, MATCHING, ORDERING, FILL_IN_THE_BLANK

  @IsString()
  @IsNotEmpty({ message: 'Difficulty level is required' })
  difficulty: string; // EASY, MEDIUM, HARD

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsNumber()
  @Min(0)
  @IsOptional()
  points?: number;

  @IsString()
  @IsOptional()
  explanation?: string;

  @IsNumber()
  @Min(5)
  @IsOptional()
  timeLimit?: number;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options: QuestionOptionDto[];
}
