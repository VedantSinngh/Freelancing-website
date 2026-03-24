import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Circle, Rect, PencilBrush } from "fabric";
import { Button } from "./ui/button";
import { Pencil, Square, Circle as CircleIcon, Eraser, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CollaborativeWhiteboardProps {
  sessionId: string;
  projectId: string;
}

export const CollaborativeWhiteboard = ({ sessionId, projectId }: CollaborativeWhiteboardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<"select" | "draw" | "rectangle" | "circle" | "eraser">("select");
  const [activeColor] = useState("#2563eb");
  const isLocalChange = useRef(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 1200,
      height: 600,
      backgroundColor: "#ffffff",
    });

    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = activeColor;
    canvas.freeDrawingBrush.width = 2;

    setFabricCanvas(canvas);

    // Load existing whiteboard objects
    loadWhiteboardObjects(canvas);

    // Listen for object additions
    canvas.on('object:added', async (e) => {
      if (!e.target || !isLocalChange.current) return;
      
      const obj = e.target;
      const objectId = obj.get('id') as string || crypto.randomUUID();
      obj.set('id', objectId);

      await saveWhiteboardObject(objectId, obj.toJSON());
    });

    // Listen for object modifications
    canvas.on('object:modified', async (e) => {
      if (!e.target) return;
      
      const obj = e.target;
      const objectId = obj.get('id') as string;
      
      if (objectId) {
        await updateWhiteboardObject(objectId, obj.toJSON());
      }
    });

    // Listen for object removals
    canvas.on('object:removed', async (e) => {
      if (!e.target || !isLocalChange.current) return;
      
      const obj = e.target;
      const objectId = obj.get('id') as string;
      
      if (objectId) {
        await deleteWhiteboardObject(objectId);
      }
    });

    isLocalChange.current = true;

    return () => {
      canvas.dispose();
    };
  }, []);

  const loadWhiteboardObjects = async (canvas: FabricCanvas) => {
    const { data, error } = await supabase
      .from('whiteboard_objects')
      .select('*')
      .eq('session_id', sessionId);

    if (error) {
      console.error('Error loading whiteboard objects:', error);
      return;
    }

    isLocalChange.current = false;
    data?.forEach((obj) => {
      const fabricObj = obj.object_data;
      canvas.add(fabricObj as any);
    });
    isLocalChange.current = true;
    canvas.renderAll();
  };

  const saveWhiteboardObject = async (objectId: string, objectData: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('whiteboard_objects')
      .insert({
        session_id: sessionId,
        object_id: objectId,
        object_data: objectData,
        created_by: user.id,
      });

    if (error) {
      console.error('Error saving whiteboard object:', error);
    }
  };

  const updateWhiteboardObject = async (objectId: string, objectData: any) => {
    const { error } = await supabase
      .from('whiteboard_objects')
      .update({ object_data: objectData })
      .eq('object_id', objectId)
      .eq('session_id', sessionId);

    if (error) {
      console.error('Error updating whiteboard object:', error);
    }
  };

  const deleteWhiteboardObject = async (objectId: string) => {
    const { error } = await supabase
      .from('whiteboard_objects')
      .delete()
      .eq('object_id', objectId)
      .eq('session_id', sessionId);

    if (error) {
      console.error('Error deleting whiteboard object:', error);
    }
  };

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('whiteboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whiteboard_objects',
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          if (!fabricCanvas) return;

          isLocalChange.current = false;

          if (payload.eventType === 'INSERT') {
            const newObj = payload.new as any;
            fabricCanvas.add(newObj.object_data as any);
            fabricCanvas.renderAll();
          } else if (payload.eventType === 'UPDATE') {
            const updatedObj = payload.new as any;
            const existingObj = fabricCanvas.getObjects().find(
              (o) => o.get('id') === updatedObj.object_id
            );
            
            if (existingObj) {
              existingObj.set(updatedObj.object_data);
              fabricCanvas.renderAll();
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedObj = payload.old as any;
            const existingObj = fabricCanvas.getObjects().find(
              (o) => o.get('id') === deletedObj.object_id
            );
            
            if (existingObj) {
              fabricCanvas.remove(existingObj);
              fabricCanvas.renderAll();
            }
          }

          isLocalChange.current = true;
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fabricCanvas, sessionId]);

  useEffect(() => {
    if (!fabricCanvas) return;

    if (activeTool === "eraser") {
      fabricCanvas.isDrawingMode = true;
      fabricCanvas.freeDrawingBrush.color = "#ffffff";
      fabricCanvas.freeDrawingBrush.width = 20;
    } else if (activeTool === "draw") {
      fabricCanvas.isDrawingMode = true;
      fabricCanvas.freeDrawingBrush.color = activeColor;
      fabricCanvas.freeDrawingBrush.width = 2;
    } else {
      fabricCanvas.isDrawingMode = false;
    }
  }, [activeTool, activeColor, fabricCanvas]);

  const handleToolClick = (tool: typeof activeTool) => {
    setActiveTool(tool);

    if (!fabricCanvas) return;

    if (tool === "rectangle") {
      const rect = new Rect({
        left: 100,
        top: 100,
        fill: activeColor,
        width: 100,
        height: 100,
      });
      rect.set('id', crypto.randomUUID());
      fabricCanvas.add(rect);
    } else if (tool === "circle") {
      const circle = new Circle({
        left: 100,
        top: 100,
        fill: activeColor,
        radius: 50,
      });
      circle.set('id', crypto.randomUUID());
      fabricCanvas.add(circle);
    }
  };

  const handleClear = async () => {
    if (!fabricCanvas) return;
    
    // Delete all objects from database
    const { error } = await supabase
      .from('whiteboard_objects')
      .delete()
      .eq('session_id', sessionId);

    if (error) {
      console.error('Error clearing whiteboard:', error);
      return;
    }

    fabricCanvas.clear();
    fabricCanvas.backgroundColor = "#ffffff";
    fabricCanvas.renderAll();
    toast.success("Whiteboard cleared");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 items-center flex-wrap">
        <Button
          variant={activeTool === "select" ? "default" : "outline"}
          size="icon"
          onClick={() => handleToolClick("select")}
        >
          <span className="text-sm">↖</span>
        </Button>
        <Button
          variant={activeTool === "draw" ? "default" : "outline"}
          size="icon"
          onClick={() => handleToolClick("draw")}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant={activeTool === "rectangle" ? "default" : "outline"}
          size="icon"
          onClick={() => handleToolClick("rectangle")}
        >
          <Square className="h-4 w-4" />
        </Button>
        <Button
          variant={activeTool === "circle" ? "default" : "outline"}
          size="icon"
          onClick={() => handleToolClick("circle")}
        >
          <CircleIcon className="h-4 w-4" />
        </Button>
        <Button
          variant={activeTool === "eraser" ? "default" : "outline"}
          size="icon"
          onClick={() => handleToolClick("eraser")}
        >
          <Eraser className="h-4 w-4" />
        </Button>
        <Button
          variant="destructive"
          size="icon"
          onClick={handleClear}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="border border-border rounded-lg shadow-lg overflow-hidden bg-white">
        <canvas ref={canvasRef} className="max-w-full" />
      </div>
    </div>
  );
};