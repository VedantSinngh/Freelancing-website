-- Drop community-related tables
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.likes CASCADE;
DROP TABLE IF EXISTS public.ideas CASCADE;

-- Create friend system tables
CREATE TABLE public.friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id_2 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_id_1 < user_id_2),
  UNIQUE(user_id_1, user_id_2)
);

-- Create collaboration invites table
CREATE TABLE public.collaboration_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_email text NOT NULL,
  receiver_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enhance profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS position text,
  ADD COLUMN IF NOT EXISTS linkedin text,
  ADD COLUMN IF NOT EXISTS github text;

-- Create consultant profiles table
CREATE TABLE public.consultant_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  specialization text[],
  hourly_rate numeric NOT NULL DEFAULT 0,
  years_experience integer NOT NULL DEFAULT 0,
  company_name text,
  is_company boolean NOT NULL DEFAULT false,
  availability_notes text,
  certifications text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create consultancy availability table
CREATE TABLE public.consultancy_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(consultant_id, day_of_week, start_time)
);

-- Create consultancy documents table
CREATE TABLE public.consultancy_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.consultancy_bookings(id) ON DELETE CASCADE,
  uploader_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create consultancy payments table
CREATE TABLE public.consultancy_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.consultancy_bookings(id) ON DELETE CASCADE UNIQUE,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method text,
  transaction_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultant_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultancy_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultancy_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultancy_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friend_requests
CREATE POLICY "Users can view their friend requests"
  ON public.friend_requests FOR SELECT
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send friend requests"
  ON public.friend_requests FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update received requests"
  ON public.friend_requests FOR UPDATE
  USING (receiver_id = auth.uid());

-- RLS Policies for friendships
CREATE POLICY "Users can view their friendships"
  ON public.friendships FOR SELECT
  USING (user_id_1 = auth.uid() OR user_id_2 = auth.uid());

CREATE POLICY "System can create friendships"
  ON public.friendships FOR INSERT
  WITH CHECK (user_id_1 = auth.uid() OR user_id_2 = auth.uid());

CREATE POLICY "Users can delete their friendships"
  ON public.friendships FOR DELETE
  USING (user_id_1 = auth.uid() OR user_id_2 = auth.uid());

-- RLS Policies for collaboration_invites
CREATE POLICY "Users can view invites they sent or received"
  ON public.collaboration_invites FOR SELECT
  USING (sender_id = auth.uid() OR receiver_id = auth.uid() OR receiver_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Project participants can send invites"
  ON public.collaboration_invites FOR INSERT
  WITH CHECK (sender_id = auth.uid() AND (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND client_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM bids WHERE project_id = collaboration_invites.project_id AND freelancer_id = auth.uid() AND status = 'accepted'::bid_status)
  ));

CREATE POLICY "Receivers can update their invites"
  ON public.collaboration_invites FOR UPDATE
  USING (receiver_id = auth.uid());

-- RLS Policies for consultant_profiles
CREATE POLICY "Consultant profiles viewable by everyone"
  ON public.consultant_profiles FOR SELECT
  USING (true);

CREATE POLICY "Consultants can manage their profiles"
  ON public.consultant_profiles FOR ALL
  USING (user_id = auth.uid());

-- RLS Policies for consultancy_availability
CREATE POLICY "Availability viewable by everyone"
  ON public.consultancy_availability FOR SELECT
  USING (true);

CREATE POLICY "Consultants can manage their availability"
  ON public.consultancy_availability FOR ALL
  USING (consultant_id = auth.uid());

-- RLS Policies for consultancy_documents
CREATE POLICY "Documents viewable by booking participants"
  ON public.consultancy_documents FOR SELECT
  USING (
    uploader_id = auth.uid() OR
    EXISTS (SELECT 1 FROM consultancy_bookings WHERE id = booking_id AND (client_id = auth.uid() OR consultant_id = auth.uid()))
  );

CREATE POLICY "Booking participants can upload documents"
  ON public.consultancy_documents FOR INSERT
  WITH CHECK (
    uploader_id = auth.uid() AND
    EXISTS (SELECT 1 FROM consultancy_bookings WHERE id = booking_id AND (client_id = auth.uid() OR consultant_id = auth.uid()))
  );

-- RLS Policies for consultancy_payments
CREATE POLICY "Payments viewable by booking participants"
  ON public.consultancy_payments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM consultancy_bookings WHERE id = booking_id AND (client_id = auth.uid() OR consultant_id = auth.uid()))
  );

CREATE POLICY "Admins and participants can manage payments"
  ON public.consultancy_payments FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (SELECT 1 FROM consultancy_bookings WHERE id = booking_id AND (client_id = auth.uid() OR consultant_id = auth.uid()))
  );

-- Update trigger for consultant_profiles
CREATE TRIGGER update_consultant_profiles_updated_at
  BEFORE UPDATE ON public.consultant_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update trigger for consultancy_payments
CREATE TRIGGER update_consultancy_payments_updated_at
  BEFORE UPDATE ON public.consultancy_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();