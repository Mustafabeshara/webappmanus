import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Square, Check } from "lucide-react";
import { toast } from "sonner";

interface BoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fieldType: "title" | "amount" | "date" | "vendor" | "description";
  extractedValue?: any;
}

interface BoundingBoxEditorProps {
  imageUrl: string;
  onExtract: (box: BoundingBox) => Promise<any>;
  onApply: (boxes: BoundingBox[]) => void;
}

export function BoundingBoxEditor({
  imageUrl,
  onExtract,
  onApply,
}: BoundingBoxEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [boxes, setBoxes] = useState<BoundingBox[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentBox, setCurrentBox] = useState<Partial<BoundingBox> | null>(null);
  const [selectedFieldType, setSelectedFieldType] = useState<BoundingBox["fieldType"]>("title");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height });
      setImageLoaded(true);
      
      // Calculate scale to fit container
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const newScale = Math.min(1, containerWidth / img.width);
        setScale(newScale);
      }
      
      drawCanvas(img);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    if (imageLoaded) {
      redrawCanvas();
    }
  }, [boxes, currentBox, imageLoaded]);

  const drawCanvas = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = img.width * scale;
    canvas.height = img.height * scale;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Redraw image
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw existing boxes
      boxes.forEach((box) => {
        drawBox(ctx, box, getFieldColor(box.fieldType));
      });

      // Draw current box being drawn
      if (currentBox && currentBox.x !== undefined && currentBox.y !== undefined) {
        drawBox(ctx, currentBox as BoundingBox, getFieldColor(selectedFieldType), true);
      }
    };
    img.src = imageUrl;
  };

  const drawBox = (
    ctx: CanvasRenderingContext2D,
    box: Partial<BoundingBox>,
    color: string,
    dashed = false
  ) => {
    if (
      box.x === undefined ||
      box.y === undefined ||
      box.width === undefined ||
      box.height === undefined
    )
      return;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    if (dashed) {
      ctx.setLineDash([5, 5]);
    } else {
      ctx.setLineDash([]);
    }

    ctx.strokeRect(
      box.x * scale,
      box.y * scale,
      box.width * scale,
      box.height * scale
    );

    // Draw label
    if (box.fieldType) {
      ctx.fillStyle = color;
      ctx.font = "12px sans-serif";
      ctx.fillText(
        box.fieldType.toUpperCase(),
        box.x * scale + 4,
        box.y * scale - 4
      );
    }
  };

  const getFieldColor = (fieldType: BoundingBox["fieldType"]) => {
    const colors = {
      title: "#3b82f6",
      amount: "#10b981",
      date: "#f59e0b",
      vendor: "#8b5cf6",
      description: "#ec4899",
    };
    return colors[fieldType];
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    setIsDrawing(true);
    setCurrentBox({
      id: Date.now().toString(),
      x,
      y,
      width: 0,
      height: 0,
      fieldType: selectedFieldType,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentBox || currentBox.x === undefined || currentBox.y === undefined)
      return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) / scale;
    const currentY = (e.clientY - rect.top) / scale;

    setCurrentBox({
      ...currentBox,
      width: currentX - currentBox.x,
      height: currentY - currentBox.y,
    });
  };

  const handleMouseUp = async () => {
    if (!isDrawing || !currentBox) return;

    setIsDrawing(false);

    // Only add box if it has meaningful size
    if (
      currentBox.width !== undefined &&
      currentBox.height !== undefined &&
      Math.abs(currentBox.width) > 10 &&
      Math.abs(currentBox.height) > 10
    ) {
      // Normalize negative dimensions
      const normalizedBox: BoundingBox = {
        id: currentBox.id!,
        x: currentBox.width! < 0 ? currentBox.x! + currentBox.width! : currentBox.x!,
        y: currentBox.height! < 0 ? currentBox.y! + currentBox.height! : currentBox.y!,
        width: Math.abs(currentBox.width!),
        height: Math.abs(currentBox.height!),
        fieldType: currentBox.fieldType!,
      };

      // Extract text from this region
      toast.info("Extracting text from selected region...");
      try {
        const result = await onExtract(normalizedBox);
        normalizedBox.extractedValue = result.value;
        setBoxes([...boxes, normalizedBox]);
        toast.success(`Extracted ${normalizedBox.fieldType}`);
      } catch (error) {
        toast.error("Failed to extract text from region");
      }
    }

    setCurrentBox(null);
  };

  const deleteBox = (id: string) => {
    setBoxes(boxes.filter((box) => box.id !== id));
  };

  const handleApply = () => {
    if (boxes.length === 0) {
      toast.error("Please draw at least one bounding box");
      return;
    }
    onApply(boxes);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label>Select Field Type</Label>
          <Select
            value={selectedFieldType}
            onValueChange={(value) => setSelectedFieldType(value as BoundingBox["fieldType"])}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="amount">Amount</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="vendor">Vendor</SelectItem>
              <SelectItem value="description">Description</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Square className="h-3 w-3" />
            {boxes.length} box{boxes.length !== 1 ? "es" : ""}
          </Badge>
          <Button onClick={handleApply} disabled={boxes.length === 0}>
            <Check className="mr-2 h-4 w-4" />
            Apply Extractions
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="border rounded-lg overflow-hidden bg-muted/20"
        style={{ maxWidth: "100%" }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            if (isDrawing) handleMouseUp();
          }}
          className="cursor-crosshair"
          style={{ display: "block", maxWidth: "100%" }}
        />
      </div>

      <div className="text-sm text-muted-foreground">
        <p>
          <strong>Instructions:</strong> Select a field type above, then click and drag on the
          receipt image to draw a box around the text you want to extract.
        </p>
      </div>

      {boxes.length > 0 && (
        <div className="space-y-2">
          <Label>Extracted Regions</Label>
          <div className="space-y-2">
            {boxes.map((box) => (
              <div
                key={box.id}
                className="flex items-center justify-between p-3 border rounded-lg"
                style={{ borderColor: getFieldColor(box.fieldType) }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      style={{
                        backgroundColor: getFieldColor(box.fieldType),
                        color: "white",
                      }}
                    >
                      {box.fieldType}
                    </Badge>
                  </div>
                  <p className="text-sm">
                    {box.extractedValue !== null && box.extractedValue !== undefined
                      ? typeof box.extractedValue === "number"
                        ? `$${(box.extractedValue / 100).toFixed(2)}`
                        : box.extractedValue.toString()
                      : "No value extracted"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteBox(box.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
