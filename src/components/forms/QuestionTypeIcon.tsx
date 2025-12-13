import {
  Type,
  AlignLeft,
  CircleDot,
  CheckSquare,
  Calendar,
  Upload,
  ChevronDown,
  Star,
} from 'lucide-react';
import { QuestionType } from '@/types/form';

interface QuestionTypeIconProps {
  type: QuestionType;
  className?: string;
}

const iconMap = {
  short_text: Type,
  long_text: AlignLeft,
  multiple_choice: CircleDot,
  checkbox: CheckSquare,
  date: Calendar,
  file_upload: Upload,
  dropdown: ChevronDown,
  rating: Star,
};

export const QuestionTypeIcon = ({ type, className }: QuestionTypeIconProps) => {
  const Icon = iconMap[type];
  return <Icon className={className} />;
};
