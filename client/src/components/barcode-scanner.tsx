import { useState, useRef, useEffect, useCallback } from "react";
import { X, Flashlight, CheckCircle, AlertCircle, Camera, ScanLine, RotateCw } from "lucide-react";
// Removed Tesseract OCR - now using Gemini Vision API

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
  const [manualScanTriggered, setManualScanTriggered] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<string>("");
  const [detectedFormat, setDetectedFormat] = useState<string>("Gemini Vision");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
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
  }, [isOpen]); // Remove hasPermission dependency to avoid infinite loops

  const initializeScanner = async () => {
    try {
      console.log('Initializing Gemini Vision scanner...');
      setError('');
      // Only set to null if we don't already have permission
      if (hasPermission !== true) {
        setHasPermission(null);
      }
      setScanStatus('idle');

      await startCamera();

      // Camera is ready, but don't auto-start scanning
      console.log('Camera initialized successfully. Ready for manual Gemini Vision scan.');
    } catch (err) {
      console.error('Failed to initialize scanner:', err);
      setError(`Failed to initialize scanner: ${err instanceof Error ? err.message : String(err)}`);
      setHasPermission(false);
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
      setError('');

      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported by this browser');
      }

      // First try with back camera, then front if it fails
      let constraints = {
        video: {
          facingMode: "environment", // Use back camera
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 }
        }
      };

      console.log('Getting user media with constraints:', constraints);
      let stream: MediaStream;

      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (backCameraError) {
        console.log('Back camera failed, trying front camera:', backCameraError);
        // Fallback to front camera
        constraints.video.facingMode = "user";
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      }
      streamRef.current = stream;
      console.log('Camera stream obtained successfully');

      // Set permission to true since we got the stream
      setHasPermission(true);
      setError('');

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        console.log('Video element set with stream');

        // Ensure video is fully loaded and playing before scanning
        await new Promise((resolve, reject) => {
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

          const checkReady = () => {
            if (metadataLoaded && canPlay) {
              onReady();
            }
          };

          video.onloadedmetadata = () => {
            console.log('Video metadata loaded');
            metadataLoaded = true;
            checkReady();
          };

          video.oncanplay = () => {
            console.log('Video can play');
            canPlay = true;
            checkReady();
          };

          video.onerror = (e) => {
            console.error('Video error:', e);
            reject(new Error('Video failed to load'));
          };

          // Force video to load and play
          video.load(); // Explicitly load the video
          video.play().catch(err => {
            console.warn('Video play failed (might be due to autoplay policy):', err);
            // Continue anyway as some browsers block autoplay but still allow scanning
          });

          // Timeout fallback in case events don't fire
          setTimeout(() => {
            if (video.readyState >= 2) {
              console.log('Video ready via timeout fallback');
              resolve(undefined);
            }
          }, 3000);
        });
      } else {
        throw new Error('Video element not available');
      }
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
    
    // Clear any previous errors
    setError('');

    // Wait a moment for video to be ready, then check
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check if video is ready for scanning
    if (video.readyState < 2) {
      console.log('Video not ready yet, readyState:', video.readyState);
      setError('Camera not ready yet. Please wait a moment and try again.');
      setScanStatus('error');
      setIsScanning(false);
      setManualScanTriggered(false);
      return;
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('Video dimensions not available yet:', { width: video.videoWidth, height: video.videoHeight });
      setError('Camera not ready yet. Please wait a moment and try again.');
      setScanStatus('error');
      setIsScanning(false);
      setManualScanTriggered(false);
      return;
    }

    try {
      console.log('Starting Gemini Vision scan...');
      setIsScanning(true);
      setScanStatus('scanning');
      setError('');
      setManualScanTriggered(true);

      // Create a canvas to capture frames
      const canvas = canvasRef.current;
      if (!canvas) {
        throw new Error('Canvas not available');
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      // Set canvas size to match the scanning frame area (reduced size for smaller payload)
      const frameWidth = 480;  // Reduced from 640 for smaller payload
      const frameHeight = 288; // Reduced from 384 for smaller payload
      canvas.width = frameWidth;
      canvas.height = frameHeight;

      // Calculate the center area of the video to crop
      const centerX = (video.videoWidth - frameWidth) / 2;
      const centerY = (video.videoHeight - frameHeight) / 2;

      // Draw only the center area of the video frame to canvas (cropped to scanning frame)
      ctx.drawImage(
        video, 
        centerX, centerY, frameWidth, frameHeight,  // Source area (cropped from video)
        0, 0, frameWidth, frameHeight              // Destination area (full canvas)
      );
      
      // Convert canvas to base64 image for Gemini Vision API (reduced quality for smaller payload)
      const imageData = canvas.toDataURL('image/jpeg', 0.7);
      console.log('Sending image to Gemini Vision API for barcode extraction...');
      console.log('Image data length:', imageData.length);
      console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
      
      // Send image to server for Gemini Vision processing (no auth required)
      const response = await fetch('/api/scan-barcode-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imageData })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process image');
      }

      const result = await response.json();
      console.log('Gemini Vision API response:', result);

      if (result.barcode) {
        console.log('🎉 Barcode detected via Gemini Vision:', result.barcode);
        handleScanSuccess(result.barcode, 'Gemini Vision');
        return;
      } else {
        console.log('No barcode detected by Gemini Vision');
        setError('No barcode detected. Please ensure the barcode numbers are clearly visible in the center of the frame.');
        setScanStatus('error');
        setIsScanning(false);
        setManualScanTriggered(false);
      }

    } catch (err) {
      console.error('Failed to start Gemini Vision scanning:', err);
      setError(`Gemini Vision scanning failed: ${err instanceof Error ? err.message : String(err)}`);
      setScanStatus('error');
      setIsScanning(false);
      setManualScanTriggered(false);
    }
  };


  const stopScanning = () => {
    setIsScanning(false);
    
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    
    setScanStatus('idle');
  };

  const handleScanSuccess = useCallback((barcode: string, format?: string) => {
    console.log('🎉 Scan success handling started for barcode:', barcode, 'format:', format);
    
    // Validate that this is a valid product barcode (not URL)
    if (!isValidProductBarcode(barcode)) {
      console.log('❌ Rejected non-product barcode:', barcode);
      setError('Please scan a product barcode (not QR codes with URLs).');
      setScanStatus('error');
      setIsScanning(false);
      setManualScanTriggered(false);
      return;
    }
    
    setLastScanResult(barcode);
    setDetectedFormat(format || 'Product Barcode');
    setScanStatus('found');
    setIsScanning(false);

    // Add haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]); // Success pattern
    }

    // Show success state briefly, then close scanner and start analysis
    setTimeout(() => {
      console.log('✅ Closing scanner and starting analysis for:', barcode);
      onScan(barcode); // Start the analysis immediately
      onClose(); // Close the scanner immediately after starting analysis
    }, 600); // Reduced delay for faster UX
  }, [onScan, onClose]);

  // Removed extractThirteenDigitCodes function - now using Gemini Vision API

  // Validate that the scanned code is a valid product barcode (not URL)
  const isValidProductBarcode = (text: string): boolean => {
    const cleanText = text.trim();
    
    // Reject URLs
    if (cleanText.startsWith('http://') || cleanText.startsWith('https://')) {
      return false;
    }
    
    // Reject email addresses
    if (cleanText.includes('@') && cleanText.includes('.')) {
      return false;
    }
    
    // Reject QR codes with URLs
    if (cleanText.includes('://') || cleanText.includes('www.')) {
      return false;
    }
    
    // Accept numeric barcodes (EAN-13, UPC, etc.)
    if (/^\d{8,14}$/.test(cleanText)) {
      return true;
    }
    
    // Accept alphanumeric codes that look like product codes
    if (/^[A-Za-z0-9]{6,20}$/.test(cleanText) && !cleanText.includes('://')) {
      return true;
    }
    
    return false;
  };

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
    setManualScanTriggered(false);
    // Don't auto-start scanning, wait for manual trigger
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
      case 'scanning': return 'Reading text with OCR...';
      case 'found': return `Found 13-digit code`;
      case 'error': return 'OCR failed - try again';
      default: return 'Position barcode numbers in the frame';
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

        {/* Camera preview area - only show scanning frame */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Only show the scanning frame area of the camera */}
          <div className="relative w-80 h-48 overflow-hidden rounded-lg">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${hasPermission === true && !error ? 'block' : 'hidden'}`}
            data-testid="camera-preview"
              style={{
                transform: 'scale(1.5)', // Zoom in to show only center area
                transformOrigin: 'center'
              }}
          />
          </div>
          {/* Hidden canvas for image processing */}
          <canvas
            ref={canvasRef}
            style={{ display: 'none' }}
            data-testid="barcode-canvas"
          />

          {/* Show permission request screen when needed */}
          {/* Camera Access Screen - only show when permission is actually needed */}
          {hasPermission !== true && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-white text-center max-w-sm mx-auto p-6">
                <Camera className="w-16 h-16 mx-auto mb-4 text-white/50" />
                <h3 className="text-xl font-semibold mb-2">
                  {hasPermission === null ? 'Requesting Camera Access...' : 'Camera Access Needed'}
                </h3>
                <p className="text-white/70 mb-6">
                  {hasPermission === null
                    ? "Setting up camera access..."
                    : "Please allow camera access to scan barcodes"
                  }
                </p>
                {hasPermission === false && (
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

          {/* Error Message Overlay - show when there's a scanning error */}
          {error && hasPermission === true && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mx-4 max-w-sm">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                    Scanning Error
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {error}
                  </p>
                  <button
                    onClick={handleRetryScanning}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Scanning overlay - positioned over the video frame */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Scanning frame overlay */}
          <div className={`relative w-80 h-48 border-4 rounded-lg transition-all duration-300 ${getScanStatusColor()}`}>
            {/* Corner indicators */}
            <div className="absolute -top-2 -left-2 w-8 h-8 border-l-4 border-t-4 border-white rounded-tl-lg"></div>
            <div className="absolute -top-2 -right-2 w-8 h-8 border-r-4 border-t-4 border-white rounded-tr-lg"></div>
            <div className="absolute -bottom-2 -left-2 w-8 h-8 border-l-4 border-b-4 border-white rounded-bl-lg"></div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 border-r-4 border-b-4 border-white rounded-br-lg"></div>
            
            {/* Scanning line animation */}
            {scanStatus === 'scanning' && (
              <div className="absolute inset-0 overflow-hidden rounded-lg">
                <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-bounce"></div>
              </div>
            )}

            {/* Center status icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              {getScanStatusIcon()}
            </div>
            
            {/* Frame label */}
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-white text-sm font-medium bg-black/50 px-3 py-1 rounded">
              Position barcode here
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
            {/* Manual Scan Button */}
            {scanStatus === 'idle' && !manualScanTriggered && (
              <button
                onClick={startScanning}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                data-testid="button-scan"
              >
          <ScanLine className="w-4 h-4 mr-2 inline" />
          Scan with Gemini Vision
              </button>
            )}
            
            {/* Retry Button */}
            {scanStatus === 'error' && (
              <button
                onClick={handleRetryScanning}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                data-testid="button-retry-scan"
              >
                <RotateCw className="w-4 h-4 mr-2 inline" />
                Try Again
              </button>
            )}
            
            {/* Manual Input Button */}
            <button
              onClick={onManualInput}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              data-testid="button-manual-input"
            >
              Enter Manually
            </button>

          </div>

          {/* Tips */}
          <div className="mt-6 text-center space-y-2">
            <div className="bg-blue-600/20 border border-blue-400/30 rounded-lg p-3">
              <p className="text-blue-200 text-sm font-medium">
                💡 Only the area inside the white frame will be scanned
              </p>
            </div>
            <div className="bg-green-600/20 border border-green-400/30 rounded-lg p-3">
              <p className="text-green-200 text-sm font-medium">
                ✅ Position barcode numbers inside the frame, then click "Scan with Gemini Vision"
              </p>
            </div>
            <p className="text-white/60 text-sm">
              📱 Gemini Vision detects 13-digit product codes from barcode labels
            </p>
            
            {/* Debug button removed - now using Gemini Vision API */}
          </div>
        </div>
      </div>
    </div>
  );
}