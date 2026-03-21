'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, Check, Eye, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TemplateInfo {
  key: string;
  name: string;
}

interface CertificateTabProps {
  courseId: string;
  currentTemplate: string | null;
  onTemplateChange: (templateKey: string | null) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function fetchTemplateHtml(key: string): Promise<string> {
  const token = getToken();
  const res = await fetch(`${API_URL}/certificates/templates/${key}/preview`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Failed to fetch preview');
  return res.text();
}

function TemplatePreviewCard({
  template,
  html,
  isSelected,
  onSelect,
  onPreview,
}: {
  template: TemplateInfo;
  html: string | null;
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
}) {
  return (
    <div
      className={cn(
        'group relative rounded-xl border-2 bg-card overflow-hidden transition-all duration-200',
        isSelected
          ? 'border-primary ring-2 ring-primary/20 shadow-lg'
          : 'border-border hover:border-primary/40 hover:shadow-md',
      )}
    >
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {html ? (
          <iframe
            srcDoc={html}
            className="absolute inset-0 w-[900px] h-[650px] origin-top-left pointer-events-none"
            style={{ transform: 'scale(0.36)', transformOrigin: 'top left' }}
            title={`${template.name} preview`}
            sandbox=""
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {isSelected && (
          <div className="absolute top-3 right-3 size-7 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <Check className="size-4 text-primary-foreground" />
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
          className="absolute bottom-3 right-3 size-8 rounded-lg bg-background/90 backdrop-blur-sm border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
          title="Preview full size"
        >
          <Eye className="size-4 text-foreground" />
        </button>
      </div>

      <div className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Award className="size-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium truncate">{template.name}</span>
        </div>
        <Button
          variant={isSelected ? 'default' : 'outline'}
          size="sm"
          onClick={onSelect}
          className="shrink-0"
        >
          {isSelected ? (
            <>
              <Check className="size-3.5 mr-1" />
              Selected
            </>
          ) : (
            'Select'
          )}
        </Button>
      </div>
    </div>
  );
}

function FullPreviewModal({
  html,
  templateName,
  onClose,
}: {
  html: string;
  templateName: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-[95vw] max-w-[960px] h-[85vh] flex flex-col bg-background rounded-2xl border shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b bg-card">
          <div className="flex items-center gap-2">
            <Award className="size-4 text-primary" />
            <span className="text-sm font-semibold">{templateName}</span>
            <Badge variant="neutral" className="text-xs">
              Preview
            </Badge>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-muted/30 p-4">
          <iframe
            srcDoc={html}
            className="w-full h-full min-h-[600px] bg-white rounded-lg border shadow-sm"
            title={`${templateName} full preview`}
            sandbox=""
          />
        </div>
      </div>
    </div>
  );
}

export function CertificateTab({
  courseId,
  currentTemplate,
  onTemplateChange,
}: CertificateTabProps) {
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [htmlMap, setHtmlMap] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(currentTemplate);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewKey, setPreviewKey] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      const data = await api.get('/certificates/templates');
      const list: TemplateInfo[] = data.templates ?? [];
      setTemplates(list);

      const entries = await Promise.all(
        list.map(async (t) => {
          try {
            const html = await fetchTemplateHtml(t.key);
            return [t.key, html] as const;
          } catch {
            return [t.key, ''] as const;
          }
        }),
      );
      setHtmlMap(Object.fromEntries(entries));
    } catch {
      toast.error('Failed to load certificate templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    setSelected(currentTemplate);
  }, [currentTemplate]);

  const handleSelect = async (key: string) => {
    const newValue = selected === key ? null : key;
    setSelected(newValue);
    setSaving(true);
    try {
      await api.patch(`/courses/${courseId}`, {
        certificateTemplate: newValue,
      });
      onTemplateChange(newValue);
      toast.success(
        newValue
          ? `Certificate template set to "${templates.find((t) => t.key === newValue)?.name}"`
          : 'Certificate template removed',
      );
    } catch {
      setSelected(currentTemplate);
      toast.error('Failed to save template selection');
    } finally {
      setSaving(false);
    }
  };

  const previewTemplate = previewKey
    ? templates.find((t) => t.key === previewKey)
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Award className="size-5 text-primary" />
              Certificate Template
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Choose a certificate design for this course. When learners
              complete all lessons and attempt at least one quiz, they will
              receive this certificate.
            </p>
          </div>
          {saving && (
            <Badge variant="neutral" className="shrink-0">
              <Loader2 className="size-3 animate-spin mr-1" />
              Saving...
            </Badge>
          )}
        </div>

        {selected && (
          <div className="flex items-center gap-2 mb-5 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Check className="size-4 text-primary shrink-0" />
            <p className="text-sm">
              <span className="font-medium">Active template:</span>{' '}
              {templates.find((t) => t.key === selected)?.name ?? selected}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((tpl) => (
            <TemplatePreviewCard
              key={tpl.key}
              template={tpl}
              html={htmlMap[tpl.key] || null}
              isSelected={selected === tpl.key}
              onSelect={() => handleSelect(tpl.key)}
              onPreview={() => setPreviewKey(tpl.key)}
            />
          ))}
        </div>

        {templates.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Award className="size-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No certificate templates available.</p>
          </div>
        )}
      </div>

      {previewTemplate && htmlMap[previewTemplate.key] && (
        <FullPreviewModal
          html={htmlMap[previewTemplate.key]}
          templateName={previewTemplate.name}
          onClose={() => setPreviewKey(null)}
        />
      )}
    </div>
  );
}
