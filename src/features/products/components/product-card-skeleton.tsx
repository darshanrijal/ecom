import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProductCardSkeleton() {
  return (
    <Card className="gap-0 overflow-hidden p-0 ring-0">
      <CardContent className="p-0">
        <Skeleton className="aspect-square rounded-none rounded-t-xl" />
      </CardContent>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-5 w-1/3" />
      </div>

      <CardFooter className="px-4 pt-0 pb-4">
        <Skeleton className="h-8 w-full rounded-md" />
      </CardFooter>
    </Card>
  );
}
