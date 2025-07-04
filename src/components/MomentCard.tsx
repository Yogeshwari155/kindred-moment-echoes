import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Users, Heart } from "lucide-react";

interface MomentCardProps {
  location: string;
  time: string;
  isActive?: boolean;
  userCount?: number;
  moodTags?: string[];
  onClick?: () => void;
}

export const MomentCard = ({ 
  location, 
  time, 
  isActive = false, 
  userCount = 0, 
  moodTags = [],
  onClick 
}: MomentCardProps) => {
  return (
    <Card 
      className={`cursor-pointer transition-all duration-300 hover:shadow-warm hover:scale-105 ${
        isActive ? 'ring-2 ring-primary shadow-glow animate-glow' : ''
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="font-medium">{location}</span>
          </div>
          {isActive && (
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 bg-moment-active rounded-full animate-pulse" />
              <span className="text-xs text-moment-active font-medium">Live</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{time}</span>
          </div>
          {userCount > 0 && (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{userCount} connected</span>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {moodTags.length > 0 && (
          <div className="flex gap-2 mb-4">
            {moodTags.slice(0, 3).map((tag, index) => (
              <span 
                key={index}
                className="px-2 py-1 rounded-full text-xs bg-accent text-accent-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        
        {isActive && (
          <Button variant="moment" size="sm" className="w-full">
            <Heart className="h-4 w-4 mr-1" />
            Join Moment
          </Button>
        )}
      </CardContent>
    </Card>
  );
};