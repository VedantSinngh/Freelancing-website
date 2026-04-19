import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Brain,
  BarChart3,
  Loader2,
  Lightbulb,
  Star,
  Plus
} from "lucide-react";
import { motion } from "framer-motion";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
});

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
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [skills, setSkills] = useState<SkillData[]>([]);
  const [insights, setInsights] = useState<Insight | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [newSkill, setNewSkill] = useState('');
  const [newLevel, setNewLevel] = useState('3');

  useEffect(() => {
    if (user) fetchSkillData();
  }, [user]);

  const fetchSkillData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/skill-analytics`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to load skill data');
      const data = await res.json();
      setSkills(data || []);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const addSkill = async () => {
    if (!newSkill.trim()) return;
    try {
      const res = await fetch(`${API_URL}/skill-analytics`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ skill: newSkill.trim(), proficiency_level: parseInt(newLevel) })
      });
      if (!res.ok) throw new Error('Failed to add skill');
      setNewSkill('');
      setNewLevel('3');
      fetchSkillData();
      toast({ title: 'Success', description: 'Skill added to your analytics' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const analyzeSkills = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch(`${API_URL}/skill-analytics/analyze`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({})
      });
      if (!res.ok) throw new Error('Failed to analyze skills');
      const data = await res.json();
      if (data.skills) setSkills(data.skills);
      if (data.insights) setInsights(data.insights);
      if (data.summary) setSummary(data.summary);
      toast({ title: '✅ Analysis complete!', description: 'AI has generated insights for your skills.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
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

  const getPriorityColor = (priority: string): "destructive" | "default" | "secondary" | "outline" => {
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

      {/* Add Skill */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a Skill to Track</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Skill name (e.g. React, Python)"
              value={newSkill}
              onChange={e => setNewSkill(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSkill()}
              className="flex-1"
            />
            <select
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={newLevel}
              onChange={e => setNewLevel(e.target.value)}
            >
              {[1,2,3,4,5].map(l => <option key={l} value={l}>Level {l}</option>)}
            </select>
            <Button onClick={addSkill} className="gap-1">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {skills.length === 0 ? (
        <Card className="p-8">
          <div className="text-center space-y-4">
            <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">No Skill Data Yet</h3>
              <p className="text-muted-foreground mt-2">
                Add your skills above to start tracking analytics and get AI insights.
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
                    transition={{ delay: idx * 0.05 }}
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