'use client';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useRef, useState } from 'react';
import { Image, Link, Upload, X } from 'lucide-react';
import { INSERT_IMAGE_COMMAND } from '../plugins/images-plugin';
import { cn } from '@/lib/utils';

interface InsertImageDialogProps {
  onClose: () => void;
}

export function InsertImageDialog({ onClose }: InsertImageDialogProps): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [tab, setTab] = useState<'url' | 'upload'>('url');
  const [url, setUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndInsert = (src: string, alt: string) => {
    if (!src.trim()) {
      setError('Please provide an image source.');
      return;
    }
    editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
      src,
      altText: alt || 'Image',
      maxWidth: 800,
    });
    onClose();
  };

  const handleUrlSubmit = () => {
    validateAndInsert(url, altText);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      validateAndInsert(reader.result as string, file.name);
    };
    reader.readAsDataURL(file);
  };

  const inputClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Insert Image</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg border border-border p-0.5 mb-5 bg-muted/30">
          {(['url', 'upload'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 text-sm font-medium rounded-md transition-all',
                tab === t
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t === 'url' ? <Link className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
              {t === 'url' ? 'URL' : 'Upload'}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'url' ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Image URL
              </label>
              <input
                className={inputClass}
                placeholder="https://example.com/image.jpg"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Alt Text
              </label>
              <input
                className={inputClass}
                placeholder="Describe the image..."
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex flex-col items-center justify-center gap-3 h-32 rounded-lg border-2 border-dashed border-border',
              'cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all'
            )}
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-sm text-center">
              <span className="font-medium text-primary">Click to upload</span>
              <span className="text-muted-foreground"> or drag and drop</span>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF, WebP up to 10MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        )}

        {error && (
          <p className="mt-2 text-xs text-destructive">{error}</p>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          {tab === 'url' && (
            <button
              onClick={handleUrlSubmit}
              disabled={!url.trim()}
              className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Insert Image
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
