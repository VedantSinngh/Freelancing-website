-- Create announcements table for platform-wide communications
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info, warning, success, maintenance
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_pinned BOOLEAN DEFAULT false,
  target_roles TEXT[] -- null means all users, otherwise specific roles
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Announcements are viewable by everyone"
ON public.announcements FOR SELECT
USING (expires_at IS NULL OR expires_at > now());

CREATE POLICY "Admins can manage announcements"
ON public.announcements FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create disputes table
CREATE TABLE public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  raised_by UUID NOT NULL,
  against_user UUID,
  dispute_type TEXT NOT NULL, -- payment, collaboration, content, behavior
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open, investigating, resolved, closed
  resolution_notes TEXT,
  resolved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view disputes they're involved in"
ON public.disputes FOR SELECT
USING (raised_by = auth.uid() OR against_user = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create disputes"
ON public.disputes FOR INSERT
WITH CHECK (raised_by = auth.uid());

CREATE POLICY "Admins can manage disputes"
ON public.disputes FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create consultant reports table
CREATE TABLE public.consultant_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL,
  booking_id UUID REFERENCES public.consultancy_bookings(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  file_url TEXT,
  shared_with UUID[], -- array of user IDs who can access
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.consultant_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Consultants can create their own reports"
ON public.consultant_reports FOR INSERT
WITH CHECK (consultant_id = auth.uid());

CREATE POLICY "Consultants can update their own reports"
ON public.consultant_reports FOR UPDATE
USING (consultant_id = auth.uid());

CREATE POLICY "Reports viewable by consultant and shared users"
ON public.consultant_reports FOR SELECT
USING (
  consultant_id = auth.uid() 
  OR auth.uid() = ANY(shared_with)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Create mentorship requests table
CREATE TABLE public.mentorship_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentee_id UUID NOT NULL,
  mentor_id UUID NOT NULL,
  idea_id UUID,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.mentorship_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their mentorship requests"
ON public.mentorship_requests FOR SELECT
USING (mentee_id = auth.uid() OR mentor_id = auth.uid());

CREATE POLICY "Users can create mentorship requests"
ON public.mentorship_requests FOR INSERT
WITH CHECK (mentee_id = auth.uid());

CREATE POLICY "Mentors can respond to their requests"
ON public.mentorship_requests FOR UPDATE
USING (mentor_id = auth.uid());

-- Create content moderation table
CREATE TABLE public.content_moderation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL, -- project, comment, message, profile
  content_id UUID NOT NULL,
  reported_by UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, reviewed, action_taken, dismissed
  moderator_notes TEXT,
  action_taken TEXT, -- warning, content_removed, user_suspended, dismissed
  reviewed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.content_moderation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can report content"
ON public.content_moderation FOR INSERT
WITH CHECK (reported_by = auth.uid());

CREATE POLICY "Admins can manage moderation"
ON public.content_moderation FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trust level to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trust_level TEXT DEFAULT 'active' CHECK (trust_level IN ('active', 'verified', 'flagged', 'suspended'));

-- Add mentor mode to consultant profiles
ALTER TABLE public.consultant_profiles
ADD COLUMN IF NOT EXISTS mentor_mode_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS consultation_slots JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS bio_long TEXT;

-- Create indexes for performance
CREATE INDEX idx_announcements_expires_at ON public.announcements(expires_at);
CREATE INDEX idx_disputes_status ON public.disputes(status);
CREATE INDEX idx_consultant_reports_consultant ON public.consultant_reports(consultant_id);
CREATE INDEX idx_mentorship_requests_status ON public.mentorship_requests(status);
CREATE INDEX idx_content_moderation_status ON public.content_moderation(status);

-- Create trigger for consultant reports updated_at
CREATE TRIGGER update_consultant_reports_updated_at
BEFORE UPDATE ON public.consultant_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();