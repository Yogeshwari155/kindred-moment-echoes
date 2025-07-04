import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PostCardProps {
  content: string;
  mood?: string;
  timestamp: string;
  type: 'text' | 'image';
  imageUrl?: string;
}

export const PostCard = ({ content, mood, timestamp, type, imageUrl }: PostCardProps) => {
  const moodColors = {
    calm: 'bg-mood-calm text-white',
    excited: 'bg-mood-excited text-white',
    nostalgic: 'bg-mood-nostalgic text-white',
    default: 'bg-accent text-accent-foreground'
  };

  return (
    <Card className="animate-fade-in hover:shadow-soft transition-all duration-300">
      <CardContent className="p-4">
        {type === 'image' && imageUrl && (
          <div className="mb-3">
            <img 
              src={imageUrl} 
              alt="Moment capture" 
              className="w-full h-32 object-cover rounded-lg"
            />
          </div>
        )}
        
        <p className="text-sm text-foreground leading-relaxed mb-3">
          {content}
        </p>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {timestamp}
          </span>
          
          {mood && (
            <Badge 
              className={`text-xs ${moodColors[mood as keyof typeof moodColors] || moodColors.default}`}
            >
              {mood}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};