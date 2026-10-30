import React, { useState, useEffect } from 'react';
import { useAuth } from '../../utils/auth-context';
import { profileAPI } from '../../utils/api';
import { ProfilePictureUpload } from './ProfilePictureUpload';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { X, Plus, Loader2, Save, User2, Check } from 'lucide-react';

export function ProfileEditor() {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    username: (user as any)?.username || '',
    bio: user?.bio || '',
    location: user?.location || '',
    availability: user?.availability || 'available',
    skills: user?.skills || [],
    profilePicture: (user as any)?.profilePicture || null
  });
  const [newSkill, setNewSkill] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [usernameCheckTimeout, setUsernameCheckTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Check username availability with debounce
    if (field === 'username' && value !== (user as any)?.username) {
      if (usernameCheckTimeout) {
        clearTimeout(usernameCheckTimeout);
      }
      
      const normalized = value.toLowerCase().trim();
      if (!normalized || normalized.length < 3) {
        setUsernameStatus('idle');
        return;
      }
      
      setUsernameStatus('checking');
      const timeout = setTimeout(async () => {
        try {
          const result = await profileAPI.checkUsername(normalized);
          setUsernameStatus(result.available ? 'available' : 'taken');
        } catch (err) {
          setUsernameStatus('idle');
        }
      }, 500);
      
      setUsernameCheckTimeout(timeout);
    }
  };

  const handlePictureUpdated = (url: string | null) => {
    setFormData(prev => ({ ...prev, profilePicture: url }));
    updateUser({ ...user, profilePicture: url } as any);
    setMessage({ type: 'success', text: 'Profile picture updated!' });
  };
  
  useEffect(() => {
    return () => {
      if (usernameCheckTimeout) {
        clearTimeout(usernameCheckTimeout);
      }
    };
  }, [usernameCheckTimeout]);

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (usernameStatus === 'taken') {
      setMessage({ type: 'error', text: 'Please choose a different username' });
      return;
    }
    
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      console.log('Updating profile with data:', formData);
      const result = await profileAPI.update(formData);
      console.log('Profile update result:', result);
      updateUser(result.profile);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      console.error('Profile update error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <User2 className="w-8 h-8" />
            <div>
              <CardTitle>Edit Profile</CardTitle>
              <CardDescription>Update your information and skills</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {message.text && (
              <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            {/* Profile Picture */}
            <div className="space-y-2">
              <Label>Profile Picture</Label>
              <div className="flex items-center gap-4">
                <ProfilePictureUpload
                  currentPicture={formData.profilePicture}
                  userName={formData.name}
                  onPictureUpdated={handlePictureUpdated}
                />
                <div className="text-sm text-muted-foreground">
                  <p>Click to update your profile picture</p>
                  <p>Supported: JPG, PNG, WEBP (max 5MB)</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Your name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  placeholder="username"
                  required
                  className="pr-10"
                />
                {usernameStatus === 'checking' && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {usernameStatus === 'available' && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
                {usernameStatus === 'taken' && (
                  <X className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                )}
              </div>
              {usernameStatus === 'taken' && (
                <p className="text-sm text-red-500">This username is already taken</p>
              )}
              {usernameStatus === 'available' && formData.username !== (user as any)?.username && (
                <p className="text-sm text-green-500">Username is available!</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleChange('bio', e.target.value)}
                placeholder="Tell others about yourself..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="City, Country"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="availability">Availability</Label>
              <Select
                value={formData.availability}
                onValueChange={(value) => handleChange('availability', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Skills</Label>
              <div className="flex gap-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Add a skill (e.g., React, Python)"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                />
                <Button type="button" onClick={addSkill} size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {formData.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="gap-1">
                    #{skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={isLoading || usernameStatus === 'taken'} className="flex-1">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
