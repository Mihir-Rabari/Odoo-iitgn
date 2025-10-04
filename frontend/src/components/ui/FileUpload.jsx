import { useRef, useState } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from './Button';

const FileUpload = ({ 
  onFileSelect, 
  accept = 'image/*', 
  maxSize = 10485760, // 10MB
  className,
  preview = true
}) => {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setError('');

    // Validate file size
    if (selectedFile.size > maxSize) {
      setError(`File size must be less than ${(maxSize / 1024 / 1024).toFixed(0)}MB`);
      return;
    }

    setFile(selectedFile);

    // Create preview for images
    if (preview && selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }

    if (onFileSelect) {
      onFileSelect(selectedFile);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setPreviewUrl(null);
    setError('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    if (onFileSelect) {
      onFileSelect(null);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          error ? 'border-red-500' : 'border-gray-300 hover:border-primary'
        )}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          onChange={handleFileChange}
        />

        {!file ? (
          <div className="flex flex-col items-center space-y-2">
            <Upload className="h-10 w-10 text-gray-400" />
            <div>
              <p className="text-sm font-medium">Click to upload or drag and drop</p>
              <p className="text-xs text-gray-500 mt-1">
                {accept === 'image/*' ? 'PNG, JPG, GIF up to' : 'File up to'} {(maxSize / 1024 / 1024).toFixed(0)}MB
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-48 mx-auto rounded"
              />
            ) : (
              <FileText className="h-10 w-10 text-primary mx-auto" />
            )}
            <div className="flex items-center justify-center space-x-2">
              <p className="text-sm font-medium truncate max-w-xs">{file.name}</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                className="text-red-500 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default FileUpload;
