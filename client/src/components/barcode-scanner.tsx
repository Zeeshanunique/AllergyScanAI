import { useState, useRef, useEffect } from "react";
import { X, Flashlight } from "lucide-react";

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  onManualInput: () => void;
}

export function BarcodeScanner({ isOpen, onClose, onScan, onManualInput }: BarcodeScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string>("");
  const [flashlightOn, setFlashlightOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
      setError("");
    } catch (err) {
      setHasPermission(false);
      setError("Camera access denied or not available");
      console.error("Camera error:", err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const toggleFlashlight = async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track && 'torch' in track.getCapabilities()) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: !flashlightOn }]
          });
          setFlashlightOn(!flashlightOn);
        } catch (err) {
          console.error("Flashlight error:", err);
        }
      }
    }
  };

  const handleManualScan = () => {
    // Simulate barcode detection for demo
    const demoBarcode = "1234567890123";
    onScan(demoBarcode);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50" data-testid="barcode-scanner-modal">
      <div className="relative h-full">
        {/* Camera preview area */}
        <div className="absolute inset-0">
          {hasPermission && !error ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              data-testid="camera-preview"
            />
          ) : (
            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
              <div className="text-white text-center">
                <i className="fas fa-camera text-4xl mb-4 opacity-50"></i>
                <p className="text-sm opacity-70">
                  {error || "Requesting camera access..."}
                </p>
                {error && (
                  <button
                    onClick={startCamera}
                    className="mt-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg"
                    data-testid="button-retry-camera"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Scanning overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-64 h-40 border-2 border-white/50 rounded-lg relative">
            <div className="scan-overlay absolute inset-0 rounded-lg"></div>
            {/* Corner markers */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white"></div>
          </div>
        </div>
        
        {/* Controls */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
          <button 
            onClick={onClose}
            className="bg-black/50 text-white p-3 rounded-full"
            data-testid="button-close-scanner"
          >
            <X size={20} />
          </button>
          <div className="bg-black/50 text-white px-3 py-2 rounded-full">
            <p className="text-sm">Position barcode in frame</p>
          </div>
          <button 
            onClick={toggleFlashlight}
            className={`bg-black/50 text-white p-3 rounded-full ${flashlightOn ? 'bg-yellow-500/50' : ''}`}
            data-testid="button-flashlight"
          >
            <Flashlight size={20} />
          </button>
        </div>
        
        <div className="absolute bottom-4 left-4 right-4 space-y-3">
          <button 
            onClick={handleManualScan}
            className="w-full bg-primary/80 text-primary-foreground py-3 rounded-lg font-medium"
            data-testid="button-demo-scan"
          >
            Demo Scan (for testing)
          </button>
          <button 
            onClick={onManualInput}
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium"
            data-testid="button-manual-input"
          >
            Enter Ingredients Manually
          </button>
        </div>
      </div>
    </div>
  );
}
