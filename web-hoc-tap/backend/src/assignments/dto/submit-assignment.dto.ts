import { IsNotEmpty, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SubmissionAnswerDto {
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @IsString()
  @IsNotEmpty()
  answerContent: string; // User selected option IDs, text input, matching mapping, etc.
}

export class SubmitAssignmentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmissionAnswerDto)
  answers: SubmissionAnswerDto[];
}
