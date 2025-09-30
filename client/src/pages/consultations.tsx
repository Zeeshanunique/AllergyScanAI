import { useState, useEffect } from "react";
import { Calendar, Clock, User, Phone, Video, MessageSquare, ChevronRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { ConsultationHistory } from "@shared/schema";

export function ConsultationsPage() {
  const [consultations, setConsultations] = useState<ConsultationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchConsultations();
  }, [filter]);

  const fetchConsultations = async () => {
    try {
      setLoading(true);
      const url = filter === 'all'
        ? '/api/consultations'
        : `/api/consultations?status=${filter}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch consultations');
      }

      const data = await response.json();
      setConsultations(data.consultations || []);
    } catch (error) {
      console.error('Failed to fetch consultations:', error);
      toast({
        title: "Error",
        description: "Failed to load consultation history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'no-show': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConsultationIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'phone': return <Phone className="w-4 h-4" />;
      case 'chat': return <MessageSquare className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isUpcoming = (dateString: string, timeString: string) => {
    const consultationDateTime = new Date(`${dateString}T${timeString}`);
    return consultationDateTime > new Date();
  };

  const upcomingConsultations = consultations.filter(c =>
    c.status === 'scheduled' && isUpcoming(c.appointmentDate.toISOString().split('T')[0], c.appointmentTime)
  );

  const pastConsultations = consultations.filter(c =>
    c.status !== 'scheduled' || !isUpcoming(c.appointmentDate.toISOString().split('T')[0], c.appointmentTime)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
          <div className="max-w-4xl mx-auto p-4">
            <h1 className="text-2xl font-bold">Consultations</h1>
          </div>
        </div>
        <div className="max-w-4xl mx-auto p-4">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading consultations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Consultations</h1>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="bg-background border border-border rounded-md px-3 py-1 text-sm"
              >
                <option value="all">All</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Upcoming Consultations */}
        {upcomingConsultations.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Upcoming Consultations
            </h2>
            <div className="space-y-3">
              {upcomingConsultations.map((consultation) => (
                <Card key={consultation.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{consultation.doctorName}</h3>
                          <p className="text-sm text-muted-foreground">{consultation.doctorSpecialty}</p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(consultation.appointmentDate.toISOString())}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{consultation.appointmentTime}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              {getConsultationIcon(consultation.consultationType)}
                              <span className="capitalize">{consultation.consultationType}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(consultation.status)}>
                          {consultation.status}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          ${consultation.consultationFee}
                        </p>
                      </div>
                    </div>

                    {consultation.reason && (
                      <div className="mt-3 p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">Reason for consultation:</p>
                        <p className="text-sm text-muted-foreground">{consultation.reason}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Past Consultations */}
        {pastConsultations.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">
              Consultation History
            </h2>
            <div className="space-y-3">
              {pastConsultations.map((consultation) => (
                <Card key={consultation.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{consultation.doctorName}</h3>
                          <p className="text-sm text-muted-foreground">{consultation.doctorSpecialty}</p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(consultation.appointmentDate.toISOString())}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{consultation.appointmentTime}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              {getConsultationIcon(consultation.consultationType)}
                              <span className="capitalize">{consultation.consultationType}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(consultation.status)}>
                          {consultation.status}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          ${consultation.consultationFee}
                        </p>
                      </div>
                    </div>

                    {consultation.notes && (
                      <div className="mt-3 p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">Doctor's Notes:</p>
                        <p className="text-sm text-muted-foreground">{consultation.notes}</p>
                      </div>
                    )}

                    {consultation.prescription && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm font-medium text-blue-800">Prescription:</p>
                        <p className="text-sm text-blue-700">{consultation.prescription}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {consultations.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No consultations found</h3>
            <p className="text-muted-foreground">
              {filter === 'all'
                ? "You haven't booked any consultations yet. Scan a product and consult with a doctor for personalized advice."
                : `No ${filter} consultations found.`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}