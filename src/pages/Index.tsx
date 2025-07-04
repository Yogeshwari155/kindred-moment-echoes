import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MomentCard } from "@/components/MomentCard";
import { PostCard } from "@/components/PostCard";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { NewPostModal } from "@/components/NewPostModal";
import { MapPin, Heart, Users, Sparkles, Clock } from "lucide-react";
import kindredLogo from "@/assets/kindred-logo.png";
import momentScene from "@/assets/moment-scene.jpg";

const Index = () => {
  const [showNewPost, setShowNewPost] = useState(false);
  const [currentView, setCurrentView] = useState<'landing' | 'home' | 'moment'>('landing');
  const [posts, setPosts] = useState([
    {
      id: 1,
      content: "The way the afternoon light hits this coffee cup feels like a warm hug. Sometimes the simplest moments are the most beautiful.",
      mood: "calm",
      timestamp: "2 minutes ago",
      type: "text" as const
    },
    {
      id: 2,
      content: "Just ordered the same drink as the person next to me by coincidence. Small world connections everywhere! ☕️",
      mood: "excited",
      timestamp: "5 minutes ago",
      type: "text" as const
    }
  ]);

  const handleNewPost = (content: string, mood: string) => {
    const newPost = {
      id: posts.length + 1,
      content,
      mood,
      timestamp: "just now",
      type: "text" as const
    };
    setPosts([newPost, ...posts]);
  };

  if (currentView === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        {/* Hero Section */}
        <div className="px-4 py-12 text-center">
          <div className="animate-fade-in">
            <img 
              src={kindredLogo} 
              alt="Kindred Moments" 
              className="w-20 h-20 mx-auto mb-6 animate-float"
            />
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-warm bg-clip-text text-transparent mb-4">
              Kindred Moments
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Discover the magic of shared experiences. Connect anonymously with people around you who are living the same moment.
            </p>
          </div>
        </div>

        {/* Feature Preview */}
        <div className="px-4 py-8">
          <Card className="max-w-md mx-auto mb-8 animate-scale-in">
            <CardHeader>
              <div className="w-full h-40 bg-cover bg-center rounded-lg mb-4" 
                   style={{ backgroundImage: `url(${momentScene})` }}>
                <div className="w-full h-full bg-black/20 rounded-lg flex items-end p-4">
                  <div className="text-white">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">Coffee shop on 5th Ave</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-2 bg-moment-active rounded-full animate-pulse" />
                      <span className="text-xs">3 people sharing this moment</span>
                    </div>
                  </div>
                </div>
              </div>
              <CardTitle className="text-center">Active Moment Detected</CardTitle>
              <CardDescription className="text-center">
                Join the conversation and share what you're experiencing right now
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="moment" 
                className="w-full"
                onClick={() => setCurrentView('home')}
              >
                <Heart className="h-4 w-4 mr-2" />
                Experience Kindred Moments
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features Grid */}
        <div className="px-4 py-12">
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="text-center animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-warm rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-lg">Location Magic</CardTitle>
                <CardDescription>
                  Automatically detect when you're sharing a moment with others nearby
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-warm rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-lg">Anonymous Connection</CardTitle>
                <CardDescription>
                  Connect without revealing personal info - just pure human moments
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-warm rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-lg">Ephemeral Beauty</CardTitle>
                <CardDescription>
                  Moments disappear after 24 hours, keeping connections authentic
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'moment') {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        {/* Header */}
        <div className="px-4 py-6 border-b bg-card/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => setCurrentView('home')}
            >
              ← Back
            </Button>
            <div className="text-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                <span>Coffee shop on 5th Ave</span>
              </div>
              <div className="flex items-center gap-1 justify-center">
                <Clock className="h-3 w-3" />
                <span className="text-xs text-muted-foreground">Since 2:43 PM</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">3</span>
            </div>
          </div>
        </div>

        {/* Mood Summary */}
        <div className="px-4 py-4 bg-muted/30">
          <div className="flex items-center justify-center gap-4">
            <span className="text-2xl">🫶</span>
            <span className="text-2xl">☕️</span>
            <span className="text-2xl">✨</span>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-2">
            Calm • Cozy • Inspired
          </p>
        </div>

        {/* Posts Grid */}
        <div className="px-4 py-6">
          <div className="grid gap-4 max-w-md mx-auto">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                content={post.content}
                mood={post.mood}
                timestamp={post.timestamp}
                type={post.type}
              />
            ))}
          </div>
        </div>

        <FloatingActionButton onClick={() => setShowNewPost(true)} />
        <NewPostModal 
          isOpen={showNewPost}
          onClose={() => setShowNewPost(false)}
          onSubmit={handleNewPost}
        />
      </div>
    );
  }

  // Home view
  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <div className="px-4 py-6 bg-card/50 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={kindredLogo} alt="Kindred" className="w-8 h-8" />
            <h1 className="text-xl font-semibold">Kindred Moments</h1>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setCurrentView('landing')}
          >
            About
          </Button>
        </div>
      </div>

      {/* Current Moment */}
      <div className="px-4 py-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <div className="h-2 w-2 bg-moment-active rounded-full animate-pulse" />
          Current Moment
        </h2>
        <MomentCard
          location="Coffee shop on 5th Ave"
          time="Since 2:43 PM"
          isActive={true}
          userCount={3}
          moodTags={["🫶 calm", "☕️ cozy", "✨ inspired"]}
          onClick={() => setCurrentView('moment')}
        />
      </div>

      {/* Past Moments */}
      <div className="px-4 py-6">
        <h2 className="text-lg font-semibold mb-4">Recent Moments</h2>
        <div className="space-y-4">
          <MomentCard
            location="Central Park bench"
            time="Yesterday, 6:30 PM"
            moodTags={["🌅 peaceful", "💭 reflective"]}
          />
          <MomentCard
            location="Museum of Art"
            time="2 days ago, 3:15 PM"
            moodTags={["🎨 inspired", "🤔 curious"]}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;