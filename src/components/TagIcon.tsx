import type { ElementType } from 'react';
import WorkOutlineRoundedIcon from '@mui/icons-material/WorkOutlineRounded';
import RestaurantRoundedIcon from '@mui/icons-material/RestaurantRounded';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';
import StarOutlineRoundedIcon from '@mui/icons-material/StarOutlineRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import CommitRoundedIcon from '@mui/icons-material/CommitRounded';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import LanOutlinedIcon from '@mui/icons-material/LanOutlined';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import CodeRoundedIcon from '@mui/icons-material/CodeRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import FitnessCenterRoundedIcon from '@mui/icons-material/FitnessCenterRounded';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import type { SvgIconProps } from '@mui/material';
import { parseDateTag } from '../lib/calendar';

const ICONS: Record<string, ElementType<SvgIconProps>> = {
  work: WorkOutlineRoundedIcon,
  job: WorkOutlineRoundedIcon,
  office: WorkOutlineRoundedIcon,
  food: RestaurantRoundedIcon,
  recipe: RestaurantRoundedIcon,
  recipes: RestaurantRoundedIcon,
  dinner: RestaurantRoundedIcon,
  lunch: RestaurantRoundedIcon,
  dessert: RestaurantRoundedIcon,
  movie: MovieOutlinedIcon,
  movies: MovieOutlinedIcon,
  film: MovieOutlinedIcon,
  important: StarOutlineRoundedIcon,
  star: StarOutlineRoundedIcon,
  favorite: FavoriteBorderRoundedIcon,
  done: CheckCircleOutlineRoundedIcon,
  todo: TaskAltOutlinedIcon,
  task: TaskAltOutlinedIcon,
  database: StorageRoundedIcon,
  db: StorageRoundedIcon,
  git: CommitRoundedIcon,
  jira: BugReportOutlinedIcon,
  bug: BugReportOutlinedIcon,
  ticket: ConfirmationNumberOutlinedIcon,
  ip: LanOutlinedIcon,
  aws: CloudOutlinedIcon,
  cloud: CloudOutlinedIcon,
  code: CodeRoundedIcon,
  dev: CodeRoundedIcon,
  book: MenuBookRoundedIcon,
  reading: MenuBookRoundedIcon,
  health: FitnessCenterRoundedIcon,
  home: HomeOutlinedIcon,
  shopping: ShoppingBagOutlinedIcon,
  study: SchoolOutlinedIcon,
  idea: LightbulbOutlinedIcon,
  ideas: LightbulbOutlinedIcon,
  invoice: ReceiptLongOutlinedIcon,
  link: LinkRoundedIcon,
  links: LinkRoundedIcon,
  image: ImageOutlinedIcon,
  images: ImageOutlinedIcon,
};

export default function TagIcon({
  tag,
  ...props
}: { tag: string } & SvgIconProps) {
  const key = tag.toLowerCase();
  const Icon = ICONS[key];
  if (Icon) return <Icon {...props} />;
  const dateTag = parseDateTag(tag);
  if (dateTag) {
    return dateTag.hasTime ? (
      <ScheduleOutlinedIcon {...props} />
    ) : (
      <EventOutlinedIcon {...props} />
    );
  }
  return <LocalOfferOutlinedIcon {...props} />;
}
