import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Award, 
  Brain,
  BarChart3,
  Loader2,
  Lightbulb,
  Star
} from "lucide-react";
import { motion } from "framer-motion";

interface SkillData {
  skill: string;
  proficiency_level: number;
  projects_completed: number;
  total_earnings: number;
  avg_rating?: number;
}

interface Insight {
  strongestSkills: Array<{ skill: string; reason: string }>;
  improvementAreas: Array<{ skill: string; suggestion: string }>;
  recommendations: Array<{ title: string; description: string; priority: string }>;
  marketTrends: string[];
}

export const SkillAnalyticsDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [skills, setSkills] = useState<SkillData[]>([]);
  const [insights, setInsights] = useState<Insight | null>(null);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    fetchSkillData();
  }, [user]);

  const fetchSkillData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('skill_analytics')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      setSkills(data || []);
    } catch (error) {
      console.error('Error fetching skill data:', error);
      toast.error("Failed to load skill data");
    } finally {
      setLoading(false);
    }
  };

  const analyzeSkills = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-skills', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        }
      });

      if (error) throw error;

      setInsights(data.insights);
      setSummary(data.summary);
      setSkills(data.skills);
      toast.success("Analysis complete!");
    } catch (error: any) {
      console.error('Error analyzing skills:', error);
      toast.error(error.message || "Failed to analyze skills");
    } finally {
      setAnalyzing(false);
    }
  };

  const getProficiencyColor = (level: number) => {
    if (level >= 4) return "text-green-600";
    if (level >= 3) return "text-blue-600";
    if (level >= 2) return "text-yellow-600";
    return "text-red-600";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Action */}
      <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <BarChart3 className="h-6 w-6 text-primary" />
                Skill Analytics Dashboard
              </CardTitle>
              <CardDescription className="mt-2">
                AI-powered insights into your skills, performance, and growth opportunities
              </CardDescription>
            </div>
            <Button 
              onClick={analyzeSkills} 
              disabled={analyzing || skills.length === 0}
              className="gap-2"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Analyze Skills
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {summary && (
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{summary.totalSkills}</p>
                <p className="text-sm text-muted-foreground">Skills Tracked</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{summary.totalProjects}</p>
                <p className="text-sm text-muted-foreground">Projects Completed</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{summary.averageProficiency}/5</p>
                <p className="text-sm text-muted-foreground">Avg Proficiency</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {skills.length === 0 ? (
        <Card className="p-8">
          <div className="text-center space-y-4">
            <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">No Skill Data Yet</h3>
              <p className="text-muted-foreground mt-2">
                Start working on projects to build your skill analytics
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Tabs defaultValue="skills" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="skills">
              <Target className="h-4 w-4 mr-2" />
              Skills
            </TabsTrigger>
            <TabsTrigger value="insights" disabled={!insights}>
              <Lightbulb className="h-4 w-4 mr-2" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="recommendations" disabled={!insights}>
              <Award className="h-4 w-4 mr-2" />
              Recommendations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="skills" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Skills</CardTitle>
                <CardDescription>Track your proficiency and performance across skills</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {skills.map((skill, idx) => (
                  <motion.div
                    key={skill.skill}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold">{skill.skill}</h4>
                        <Badge variant="outline" className={getProficiencyColor(skill.proficiency_level)}>
                          Level {skill.proficiency_level}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{skill.projects_completed} projects</span>
                        <span>${skill.total_earnings}</span>
                        {skill.avg_rating && (
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {skill.avg_rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Progress value={skill.proficiency_level * 20} className="h-2" />
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            {insights && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      Strongest Skills
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {insights.strongestSkills.map((item, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800"
                      >
                        <h4 className="font-semibold text-green-900 dark:text-green-100">{item.skill}</h4>
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">{item.reason}</p>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-orange-600" />
                      Areas for Improvement
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {insights.improvementAreas.map((item, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800"
                      >
                        <h4 className="font-semibold text-orange-900 dark:text-orange-100">{item.skill}</h4>
                        <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">{item.suggestion}</p>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Market Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {insights.marketTrends.map((trend, idx) => (
                        <motion.li
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="flex items-start gap-2 text-sm"
                        >
                          <span className="text-primary mt-1">•</span>
                          <span>{trend}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            {insights && (
              <div className="grid gap-4">
                {insights.recommendations.map((rec, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg">{rec.title}</CardTitle>
                          <Badge variant={getPriorityColor(rec.priority)}>
                            {rec.priority} priority
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">{rec.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};