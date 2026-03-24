-- Create skill_analytics table
CREATE TABLE public.skill_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  skill TEXT NOT NULL,
  proficiency_level INTEGER NOT NULL DEFAULT 1 CHECK (proficiency_level >= 1 AND proficiency_level <= 5),
  projects_completed INTEGER NOT NULL DEFAULT 0,
  total_earnings NUMERIC NOT NULL DEFAULT 0,
  avg_rating NUMERIC,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_activity_log table
CREATE TABLE public.user_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.skill_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for skill_analytics
CREATE POLICY "Users can view their own skill analytics"
ON public.skill_analytics FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own skill analytics"
ON public.skill_analytics FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own skill analytics"
ON public.skill_analytics FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own skill analytics"
ON public.skill_analytics FOR DELETE
USING (user_id = auth.uid());

-- RLS Policies for user_activity_log
CREATE POLICY "Users can view their own activity log"
ON public.user_activity_log FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own activity log"
ON public.user_activity_log FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_skill_analytics_user_id ON public.skill_analytics(user_id);
CREATE INDEX idx_skill_analytics_skill ON public.skill_analytics(skill);
CREATE INDEX idx_user_activity_log_user_id ON public.user_activity_log(user_id);
CREATE INDEX idx_user_activity_log_created_at ON public.user_activity_log(created_at);

-- Trigger for updating updated_at
CREATE TRIGGER update_skill_analytics_updated_at
BEFORE UPDATE ON public.skill_analytics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();