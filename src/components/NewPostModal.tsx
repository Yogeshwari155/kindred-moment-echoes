import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Camera, Palette, Send } from "lucide-react";

interface NewPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string, mood: string) => void;
}

const moods = [
  { emoji: "🫶", label: "calm", color: "bg-mood-calm" },
  { emoji: "🤩", label: "excited", color: "bg-mood-excited" },
  { emoji: "💭", label: "nostalgic", color: "bg-mood-nostalgic" },
  { emoji: "😌", label: "peaceful", color: "bg-accent" },
  { emoji: "✨", label: "inspired", color: "bg-primary-glow" },
];

export const NewPostModal = ({ isOpen, onClose, onSubmit }: NewPostModalProps) => {
  const [content, setContent] = useState("");
  const [selectedMood, setSelectedMood] = useState("");

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit(content, selectedMood);
      setContent("");
      setSelectedMood("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md animate-scale-in">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold bg-gradient-warm bg-clip-text text-transparent">
            Share this moment
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Textarea
            placeholder="What are you feeling right now?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px] resize-none border-0 bg-muted/50 focus:bg-muted/70 transition-colors"
            maxLength={300}
          />
          
          <div className="text-right text-xs text-muted-foreground">
            {content.length}/300
          </div>
          
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">How are you feeling?</p>
            <div className="flex gap-2 flex-wrap">
              {moods.map((mood) => (
                <Card
                  key={mood.label}
                  className={`cursor-pointer p-3 transition-all duration-200 hover:scale-105 ${
                    selectedMood === mood.label 
                      ? 'ring-2 ring-primary shadow-warm' 
                      : 'hover:shadow-soft'
                  }`}
                  onClick={() => setSelectedMood(mood.label)}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-lg">{mood.emoji}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {mood.label}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              disabled
            >
              <Camera className="h-4 w-4 mr-1" />
              Photo
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              disabled
            >
              <Palette className="h-4 w-4 mr-1" />
              Sketch
            </Button>
          </div>
          
          <Button 
            variant="moment" 
            className="w-full" 
            onClick={handleSubmit}
            disabled={!content.trim()}
          >
            <Send className="h-4 w-4 mr-2" />
            Share moment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};