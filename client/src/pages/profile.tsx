import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, Save, User } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User as UserType } from "@shared/schema";

// Mock user ID for demo
const DEMO_USER_ID = "demo-user-123";

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    allergies: [] as string[],
    medications: [] as string[],
    emergencyContact: "",
  });
  const [newAllergy, setNewAllergy] = useState("");
  const [newMedication, setNewMedication] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user profile
  const { data: userProfile, isLoading } = useQuery({
    queryKey: ['/api/users', DEMO_USER_ID],
    enabled: !!DEMO_USER_ID,
  });

  // Create user mutation (for first time setup)
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await apiRequest('POST', '/api/users', userData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', DEMO_USER_ID] });
      toast({
        title: "Profile created",
        description: "Your profile has been set up successfully",
      });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create profile",
        variant: "destructive",
      });
    }
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await apiRequest('PUT', `/api/users/${DEMO_USER_ID}`, userData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', DEMO_USER_ID] });
      toast({
        title: "Profile updated",
        description: "Your changes have been saved successfully",
      });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({
        username: userProfile.username || "",
        email: userProfile.email || "",
        allergies: userProfile.allergies || [],
        medications: userProfile.medications || [],
        emergencyContact: userProfile.emergencyContact || "",
      });
    } else if (!isLoading) {
      // No user profile exists, set up for first time
      setIsEditing(true);
      setFormData({
        username: "Demo User",
        email: "demo@example.com",
        allergies: [],
        medications: [],
        emergencyContact: "",
      });
    }
  }, [userProfile, isLoading]);

  const handleSave = () => {
    if (!formData.username || !formData.email) {
      toast({
        title: "Validation Error",
        description: "Username and email are required",
        variant: "destructive",
      });
      return;
    }

    if (userProfile) {
      updateUserMutation.mutate(formData);
    } else {
      createUserMutation.mutate(formData);
    }
  };

  const addAllergy = () => {
    if (newAllergy.trim() && !formData.allergies.includes(newAllergy.trim())) {
      setFormData(prev => ({
        ...prev,
        allergies: [...prev.allergies, newAllergy.trim()]
      }));
      setNewAllergy("");
    }
  };

  const removeAllergy = (allergy: string) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies.filter(a => a !== allergy)
    }));
  };

  const addMedication = () => {
    if (newMedication.trim() && !formData.medications.includes(newMedication.trim())) {
      setFormData(prev => ({
        ...prev,
        medications: [...prev.medications, newMedication.trim()]
      }));
      setNewMedication("");
    }
  };

  const removeMedication = (medication: string) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.filter(m => m !== medication)
    }));
  };

  const commonAllergies = [
    "Peanuts", "Tree nuts", "Dairy", "Eggs", "Soy", "Wheat/Gluten", 
    "Fish", "Shellfish", "Sesame", "Sulfites"
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Profile Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                  <User className="text-primary-foreground" size={24} />
                </div>
                <div>
                  <CardTitle className="text-lg">My Profile</CardTitle>
                  <p className="text-sm text-muted-foreground">Manage your health information</p>
                </div>
              </div>
              {!isEditing ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  data-testid="button-edit-profile"
                >
                  Edit
                </Button>
              ) : (
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      // Reset form data if editing existing profile
                      if (userProfile) {
                        setFormData({
                          username: userProfile.username || "",
                          email: userProfile.email || "",
                          allergies: userProfile.allergies || [],
                          medications: userProfile.medications || [],
                          emergencyContact: userProfile.emergencyContact || "",
                        });
                      }
                    }}
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleSave}
                    disabled={createUserMutation.isPending || updateUserMutation.isPending}
                    data-testid="button-save-profile"
                  >
                    <Save className="mr-2" size={16} />
                    Save
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                disabled={!isEditing}
                data-testid="input-username"
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                disabled={!isEditing}
                data-testid="input-email"
              />
            </div>
            <div>
              <Label htmlFor="emergency-contact">Emergency Contact</Label>
              <Input
                id="emergency-contact"
                value={formData.emergencyContact}
                onChange={(e) => setFormData(prev => ({ ...prev, emergencyContact: e.target.value }))}
                placeholder="Phone number or contact name"
                disabled={!isEditing}
                data-testid="input-emergency-contact"
              />
            </div>
          </CardContent>
        </Card>

        {/* Allergies */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Allergies & Dietary Restrictions</CardTitle>
            <p className="text-sm text-muted-foreground">
              Add all allergies and dietary restrictions to get accurate analysis
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing && (
              <div>
                <Label>Quick Add</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {commonAllergies.map((allergy) => (
                    <Button
                      key={allergy}
                      variant={formData.allergies.includes(allergy) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (formData.allergies.includes(allergy)) {
                          removeAllergy(allergy);
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            allergies: [...prev.allergies, allergy]
                          }));
                        }
                      }}
                      data-testid={`quick-add-allergy-${allergy.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    >
                      {allergy}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {isEditing && (
              <div className="flex space-x-2">
                <Input
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  placeholder="Add custom allergy..."
                  onKeyPress={(e) => e.key === 'Enter' && addAllergy()}
                  data-testid="input-new-allergy"
                />
                <Button 
                  onClick={addAllergy}
                  disabled={!newAllergy.trim()}
                  data-testid="button-add-allergy"
                >
                  <Plus size={16} />
                </Button>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {formData.allergies.length > 0 ? (
                formData.allergies.map((allergy) => (
                  <Badge key={allergy} variant="destructive" className="flex items-center space-x-1">
                    <span data-testid={`allergy-${allergy.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
                      {allergy}
                    </span>
                    {isEditing && (
                      <button 
                        onClick={() => removeAllergy(allergy)}
                        className="ml-1 hover:bg-destructive-foreground/20 rounded"
                        data-testid={`remove-allergy-${allergy.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No allergies added yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Medications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current Medications</CardTitle>
            <p className="text-sm text-muted-foreground">
              List all medications you're currently taking to check for food interactions
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing && (
              <div className="flex space-x-2">
                <Input
                  value={newMedication}
                  onChange={(e) => setNewMedication(e.target.value)}
                  placeholder="Add medication..."
                  onKeyPress={(e) => e.key === 'Enter' && addMedication()}
                  data-testid="input-new-medication"
                />
                <Button 
                  onClick={addMedication}
                  disabled={!newMedication.trim()}
                  data-testid="button-add-medication"
                >
                  <Plus size={16} />
                </Button>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {formData.medications.length > 0 ? (
                formData.medications.map((medication) => (
                  <Badge key={medication} variant="secondary" className="flex items-center space-x-1">
                    <span data-testid={`medication-${medication.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
                      {medication}
                    </span>
                    {isEditing && (
                      <button 
                        onClick={() => removeMedication(medication)}
                        className="ml-1 hover:bg-secondary-foreground/20 rounded"
                        data-testid={`remove-medication-${medication.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No medications added yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Safety Tips */}
        <Card className="bg-gradient-to-r from-accent/10 to-primary/10">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
                <i className="fas fa-shield-alt text-accent-foreground text-sm"></i>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-1">Keep Your Profile Updated</h4>
                <p className="text-xs text-muted-foreground">
                  Always update your allergies and medications when they change. This ensures accurate safety analysis.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
