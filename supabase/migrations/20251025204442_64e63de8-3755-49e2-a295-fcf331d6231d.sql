-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'client', 'freelancer', 'consultant');

-- Create project status enum
CREATE TYPE public.project_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled');

-- Create bid status enum
CREATE TYPE public.bid_status AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    skills TEXT[],
    hourly_rate DECIMAL(10,2),
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create projects table
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    budget DECIMAL(10,2) NOT NULL,
    deadline DATE,
    status project_status DEFAULT 'open' NOT NULL,
    skills_required TEXT[],
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create bids table
CREATE TABLE public.bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    freelancer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    timeline TEXT NOT NULL,
    proposal TEXT,
    status bid_status DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (project_id, freelancer_id)
);

-- Create messages table
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create files table
CREATE TABLE public.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    uploader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create milestones table
CREATE TABLE public.milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create consultancy_bookings table
CREATE TABLE public.consultancy_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    consultant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_date TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL,
    notes TEXT,
    report_url TEXT,
    status TEXT DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create ideas table
CREATE TABLE public.ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create comments table
CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create likes table
CREATE TABLE public.likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (idea_id, user_id)
);

-- Create achievements table
CREATE TABLE public.achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultancy_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- RLS Policies for projects
CREATE POLICY "Projects are viewable by everyone"
ON public.projects FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Clients can create projects"
ON public.projects FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'client') AND client_id = auth.uid()
);

CREATE POLICY "Clients can update their own projects"
ON public.projects FOR UPDATE
TO authenticated
USING (client_id = auth.uid());

CREATE POLICY "Clients can delete their own projects"
ON public.projects FOR DELETE
TO authenticated
USING (client_id = auth.uid());

-- RLS Policies for bids
CREATE POLICY "Bids are viewable by project owner and bidder"
ON public.bids FOR SELECT
TO authenticated
USING (
  freelancer_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.projects WHERE id = bids.project_id AND client_id = auth.uid())
);

CREATE POLICY "Freelancers can create bids"
ON public.bids FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'freelancer') AND freelancer_id = auth.uid()
);

CREATE POLICY "Freelancers can update their own bids"
ON public.bids FOR UPDATE
TO authenticated
USING (freelancer_id = auth.uid());

CREATE POLICY "Project owners can update bid status"
ON public.bids FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = bids.project_id AND client_id = auth.uid())
);

-- RLS Policies for messages
CREATE POLICY "Messages viewable by project participants"
ON public.messages FOR SELECT
TO authenticated
USING (
  sender_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.projects WHERE id = messages.project_id AND client_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.bids WHERE project_id = messages.project_id AND freelancer_id = auth.uid() AND status = 'accepted')
);

CREATE POLICY "Project participants can send messages"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND client_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.bids WHERE project_id = messages.project_id AND freelancer_id = auth.uid() AND status = 'accepted')
  )
);

-- RLS Policies for files
CREATE POLICY "Files viewable by project participants"
ON public.files FOR SELECT
TO authenticated
USING (
  uploader_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.projects WHERE id = files.project_id AND client_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.bids WHERE project_id = files.project_id AND freelancer_id = auth.uid() AND status = 'accepted')
);

CREATE POLICY "Project participants can upload files"
ON public.files FOR INSERT
TO authenticated
WITH CHECK (
  uploader_id = auth.uid() AND (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND client_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.bids WHERE project_id = files.project_id AND freelancer_id = auth.uid() AND status = 'accepted')
  )
);

-- RLS Policies for milestones
CREATE POLICY "Milestones viewable by project participants"
ON public.milestones FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = milestones.project_id AND client_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.bids WHERE project_id = milestones.project_id AND freelancer_id = auth.uid() AND status = 'accepted')
);

CREATE POLICY "Project participants can manage milestones"
ON public.milestones FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = milestones.project_id AND client_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.bids WHERE project_id = milestones.project_id AND freelancer_id = auth.uid() AND status = 'accepted')
);

-- RLS Policies for consultancy_bookings
CREATE POLICY "Bookings viewable by involved parties"
ON public.consultancy_bookings FOR SELECT
TO authenticated
USING (client_id = auth.uid() OR consultant_id = auth.uid());

CREATE POLICY "Clients can create bookings"
ON public.consultancy_bookings FOR INSERT
TO authenticated
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Involved parties can update bookings"
ON public.consultancy_bookings FOR UPDATE
TO authenticated
USING (client_id = auth.uid() OR consultant_id = auth.uid());

-- RLS Policies for ideas
CREATE POLICY "Ideas are viewable by everyone"
ON public.ideas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create ideas"
ON public.ideas FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own ideas"
ON public.ideas FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own ideas"
ON public.ideas FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- RLS Policies for comments
CREATE POLICY "Comments are viewable by everyone"
ON public.comments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create comments"
ON public.comments FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
ON public.comments FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- RLS Policies for likes
CREATE POLICY "Likes are viewable by everyone"
ON public.likes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can like"
ON public.likes FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unlike"
ON public.likes FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- RLS Policies for achievements
CREATE POLICY "Achievements are viewable by everyone"
ON public.achievements FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage achievements"
ON public.achievements FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.files;
ALTER PUBLICATION supabase_realtime ADD TABLE public.milestones;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bids_updated_at BEFORE UPDATE ON public.bids
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ideas_updated_at BEFORE UPDATE ON public.ideas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();