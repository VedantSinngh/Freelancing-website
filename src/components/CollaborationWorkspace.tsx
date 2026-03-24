import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { CollaborativeWhiteboard } from "./CollaborativeWhiteboard";
import { VideoChat } from "./VideoChat";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CollaborationWorkspaceProps {
  projectId: string;
}

export const CollaborationWorkspace = ({ projectId }: CollaborationWorkspaceProps) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeSession();
  }, [projectId]);

  const initializeSession = async () => {
    try {
      // Check if a session already exists for this project
      const { data: existingSession, error: fetchError } = await supabase
        .from('whiteboard_sessions')
        .select('id')
        .eq('project_id', projectId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingSession) {
        setSessionId(existingSession.id);
      } else {
        // Create a new session
        const { data: newSession, error: createError } = await supabase
          .from('whiteboard_sessions')
          .insert({ project_id: projectId })
          .select()
          .single();

        if (createError) throw createError;

        setSessionId(newSession.id);
      }
    } catch (error) {
      console.error('Error initializing session:', error);
      toast.error("Failed to initialize collaboration workspace");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Card>
    );
  }

  if (!sessionId) {
    return (
      <Card className="p-8">
        <p className="text-center text-muted-foreground">
          Failed to load collaboration workspace
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <Tabs defaultValue="whiteboard" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="whiteboard">Whiteboard</TabsTrigger>
          <TabsTrigger value="video">Video Chat</TabsTrigger>
        </TabsList>
        
        <TabsContent value="whiteboard" className="mt-6">
          <CollaborativeWhiteboard sessionId={sessionId} projectId={projectId} />
        </TabsContent>
        
        <TabsContent value="video" className="mt-6">
          <VideoChat projectId={projectId} />
        </TabsContent>
      </Tabs>
    </Card>
  );
};