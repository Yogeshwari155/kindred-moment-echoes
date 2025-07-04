import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface FloatingActionButtonProps {
  onClick: () => void;
}

export const FloatingActionButton = ({ onClick }: FloatingActionButtonProps) => {
  return (
    <Button
      variant="floating"
      size="fab"
      className="fixed bottom-6 right-6 animate-float z-50"
      onClick={onClick}
    >
      <Plus className="h-6 w-6" />
    </Button>
  );
};