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

        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-12" />
          <div className="flex gap-1.5">
            <Skeleton className="h-7 w-14 rounded-md" />
            <Skeleton className="h-7 w-14 rounded-md" />
          </div>
        </div>
      </div>

      <CardFooter className="px-4 pt-0 pb-4">
        <Skeleton className="h-8 w-full rounded-md" />
      </CardFooter>
    </Card>
  );
}
