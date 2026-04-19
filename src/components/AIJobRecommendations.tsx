import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
});

interface Recommendation {
  project_id: string;
  score: number;
  reason: string;
  project: {
    id: string;
    title: string;
    description: string;
    budget: number;
    skills_required: string[];
    deadline: string;
  };
}

export const AIJobRecommendations = () => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);

  const handleGenerateRecommendations = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`${API_URL}/ai/job-recommendations`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({})
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Failed to generate recommendations');
      }
      const data = await res.json();
      setRecommendations(data.recommendations || []);
      toast({
        title: "Recommendations generated!",
        description: "AI has analyzed your profile and found matching projects.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate recommendations",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Job Recommendations
        </CardTitle>
        <CardDescription>
          Get personalized project recommendations based on your skills and history
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!recommendations && !isGenerating && (
          <Button
            onClick={handleGenerateRecommendations}
            disabled={isGenerating}
            className="w-full"
          >
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate AI Recommendations
            </>
          </Button>
        )}

        {isGenerating && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {recommendations && recommendations.length === 0 && (
          <p className="text-center text-muted-foreground py-4">
            No open projects found matching your skills right now. Complete your profile with skills to improve matches.
          </p>
        )}

        {recommendations && recommendations.length > 0 && (
          <>
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <Card key={rec.project_id} className="border-l-4 border-l-primary">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">{rec.project.title}</h4>
                      <Badge variant="secondary" className="ml-2">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {rec.score}% Match
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {rec.project.description}
                    </p>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {rec.project.skills_required?.slice(0, 3).map((skill: string) => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>

                    <p className="text-xs text-primary italic mb-3">
                      💡 {rec.reason}
                    </p>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        Budget: ${rec.project.budget}
                      </span>
                      <Link to={`/workspace/${rec.project_id}`}>
                        <Button size="sm">View Project</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button
              onClick={handleGenerateRecommendations}
              disabled={isGenerating}
              variant="outline"
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                "Refresh Recommendations"
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
