import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Upload, Camera, X, Loader2, CheckCircle } from "lucide-react";

interface PhotoUploadProps {
  onComplete: (photoUrl: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export default function PhotoUpload({ onComplete, isLoading = false, disabled = false }: PhotoUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      // Validate file type
      if (!f.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (f.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const handleRemovePhoto = () => {
    setFile(null);
    setPreview(null);
    // Clear the input
    const input = document.getElementById('photo-input') as HTMLInputElement;
    if (input) input.value = '';
  };

  const handleCompleteWithPhoto = async () => {
    if (!file) {
      alert('Please select a photo first');
      return;
    }

    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "CompleteBooking");

      const res = await fetch("https://api.cloudinary.com/v1_1/dqz0crqoj/image/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Upload failed');
      }

      const data = await res.json();
      
      if (data.secure_url) {
        onComplete(data.secure_url);
      } else {
        throw new Error('No URL returned from upload');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Upload Photo of Cleaned Room
        </label>
        
        {!preview ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
            <input
              id="photo-input"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={disabled || uploading || isLoading}
            />
            <label
              htmlFor="photo-input"
              className="cursor-pointer flex flex-col items-center space-y-2"
            >
              <div className="p-3 bg-gray-100 rounded-full">
                <Camera className="h-6 w-6 text-gray-600" />
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium text-blue-600 hover:text-blue-500">
                  Click to upload
                </span>
                {' '}or drag and drop
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
            </label>
          </div>
        ) : (
          <Card className="relative">
            <CardContent className="p-4">
              <div className="relative">
                <img
                  src={preview}
                  alt="Room photo preview"
                  className="w-full h-48 object-cover rounded-lg border"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2 bg-white hover:bg-gray-50 hover:cursor-pointer"
                  onClick={handleRemovePhoto}
                  disabled={uploading || isLoading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-3 flex items-center text-sm text-gray-600">
                <Upload className="h-4 w-4 mr-2" />
                <span className="truncate">{file?.name}</span>
                <span className="ml-2 text-gray-400">
                  ({(file?.size || 0 / 1024 / 1024).toFixed(1)} MB)
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Complete Booking Button */}
      <Button
        onClick={handleCompleteWithPhoto}
        disabled={!file || uploading || isLoading || disabled}
        className="w-full bg-green-600 hover:bg-green-700 text-white py-3 h-auto hover:cursor-pointer"
        size="lg"
      >
        {uploading || isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin mr-3" />
            {uploading ? 'Uploading Photo...' : 'Completing Booking...'}
          </>
        ) : (
          <>
            <CheckCircle className="h-5 w-5 mr-3" />
            Complete Booking with Photo
          </>
        )}
      </Button>

      {/* Info Text */}
      <p className="text-sm text-gray-500 text-center">
        Please upload a photo showing the room has been cleaned and organized before completing the booking.
      </p>
    </div>
  );
}