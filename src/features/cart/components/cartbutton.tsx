import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ShoppingCartIcon } from "lucide-react";

export const CartButton = () => {
  return (
    <Sheet>
      <SheetTrigger
        nativeButton={false}
        render={
          <div className="relative">
            <Button
              variant={"outline"}
              size={"icon"}
              className="relative rounded-full"
            >
              <ShoppingCartIcon />
            </Button>
            <Badge className="absolute -top-2 -right-4 rounded-full bg-orange-400">
              9
            </Badge>
          </div>
        }
      />
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Your Cart</SheetTitle>
          <SheetDescription>
            Add, remove or update quantity of your cart items
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
};
