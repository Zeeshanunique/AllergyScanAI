import { useState, useRef, useEffect, useCallback } from "react";
import { X, Flashlight, CheckCircle, AlertCircle, Camera, ScanLine, RotateCw } from "lucide-react";
import { BrowserMultiFormatReader } from '@zxing/browser';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      console.log('Initializing barcode scanner...');
      await startCamera();
      
      // Wait a moment for video to be ready, then start scanning
      setTimeout(() => {
        if (videoRef.current) {
          console.log('Starting scanning after camera initialization...');
          startScanning();
        }
      }, 1000);
    } catch (err) {
      console.error('Failed to initialize scanner:', err);
      setError(`Failed to initialize scanner: ${err instanceof Error ? err.message : String(err)}`);
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
      console.log('Requesting camera access...');

      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported by this browser');
      }

      // Request camera with optimal settings for barcode scanning
      const constraints = {
        video: {
          facingMode: "environment", // Use back camera
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 }
        }
      };

      console.log('Getting user media with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      console.log('Camera stream obtained successfully');

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          console.log('Video element set with stream');

          // Ensure video is fully loaded and playing before scanning
          await new Promise((resolve, reject) => {
            if (videoRef.current) {
              const video = videoRef.current;
              
              const onReady = () => {
                console.log('Video ready for scanning:', {
                  readyState: video.readyState,
                  videoWidth: video.videoWidth,
                  videoHeight: video.videoHeight,
                  paused: video.paused
                });
                resolve(undefined);
              };

              // Wait for both metadata and can play events
              let metadataLoaded = false;
              let canPlay = false;

              video.onloadedmetadata = () => {
                console.log('Video metadata loaded');
                metadataLoaded = true;
                if (canPlay) onReady();
              };

              video.oncanplay = () => {
                console.log('Video can play');
                canPlay = true;
                if (metadataLoaded) onReady();
              };

              video.onerror = (e) => {
                console.error('Video error:', e);
                reject(new Error('Video failed to load'));
              };

              // Ensure video starts playing
              video.play().catch(err => {
                console.warn('Video play failed (might be due to autoplay policy):', err);
                // Continue anyway as some browsers block autoplay but still allow scanning
              });
            }
          });
        }

      setHasPermission(true);
      setError("");
      setScanStatus('idle');
      console.log('Camera started successfully');
    } catch (err) {
      setHasPermission(false);
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Camera error:", err);
      setError(`Camera access failed: ${errorMessage}`);
      setScanStatus('error');
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
    if (!videoRef.current || isScanning) {
      console.log('Cannot start scanning:', { videoRef: !!videoRef.current, isScanning });
      return;
    }

    const video = videoRef.current;

    // Check if video is ready for scanning
    if (video.readyState < 2) {
      console.log('Video not ready yet, readyState:', video.readyState);
      // Wait a bit and try again
      setTimeout(() => startScanning(), 500);
      return;
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('Video dimensions not available yet:', { width: video.videoWidth, height: video.videoHeight });
      setTimeout(() => startScanning(), 500);
      return;
    }

    try {
      console.log('Starting barcode scanning...');
      console.log('Video element state:', {
        readyState: video.readyState,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        paused: video.paused,
        currentTime: video.currentTime
      });

      setIsScanning(true);
      setScanStatus('scanning');

      // Initialize the code reader if not already done
      if (!codeReader.current) {
        console.log('Initializing BrowserMultiFormatReader...');
        codeReader.current = new BrowserMultiFormatReader();
        console.log('BrowserMultiFormatReader initialized');
      }

      console.log('Starting continuous decode from video device...');
      
      // Try direct video scanning first
      try {
        await codeReader.current.decodeFromVideoDevice(undefined, video, (result, error) => {
          if (result) {
            console.log('🎉 Barcode detected:', result.getText(), 'Format:', BarcodeFormat[result.getBarcodeFormat()]);
            const format = BarcodeFormat[result.getBarcodeFormat()];
            handleScanSuccess(result.getText(), format);
          } else if (error && !(error instanceof NotFoundException)) {
            console.warn('Scan error (non-critical):', error.message);
          }
        });
        console.log('✅ Direct video scanning started');
      } catch (directScanError) {
        console.warn('Direct video scan failed, trying canvas method:', directScanError);
        // Fallback to manual canvas scanning
        startCanvasScanning();
      }
    } catch (err) {
      console.error('❌ Critical scan error:', err);
      setScanStatus('error');
      setError(`Scanning failed: ${err instanceof Error ? err.message : String(err)}`);
      setIsScanning(false);
    }
  };

  const startCanvasScanning = () => {
    console.log('Starting canvas-based scanning...');
    
    const scanInterval = setInterval(async () => {
      if (!isScanning || !videoRef.current || !canvasRef.current || !codeReader.current) {
        clearInterval(scanInterval);
        return;
      }

      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) return;

        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw current video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Get image data from canvas
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Try to decode from canvas
        try {
          const result = await codeReader.current.decodeFromCanvas(canvas);
          if (result) {
            console.log('🎉 Canvas barcode detected:', result.getText());
            const format = BarcodeFormat[result.getBarcodeFormat()];
            clearInterval(scanInterval);
            handleScanSuccess(result.getText(), format);
          }
        } catch (err) {
          // Ignore NotFoundException - normal when no barcode is found
          if (!(err instanceof NotFoundException)) {
            console.warn('Canvas scan error:', err);
          }
        }
      } catch (err) {
        console.error('Canvas scanning error:', err);
      }
    }, 200); // Scan every 200ms

    // Store interval reference for cleanup
    scanTimeoutRef.current = scanInterval as any;
  };

  const stopScanning = () => {
    console.log('Stopping barcode scanning...');
    setIsScanning(false);
    
    // Properly stop the scanning process
    if (codeReader.current) {
      try {
        // Create a new instance to effectively stop scanning
        codeReader.current = new BrowserMultiFormatReader();
        console.log('Scanner reset successfully');
      } catch (err) {
        console.log('Stop scanning error (non-critical):', err);
      }
    }
    
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
  };

  const handleScanSuccess = useCallback((barcode: string, format?: string) => {
    console.log('🎉 Scan success handling started');
    setLastScanResult(barcode);
    setDetectedFormat(format || 'Unknown');
    setScanStatus('found');
    setIsScanning(false);
    stopScanning();
    
    // Add haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]); // Success pattern
    }
    
    // Show success state briefly, then close scanner and start analysis
    setTimeout(() => {
      console.log('Closing scanner and starting analysis...');
      onScan(barcode); // This will trigger the analysis
      onClose(); // Auto-close the scanner immediately
    }, 1000); // Reduced delay for faster UX
  }, [onScan, onClose]);

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
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                data-testid="camera-preview"
              />
              {/* Hidden canvas for image processing */}
              <canvas
                ref={canvasRef}
                style={{ display: 'none' }}
                data-testid="barcode-canvas"
              />
            </>
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