import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Save, User, Shield, AlertTriangle, CheckCircle, Sparkles, Edit, Phone } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { UpdateProfileData } from "@shared/schema";

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    allergies: [] as string[],
    medications: [] as string[],
    emergencyContact: "",
  });
  const [newAllergy, setNewAllergy] = useState("");
  const [newMedication, setNewMedication] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, refetchUser } = useAuth();

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (userData: UpdateProfileData) => {
      const response = await apiRequest('PUT', `/api/users/${user?.id}`, userData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      refetchUser();
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
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        allergies: user.allergies || [],
        medications: user.medications || [],
        emergencyContact: user.emergencyContact || "",
      });
    }
  }, [user]);

  const handleSave = () => {
    updateUserMutation.mutate(formData);
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

  if (!user) {
    return (
      <div className="py-8 flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-full border border-blue-200 dark:border-blue-800">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Personal Health Profile</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 dark:from-gray-100 dark:via-blue-300 dark:to-purple-300 bg-clip-text text-transparent">
            Your Profile
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Manage your personal information, allergies, and medications for accurate food safety analysis
          </p>
        </div>
      </div>

      {/* Profile Header */}
      <Card className="bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <User className="text-white" size={28} />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">
                  {user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.username}
                </CardTitle>
                <p className="text-muted-foreground">{user.email}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-600">Profile Active</span>
                </div>
              </div>
            </div>
            {!isEditing ? (
              <Button
                size="lg"
                onClick={() => setIsEditing(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg"
                data-testid="button-edit-profile"
              >
                <Edit className="mr-2" size={20} />
                Edit Profile
              </Button>
            ) : (
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    setIsEditing(false);
                    // Reset form data
                    if (user) {
                      setFormData({
                        firstName: user.firstName || "",
                        lastName: user.lastName || "",
                        allergies: user.allergies || [],
                        medications: user.medications || [],
                        emergencyContact: user.emergencyContact || "",
                      });
                    }
                  }}
                  data-testid="button-cancel-edit"
                >
                  <X className="mr-2" size={20} />
                  Cancel
                </Button>
                <Button
                  size="lg"
                  onClick={handleSave}
                  disabled={updateUserMutation.isPending}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg"
                  data-testid="button-save-profile"
                >
                  {updateUserMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Saving...
                    </div>
                  ) : (
                    <>
                      <Save className="mr-2" size={20} />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Basic Information */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center space-x-2">
            <User className="w-5 h-5 text-blue-600" />
            <span>Basic Information</span>
          </CardTitle>
          <p className="text-muted-foreground">Your personal details and contact information</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                disabled={!isEditing}
                placeholder="John"
                className="h-12"
                data-testid="input-first-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                disabled={!isEditing}
                placeholder="Doe"
                className="h-12"
                data-testid="input-last-name"
              />
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-100/50 to-indigo-100/50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-700">
            <div className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>Account Information</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-blue-600" />
                <span className="text-blue-800 dark:text-blue-200"><strong>Username:</strong> {user.username}</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span className="text-blue-800 dark:text-blue-200"><strong>Email:</strong> {user.email}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergency-contact" className="text-sm font-medium flex items-center space-x-2">
              <Phone className="w-4 h-4 text-red-600" />
              <span>Emergency Contact</span>
            </Label>
            <Input
              id="emergency-contact"
              value={formData.emergencyContact}
              onChange={(e) => setFormData(prev => ({ ...prev, emergencyContact: e.target.value }))}
              placeholder="Phone number or contact name"
              disabled={!isEditing}
              className="h-12"
              data-testid="input-emergency-contact"
            />
            <p className="text-xs text-muted-foreground">This contact will be notified in case of emergency</p>
          </div>
        </CardContent>
      </Card>

      {/* Allergies */}
      <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span>Allergies & Dietary Restrictions</span>
          </CardTitle>
          <p className="text-muted-foreground">
            Add all allergies and dietary restrictions to get accurate safety analysis
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {isEditing && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Quick Add Common Allergies</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {commonAllergies.map((allergy) => (
                  <Button
                    key={allergy}
                    variant={formData.allergies.includes(allergy) ? "default" : "outline"}
                    size="sm"
                    className={formData.allergies.includes(allergy)
                      ? "bg-red-600 hover:bg-red-700 text-white border-red-600"
                      : "border-red-300 text-red-700 hover:bg-red-50 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900/20"
                    }
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
                    {formData.allergies.includes(allergy) && <CheckCircle className="w-3 h-3 mr-1" />}
                    {allergy}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {isEditing && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Add Custom Allergy</Label>
              <div className="flex space-x-3">
                <Input
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  placeholder="Enter specific allergy or dietary restriction..."
                  onKeyDown={(e) => e.key === 'Enter' && addAllergy()}
                  className="h-12"
                  data-testid="input-new-allergy"
                />
                <Button
                  onClick={addAllergy}
                  disabled={!newAllergy.trim()}
                  size="lg"
                  className="bg-red-600 hover:bg-red-700 text-white px-6"
                  data-testid="button-add-allergy"
                >
                  <Plus size={20} />
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Label className="text-sm font-medium">Your Allergies</Label>
            <div className="flex flex-wrap gap-3">
              {formData.allergies.length > 0 ? (
                formData.allergies.map((allergy) => (
                  <Badge
                    key={allergy}
                    className="bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700 px-3 py-2 text-sm font-medium flex items-center space-x-2"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span data-testid={`allergy-${allergy.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
                      {allergy}
                    </span>
                    {isEditing && (
                      <button
                        onClick={() => removeAllergy(allergy)}
                        className="ml-2 hover:bg-red-200 dark:hover:bg-red-800 rounded-full p-1 transition-colors"
                        data-testid={`remove-allergy-${allergy.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </Badge>
                ))
              ) : (
                <div className="text-center py-8 w-full">
                  <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-muted-foreground">No allergies added yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Add your allergies to get personalized safety analysis</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Medications */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center space-x-2">
            <Shield className="w-5 h-5 text-green-600" />
            <span>Current Medications</span>
          </CardTitle>
          <p className="text-muted-foreground">
            List all medications you're currently taking to check for potential food interactions
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {isEditing && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Add Medication</Label>
              <div className="flex space-x-3">
                <Input
                  value={newMedication}
                  onChange={(e) => setNewMedication(e.target.value)}
                  placeholder="Enter medication name or active ingredient..."
                  onKeyDown={(e) => e.key === 'Enter' && addMedication()}
                  className="h-12"
                  data-testid="input-new-medication"
                />
                <Button
                  onClick={addMedication}
                  disabled={!newMedication.trim()}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white px-6"
                  data-testid="button-add-medication"
                >
                  <Plus size={20} />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Include both prescription and over-the-counter medications</p>
            </div>
          )}

          <div className="space-y-3">
            <Label className="text-sm font-medium">Your Medications</Label>
            <div className="flex flex-wrap gap-3">
              {formData.medications.length > 0 ? (
                formData.medications.map((medication) => (
                  <Badge
                    key={medication}
                    className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700 px-3 py-2 text-sm font-medium flex items-center space-x-2"
                  >
                    <Shield className="w-3 h-3" />
                    <span data-testid={`medication-${medication.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
                      {medication}
                    </span>
                    {isEditing && (
                      <button
                        onClick={() => removeMedication(medication)}
                        className="ml-2 hover:bg-green-200 dark:hover:bg-green-800 rounded-full p-1 transition-colors"
                        data-testid={`remove-medication-${medication.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </Badge>
                ))
              ) : (
                <div className="text-center py-8 w-full">
                  <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-muted-foreground">No medications added yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Add your medications to check for food interactions</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Safety Tips */}
      <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-200 dark:border-yellow-800">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="text-white" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-yellow-900 dark:text-yellow-100 mb-3">Profile Safety Tips</h3>
              <ul className="space-y-2 text-sm text-yellow-800 dark:text-yellow-200">
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-yellow-600 flex-shrink-0" />
                  <span>Keep your allergy list updated whenever new sensitivities develop</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-yellow-600 flex-shrink-0" />
                  <span>Update medications immediately when prescriptions change</span>
                </li>
                <li className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 text-orange-600 flex-shrink-0" />
                  <span>This app supplements but doesn't replace medical advice</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Phone className="w-4 h-4 mt-0.5 text-yellow-600 flex-shrink-0" />
                  <span>Keep your emergency contact information current</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
