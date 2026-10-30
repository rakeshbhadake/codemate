import React, { useState, useRef } from 'react';
import { profileAPI } from '../../utils/api';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { Camera, Upload, Trash2, Loader2, User2 } from 'lucide-react';

interface ProfilePictureUploadProps {
  currentPicture: string | null;
  userName: string;
  onPictureUpdated: (url: string | null) => void;
}

export function ProfilePictureUpload({ currentPicture, userName, onPictureUpdated }: ProfilePictureUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a JPG, PNG, or WEBP image');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5242880) {
      setError('Image must be less than 5MB');
      return;
    }

    setError('');
    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError('');

    try {
      const result = await profileAPI.uploadPicture(selectedFile);
      onPictureUpdated(result.profilePicture);
      setIsOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err: any) {
      setError(err.message || 'Failed to upload picture');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to remove your profile picture?')) {
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      await profileAPI.deletePicture();
      onPictureUpdated(null);
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to delete picture');
    } finally {
      setIsUploading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <div className="relative group">
        <Avatar className="w-24 h-24 cursor-pointer" onClick={() => setIsOpen(true)}>
          <AvatarImage src={currentPicture || undefined} alt={userName} />
          <AvatarFallback>
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>
        <button
          onClick={() => setIsOpen(true)}
          className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Camera className="w-8 h-8 text-white" />
        </button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profile Picture</DialogTitle>
            <DialogDescription>
              Upload a new profile picture or remove the current one
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Current or Preview Picture */}
            <div className="flex justify-center">
              <Avatar className="w-32 h-32">
                <AvatarImage src={previewUrl || currentPicture || undefined} alt={userName} />
                <AvatarFallback>
                  <User2 className="w-16 h-16" />
                </AvatarFallback>
              </Avatar>
            </div>

            {/* File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Actions */}
            {!selectedFile ? (
              <div className="flex gap-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                  disabled={isUploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose Picture
                </Button>
                {currentPicture && (
                  <Button
                    onClick={handleDelete}
                    variant="destructive"
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={handleUpload}
                  className="flex-1"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setError('');
                  }}
                  variant="outline"
                  disabled={isUploading}
                >
                  Cancel
                </Button>
              </div>
            )}

            <p className="text-sm text-muted-foreground text-center">
              Supported formats: JPG, PNG, WEBP (max 5MB)
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
