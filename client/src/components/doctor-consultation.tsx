import { useState } from "react";
import { X, Calendar, Clock, User, Phone, Mail, FileText, AlertTriangle, CheckCircle, Star, Video, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { ScanHistory } from "@shared/schema";

interface DoctorConsultationProps {
  isOpen: boolean;
  onClose: () => void;
  scanResult?: ScanHistory | null;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  experience: string;
  availability: string;
  consultationFee: number;
  image: string;
  languages: string[];
  isOnline: boolean;
}

// Mock doctor data
const mockDoctors: Doctor[] = [
  {
    id: "1",
    name: "Dr. Sarah Johnson",
    specialty: "Allergist & Immunologist",
    rating: 4.9,
    experience: "15+ years",
    availability: "Available now",
    consultationFee: 75,
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face",
    languages: ["English", "Spanish"],
    isOnline: true
  },
  {
    id: "2",
    name: "Dr. Michael Chen",
    specialty: "Internal Medicine",
    rating: 4.8,
    experience: "12+ years",
    availability: "Next available: 2:30 PM",
    consultationFee: 65,
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face",
    languages: ["English", "Mandarin"],
    isOnline: false
  },
  {
    id: "3",
    name: "Dr. Emily Rodriguez",
    specialty: "Family Medicine",
    rating: 4.7,
    experience: "10+ years",
    availability: "Available now",
    consultationFee: 55,
    image: "https://images.unsplash.com/photo-1594824275987-7bb6a6c7ec8b?w=150&h=150&fit=crop&crop=face",
    languages: ["English", "Spanish", "Portuguese"],
    isOnline: true
  }
];

export function DoctorConsultation({ isOpen, onClose, scanResult }: DoctorConsultationProps) {
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [consultationType, setConsultationType] = useState<'video' | 'chat' | 'phone'>('video');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [step, setStep] = useState<'doctors' | 'booking' | 'confirmation'>('doctors');

  const { toast } = useToast();

  if (!isOpen) return null;

  const handleDoctorSelect = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setStep('booking');
  };

  const handleBookAppointment = async () => {
    if (!selectedDoctor || !appointmentDate || !appointmentTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const bookingData = {
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        doctorSpecialty: selectedDoctor.specialty,
        appointmentDate,
        appointmentTime,
        consultationType,
        reason: symptoms,
        consultationFee: selectedDoctor.consultationFee,
        scanResultId: scanResult?.id
      };

      const response = await fetch('/api/consultations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(bookingData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to book consultation');
      }

      const result = await response.json();
      console.log('Consultation booked successfully:', result);

      setStep('confirmation');
      toast({
        title: "Appointment Booked",
        description: `Your consultation with ${selectedDoctor.name} has been scheduled for ${appointmentDate} at ${appointmentTime}`,
      });
    } catch (error) {
      console.error('Booking error:', error);
      toast({
        title: "Booking Failed",
        description: error instanceof Error ? error.message : "Failed to book consultation. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getUrgencyColor = (urgencyLevel: string) => {
    switch (urgencyLevel) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatScanResultForDoctor = () => {
    if (!scanResult) return '';
    return `Scan Result Details:
Product: ${scanResult.productName || 'Unknown Product'}
Ingredients: ${Array.isArray(scanResult.ingredients) ? scanResult.ingredients.join(', ') : 'N/A'}
Safety Status: ${scanResult.analysisResult?.safe ? 'Safe' : 'Caution advised'}
Risk Level: ${scanResult.analysisResult?.riskLevel || 'Unknown'}
Detected Allergens: ${scanResult.analysisResult?.allergenAlerts?.length ? scanResult.analysisResult.allergenAlerts.join(', ') : 'None detected'}
Drug Interactions: ${scanResult.analysisResult?.drugInteractions?.length ? scanResult.analysisResult.drugInteractions.join(', ') : 'None detected'}`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Doctor Consultation</h2>
            <p className="text-gray-600 dark:text-gray-300">
              {step === 'doctors' && 'Choose a qualified doctor for consultation'}
              {step === 'booking' && `Book appointment with ${selectedDoctor?.name}`}
              {step === 'confirmation' && 'Appointment confirmed'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Scan Result Summary */}
          {scanResult && step === 'doctors' && (
            <Card className="mb-6 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                      Consultation for: {scanResult.productName || 'Scanned Product'}
                    </h3>
                    <p className="text-sm text-orange-800 dark:text-orange-200">
                      Safety Status: <span className="font-medium">
                        {scanResult.analysisResult?.safe ? 'Safe' : 'Caution advised'}
                      </span>
                    </p>
                    {scanResult.analysisResult?.allergenAlerts?.length > 0 && (
                      <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">
                        Allergen Alerts: {scanResult.analysisResult.allergenAlerts.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 1: Doctor Selection */}
          {step === 'doctors' && (
            <div className="space-y-4">
              <div className="grid gap-4">
                {mockDoctors.map((doctor) => (
                  <Card key={doctor.id} className="hover:shadow-lg transition-all duration-200 cursor-pointer" onClick={() => handleDoctorSelect(doctor)}>
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className="relative">
                          <img
                            src={doctor.image}
                            alt={doctor.name}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                          {doctor.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {doctor.name}
                              </h3>
                              <p className="text-blue-600 dark:text-blue-400 font-medium">
                                {doctor.specialty}
                              </p>

                              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600 dark:text-gray-300">
                                <div className="flex items-center space-x-1">
                                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                  <span>{doctor.rating}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-4 h-4" />
                                  <span>{doctor.experience}</span>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2 mt-2">
                                <Badge variant={doctor.isOnline ? "default" : "secondary"} className="text-xs">
                                  {doctor.availability}
                                </Badge>
                                {doctor.languages.map((lang) => (
                                  <Badge key={lang} variant="outline" className="text-xs">
                                    {lang}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                ${doctor.consultationFee}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">per session</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Booking Form */}
          {step === 'booking' && selectedDoctor && (
            <div className="space-y-6">
              {/* Doctor Summary */}
              <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <img
                      src={selectedDoctor.image}
                      alt={selectedDoctor.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                        {selectedDoctor.name}
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {selectedDoctor.specialty} • ${selectedDoctor.consultationFee}/session
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Consultation Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Consultation Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { type: 'video', icon: Video, label: 'Video Call' },
                    { type: 'chat', icon: MessageSquare, label: 'Text Chat' },
                    { type: 'phone', icon: Phone, label: 'Phone Call' }
                  ].map(({ type, icon: Icon, label }) => (
                    <button
                      key={type}
                      onClick={() => setConsultationType(type as any)}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                        consultationType === type
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-6 h-6 mx-auto mb-2 text-gray-600 dark:text-gray-300" />
                      <p className="text-sm font-medium">{label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Preferred Date
                  </label>
                  <Input
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Preferred Time
                  </label>
                  <Input
                    type="time"
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Urgency Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Urgency Level
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { level: 'low', label: 'Low', desc: 'General consultation' },
                    { level: 'medium', label: 'Medium', desc: 'Concerning symptoms' },
                    { level: 'high', label: 'High', desc: 'Urgent medical advice' }
                  ].map(({ level, label, desc }) => (
                    <button
                      key={level}
                      onClick={() => setUrgency(level as any)}
                      className={`p-3 rounded-lg border-2 text-left transition-all duration-200 ${
                        urgency === level
                          ? getUrgencyColor(level).replace('bg-', 'border-').split(' ')[0]
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium">{label}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Symptoms/Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Symptoms & Additional Information
                </label>
                <Textarea
                  placeholder={`Describe your symptoms, concerns, or questions for the doctor...${
                    scanResult ? '\n\nScan result details will be automatically shared with the doctor.' : ''
                  }`}
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep('doctors')}
                  className="flex-1"
                >
                  Back to Doctors
                </Button>
                <Button
                  onClick={handleBookAppointment}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Book Appointment (${selectedDoctor.consultationFee})
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 'confirmation' && selectedDoctor && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>

              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Appointment Confirmed!
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Your consultation has been scheduled successfully
                </p>
              </div>

              <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Doctor:</span>
                      <span className="font-medium">{selectedDoctor.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Date & Time:</span>
                      <span className="font-medium">
                        {new Date(appointmentDate).toLocaleDateString()} at {appointmentTime}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Type:</span>
                      <span className="font-medium capitalize">{consultationType} Consultation</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Fee:</span>
                      <span className="font-medium">${selectedDoctor.consultationFee}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Urgency:</span>
                      <Badge className={getUrgencyColor(urgency)}>
                        {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  You will receive a confirmation email and reminders before your appointment.
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  The doctor will have access to your scan result and medical profile for context.
                </p>
              </div>

              <Button onClick={onClose} className="bg-green-600 hover:bg-green-700">
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}