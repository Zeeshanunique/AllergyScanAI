import { useState, useRef, useEffect, useCallback } from "react";
import { X, Flashlight, CheckCircle, AlertCircle, Camera, ScanLine, RotateCw } from "lucide-react";
import { BrowserMultiFormatReader, BrowserBarcodeReader, BrowserDatamatrixReader, BrowserPDF417Reader } from '@zxing/browser';
import { Result, NotFoundException, BarcodeFormat } from '@zxing/library';

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
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'found' | 'error'>('idle');
  const [lastScanResult, setLastScanResult] = useState<string>("");
  const [detectedFormat, setDetectedFormat] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      initializeScanner();
    } else {
      cleanup();
    }

    return () => {
      cleanup();
    };
  }, [isOpen]);

  const initializeScanner = async () => {
    try {
      await startCamera();
      if (codeReader.current && videoRef.current) {
        await startScanning();
      }
    } catch (err) {
      console.error('Failed to initialize scanner:', err);
      setError('Failed to initialize scanner');
    }
  };

  const cleanup = () => {
    stopScanning();
    stopCamera();
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
  };

  const startCamera = async () => {
    try {
      // Request camera with optimal settings for barcode scanning
      const constraints = {
        video: {
          facingMode: "environment", // Use back camera
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
          focusMode: "continuous",
          zoom: 1.0
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Ensure video is playing before scanning
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => resolve(undefined);
          }
        });
      }
      
      setHasPermission(true);
      setError("");
      setScanStatus('idle');
    } catch (err) {
      setHasPermission(false);
      setError("Camera access denied or not available");
      setScanStatus('error');
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

  const startScanning = async () => {
    if (!videoRef.current || isScanning) return;
    
    try {
      setIsScanning(true);
      setScanStatus('scanning');
      
      // Initialize the code reader if not already done
      if (!codeReader.current) {
        codeReader.current = new BrowserMultiFormatReader();
        
        // Configure reader for multiple formats
        const hints = new Map();
        hints.set(2, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.CODE_93,
          BarcodeFormat.CODABAR,
          BarcodeFormat.ITF,
          BarcodeFormat.RSS_14,
          BarcodeFormat.RSS_EXPANDED,
          BarcodeFormat.QR_CODE,
          BarcodeFormat.DATA_MATRIX,
          BarcodeFormat.PDF_417
        ]);
        codeReader.current = new BrowserMultiFormatReader(hints);
      }

      // Start continuous scanning
      codeReader.current.decodeFromVideoDevice(undefined, videoRef.current, (result, error) => {
        if (result) {
          const format = BarcodeFormat[result.getBarcodeFormat()];
          handleScanSuccess(result.getText(), format);
        }
        // Continue scanning - errors are normal when no barcode is detected
      });
    } catch (err) {
      console.error('Scan error:', err);
      setScanStatus('error');
      setError('Scanning failed. Please try again.');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    if (codeReader.current) {
      codeReader.current.reset();
    }
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
  };

  const handleScanSuccess = useCallback((barcode: string, format?: string) => {
    setLastScanResult(barcode);
    setDetectedFormat(format || 'Unknown');
    setScanStatus('found');
    setIsScanning(false);
    stopScanning();
    
    // Add haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(200);
    }
    
    // Call the parent's onScan function after a brief delay to show success state
    setTimeout(() => {
      onScan(barcode);
    }, 800);
  }, [onScan]);

  const toggleFlashlight = async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track && 'torch' in track.getCapabilities()) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: !flashlightOn } as any]
          });
          setFlashlightOn(!flashlightOn);
        } catch (err) {
          console.error("Flashlight error:", err);
        }
      }
    }
  };

  const handleRetryScanning = () => {
    setError("");
    setScanStatus('idle');
    setLastScanResult("");
    setDetectedFormat("");
    if (hasPermission && videoRef.current) {
      startScanning();
    } else {
      startCamera().then(() => {
        if (videoRef.current) {
          startScanning();
        }
      });
    }
  };

  const getScanStatusColor = () => {
    switch (scanStatus) {
      case 'scanning': return 'border-blue-500 shadow-blue-500/50';
      case 'found': return 'border-green-500 shadow-green-500/50';
      case 'error': return 'border-red-500 shadow-red-500/50';
      default: return 'border-white/30';
    }
  };

  const getScanStatusIcon = () => {
    switch (scanStatus) {
      case 'scanning': return <ScanLine className="w-6 h-6 text-blue-400 animate-pulse" />;
      case 'found': return <CheckCircle className="w-6 h-6 text-green-400" />;
      case 'error': return <AlertCircle className="w-6 h-6 text-red-400" />;
      default: return <Camera className="w-6 h-6 text-white/70" />;
    }
  };

  const getScanStatusText = () => {
    switch (scanStatus) {
      case 'scanning': return 'Scanning for barcodes...';
      case 'found': return `Found ${detectedFormat || 'barcode'}`;
      case 'error': return 'Scan failed - try again';
      default: return 'Position barcode in the frame';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 z-50" data-testid="barcode-scanner-modal">
      <div className="relative h-full">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              data-testid="button-close-scanner"
            >
              <X size={24} />
            </button>
            
            <div className="text-center">
              <h2 className="text-white font-semibold text-lg">Barcode Scanner</h2>
              <p className="text-white/70 text-sm">Position barcode in the frame</p>
            </div>

            <button
              onClick={toggleFlashlight}
              className={`p-2 rounded-full transition-colors ${
                flashlightOn 
                  ? 'bg-yellow-500 text-black' 
                  : 'bg-black/50 text-white hover:bg-black/70'
              }`}
              data-testid="button-toggle-flashlight"
            >
              <Flashlight size={24} />
            </button>
          </div>
        </div>

        {/* Camera preview area */}
        <div className="absolute inset-0">
          {hasPermission && !error ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              data-testid="camera-preview"
            />
          ) : (
            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
              <div className="text-white text-center max-w-sm mx-auto p-6">
                <Camera className="w-16 h-16 mx-auto mb-4 text-white/50" />
                <h3 className="text-xl font-semibold mb-2">Camera Access Needed</h3>
                <p className="text-white/70 mb-6">
                  {error || "Please allow camera access to scan barcodes"}
                </p>
                {error && (
                  <button
                    onClick={startCamera}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    data-testid="button-retry-camera"
                  >
                    <RotateCw className="w-4 h-4 mr-2 inline" />
                    Try Again
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Scanning overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Scanning frame */}
          <div className={`relative w-64 h-40 border-2 rounded-lg transition-all duration-300 ${getScanStatusColor()}`}>
            {/* Corner indicators */}
            <div className="absolute -top-1 -left-1 w-6 h-6 border-l-4 border-t-4 border-white rounded-tl-lg"></div>
            <div className="absolute -top-1 -right-1 w-6 h-6 border-r-4 border-t-4 border-white rounded-tr-lg"></div>
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-l-4 border-b-4 border-white rounded-bl-lg"></div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-r-4 border-b-4 border-white rounded-br-lg"></div>
            
            {/* Scanning line animation */}
            {scanStatus === 'scanning' && (
              <div className="absolute inset-0 overflow-hidden rounded-lg">
                <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-bounce"></div>
              </div>
            )}

            {/* Center status icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              {getScanStatusIcon()}
            </div>
          </div>
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-6">
          {/* Status text */}
          <div className="text-center mb-6">
            <p className="text-white font-medium text-lg">{getScanStatusText()}</p>
            {lastScanResult && scanStatus === 'found' && (
              <div className="text-green-400 text-sm mt-1 space-y-1">
                <p>Code: {lastScanResult}</p>
                {detectedFormat && <p>Format: {detectedFormat}</p>}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center space-x-4">
            {scanStatus === 'error' && (
              <button
                onClick={handleRetryScanning}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                data-testid="button-retry-scan"
              >
                <RotateCw className="w-4 h-4 mr-2 inline" />
                Retry Scan
              </button>
            )}
            
            <button
              onClick={onManualInput}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              data-testid="button-manual-input"
            >
              Enter Manually
            </button>
          </div>

          {/* Tips */}
          <div className="mt-6 text-center">
            <p className="text-white/60 text-sm">
              💡 Supports: UPC, EAN, QR Code, Code 128/39, Data Matrix & more
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}