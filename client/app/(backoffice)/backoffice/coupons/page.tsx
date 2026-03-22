'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Tag, Plus, Copy, CheckCircle, XCircle, ToggleLeft, ToggleRight } from '@phosphor-icons/react';

interface Coupon {
  id: number;
  code: string;
  courseId: number | null;
  course: { id: number; title: string } | null;
  discountAmount: string;
  expiresAt: string;
  isActive: boolean;
  usageLimit: number | null;
  usedCount: number;
  createdAt: string;
}

interface Course {
  id: number;
  title: string;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  // Form state
  const [courseId, setCourseId] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [creating, setCreating] = useState(false);

  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    loadCoupons();
    api.get('/courses').then((d: any) => setCourses(d.courses ?? [])).catch(() => {});
  }, []);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/coupons');
      setCoupons(data.coupons ?? []);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!discountAmount || !expiresAt) {
      toast.error('Discount amount and expiry date are required');
      return;
    }
    setCreating(true);
    try {
      const coupon = await api.post('/admin/coupons', {
        courseId: courseId ? Number(courseId) : null,
        discountAmount: parseFloat(discountAmount),
        expiresAt,
        usageLimit: usageLimit ? parseInt(usageLimit) : null,
      });
      setCoupons(prev => [coupon, ...prev]);
      setCreateOpen(false);
      setCourseId('');
      setDiscountAmount('');
      setExpiresAt('');
      setUsageLimit('');
      toast.success(`Coupon ${coupon.code} created`);
    } catch {
      toast.error('Failed to create coupon');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (coupon: Coupon) => {
    try {
      const updated = await api.patch(`/admin/coupons/${coupon.id}/toggle`, {});
      setCoupons(prev => prev.map(c => c.id === updated.id ? updated : c));
      toast.success(updated.isActive ? 'Coupon activated' : 'Coupon deactivated');
    } catch {
      toast.error('Failed to toggle coupon');
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="px-6 py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl tracking-tight">Coupon Codes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage discount coupons for paid courses</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4 mr-2" />
          Create Coupon
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground text-sm">Loading coupons…</div>
      ) : coupons.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-3">
          <Tag className="size-10 opacity-30" />
          <p className="text-sm">No coupons yet. Create your first one.</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Code</th>
                <th className="text-left px-4 py-3 font-medium">Discount</th>
                <th className="text-left px-4 py-3 font-medium">Course</th>
                <th className="text-left px-4 py-3 font-medium">Usage</th>
                <th className="text-left px-4 py-3 font-medium">Expires</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {coupons.map(coupon => (
                <tr key={coupon.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-medium text-sm bg-muted px-2 py-0.5 rounded">
                        {coupon.code}
                      </code>
                      <button
                        onClick={() => handleCopy(coupon.code)}
                        className="text-muted-foreground hover:text-foreground"
                        title="Copy code"
                      >
                        {copied === coupon.code
                          ? <CheckCircle className="size-3.5 text-emerald-500" />
                          : <Copy className="size-3.5" />
                        }
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-emerald-600">₹{Number(coupon.discountAmount).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {coupon.course ? coupon.course.title : <span className="italic">All courses</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-muted-foreground">
                      {coupon.usedCount}{coupon.usageLimit !== null ? `/${coupon.usageLimit}` : ''}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(coupon.expiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {new Date(coupon.expiresAt) < new Date() && (
                      <Badge variant="error" className="ml-2 text-[10px]">Expired</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={coupon.isActive ? 'success' : 'neutral'}>
                      {coupon.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(coupon)}
                      className="text-muted-foreground hover:text-foreground"
                      title={coupon.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {coupon.isActive
                        ? <ToggleRight className="size-5 text-emerald-500" />
                        : <ToggleLeft className="size-5" />
                      }
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="size-4" /> Create Coupon
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="rounded-lg bg-muted/40 border px-3 py-2 text-xs text-muted-foreground">
              Code is auto-generated (8 random hex characters)
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Discount Amount (₹) <span className="text-destructive">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={discountAmount}
                  onChange={e => setDiscountAmount(e.target.value)}
                  className="pl-7"
                  placeholder="500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Applies to Course <span className="text-xs font-normal text-muted-foreground">(leave blank for all)</span></label>
              <select
                value={courseId}
                onChange={e => setCourseId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All paid courses</option>
                {courses.map((c: Course) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Expires At <span className="text-destructive">*</span></label>
              <Input
                type="datetime-local"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Usage Limit <span className="text-xs font-normal text-muted-foreground">(blank = unlimited)</span></label>
              <Input
                type="number"
                min="1"
                value={usageLimit}
                onChange={e => setUsageLimit(e.target.value)}
                placeholder="e.g. 100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating…' : 'Create Coupon'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
