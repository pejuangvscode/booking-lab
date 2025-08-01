import { useState, useRef } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Upload, Camera, X, Loader2, CheckCircle, Image } from "lucide-react";

interface PhotoUploadProps {
  onComplete: (photoUrl: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export default function PhotoUpload({ onComplete, isLoading = false, disabled = false }: PhotoUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemovePhoto = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

      console.log("Uploading to Cloudinary...");

      const res = await fetch("https://api.cloudinary.com/v1_1/dqz0crqoj/image/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Upload failed');
      }

      const data = await res.json();
      console.log("Cloudinary response:", data);
      
      if (data.secure_url) {
        console.log("Calling onComplete with URL:", data.secure_url);
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
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,image/heic,image/heif"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || uploading || isLoading}
        capture="environment" // This enables camera on mobile
      />

      {/* Upload Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Upload Photo of Cleaned Room
        </label>
        
        {!preview ? (
          <div className="space-y-3">
            {/* Camera/Gallery Button for Mobile */}
            <Button
              type="button"
              variant="outline"
              onClick={handleButtonClick}
              disabled={disabled || uploading || isLoading}
              className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center space-y-2 hover:border-gray-400 transition-colors"
            >
              <Camera className="h-8 w-8 text-gray-400" />
              <div className="text-center">
                <div className="text-sm font-medium text-gray-700">Take Photo or Upload</div>
                <div className="text-xs text-gray-500">Tap to open camera or gallery</div>
              </div>
            </Button>
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
                  className="absolute top-2 right-2 bg-white hover:bg-gray-50 shadow-md"
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
                  ({((file?.size || 0) / 1024 / 1024).toFixed(1)} MB)
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
        className="w-full bg-green-600 hover:bg-green-700 text-white py-3 h-auto"
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