import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TooltipTitleProps {
  title: string | undefined;
  render: React.ComponentProps<typeof TooltipTrigger>["render"];
}
export const TooltipTitle = ({ render, title }: TooltipTitleProps) => {
  return (
    <Tooltip>
      <TooltipTrigger render={render} />
      <TooltipContent>
        <p>{title}</p>
      </TooltipContent>
    </Tooltip>
  );
};
