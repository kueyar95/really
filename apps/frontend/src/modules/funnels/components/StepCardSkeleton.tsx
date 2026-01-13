import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { StepCardItemSkeleton } from "./StepCardItemSkeleton";

export function StepCardSkeleton() {
  return (
    <Card className="min-w-[360px] w-[360px] h-fit rounded-2xl">
      <CardHeader className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-4 w-6" />
        </div>
        <Skeleton className="h-4 w-full mt-2" />
      </CardHeader>
      <Separator orientation="horizontal" />
      <CardContent className="p-4 min-h-[524px]">
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <StepCardItemSkeleton key={index} />
          ))}
        </div>
      </CardContent>
      <Separator orientation="horizontal" />
      <CardFooter className="p-4">
        <div className="flex justify-between w-full">
          <Skeleton className="h-8 w-8" />
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-8" />
            ))}
          </div>
          <Skeleton className="h-8 w-8" />
        </div>
      </CardFooter>
    </Card>
  );
}
