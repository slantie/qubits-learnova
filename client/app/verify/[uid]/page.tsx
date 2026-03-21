'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Medal,
  CheckCircle,
  XCircle,
  Calendar,
  Star,
  BookOpen,
  ArrowSquareOut,
  ShieldCheck,
  CircleNotch,
  Printer,
} from '@phosphor-icons/react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface VerifiedCertificate {
  uid: string;
  recipientName: string;
  courseName: string;
  courseCoverImage: string | null;
  courseId: number;
  pointsEarned: number;
  templateKey: string;
  issuedAt: string;
}

export default function VerifyPage() {
  const { uid } = useParams<{ uid: string }>();
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [cert, setCert] = useState<VerifiedCertificate | null>(null);
  const [certHtml, setCertHtml] = useState<string | null>(null);
  const [showCert, setShowCert] = useState(false);

  const fetchVerification = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/certificates/verify/${uid}`);
      const data = await res.json();
      setValid(data.valid);
      setCert(data.certificate ?? null);

      if (data.valid) {
        const htmlRes = await fetch(`${API_URL}/certificates/view/${uid}`);
        if (htmlRes.ok) {
          setCertHtml(await htmlRes.text());
        }
      }
    } catch {
      setValid(false);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    fetchVerification();
  }, [fetchVerification]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <CircleNotch className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying certificate...</p>
        </div>
      </div>
    );
  }

  if (!valid || !cert) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-6">
        <div className="w-full max-w-lg text-center">
          <div className="rounded-2xl border bg-card p-10 shadow-lg">
            <div className="mx-auto mb-6 size-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="size-10 text-destructive" />
            </div>
            <h1 className="text-2xl mb-2">Certificate Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The certificate ID <code className="text-xs bg-muted px-2 py-1 rounded">{uid}</code>{' '}
              could not be verified. It may have been revoked or the ID is incorrect.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <ArrowSquareOut className="size-4" />
              Go to Learnova
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const issuedDate = new Date(cert.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header bar */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <Medal className="size-5 text-primary" />
            <span>Learnova</span>
          </Link>
          <span className="text-xs text-muted-foreground">Certificate Verification</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Verification badge */}
        <div className="flex items-center justify-center mb-8">
          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              This certificate is verified and valid
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Certificate details */}
          <div className="lg:col-span-1 flex flex-col gap-5">
            {/* Recipient card */}
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                  {cert.recipientName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className=" text-lg leading-tight">{cert.recipientName}</h2>
                  <p className="text-xs text-muted-foreground">Certificate Holder</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <BookOpen className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Course</p>
                    <p className="text-sm font-medium">{cert.courseName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Issued On</p>
                    <p className="text-sm font-medium">{issuedDate}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Star className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Points Earned</p>
                    <p className="text-sm font-medium">{cert.pointsEarned}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Certificate ID</p>
                    <p className="text-xs font-mono text-muted-foreground break-all">{cert.uid}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Verification info */}
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <h3 className="text-sm mb-3 flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-600" />
                About Verification
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This certificate was issued by Learnova upon completion of all
                course lessons and at least one quiz attempt. The certificate ID
                is unique and can be verified at any time using this page.
              </p>
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Issued by:</span> Learnova Platform
                </p>
              </div>
            </div>
          </div>

          {/* Right: Certificate preview */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Medal className="size-4 text-primary" />
                  <span className="text-sm font-semibold">Certificate Preview</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCert(!showCert)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showCert ? 'Collapse' : 'Expand'}
                  </button>
                  {certHtml && (
                    <button
                      onClick={() => {
                        const w = window.open('', '_blank');
                        if (w) { w.document.write(certHtml); w.document.close(); w.print(); }
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-foreground bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Printer className="size-3.5" />
                      Print / PDF
                    </button>
                  )}
                </div>
              </div>

              {certHtml ? (
                <div className={showCert ? '' : 'max-h-[500px] overflow-hidden relative'}>
                  <iframe
                    srcDoc={certHtml}
                    className="w-full border-0"
                    style={{ height: showCert ? '700px' : '500px' }}
                    title="Certificate"
                    sandbox=""
                  />
                  {!showCert && (
                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-card to-transparent pointer-events-none" />
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center py-20 text-muted-foreground">
                  <CircleNotch className="size-5 animate-spin mr-2" />
                  Loading certificate...
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-muted-foreground">
          <p>Learnova — Learn, Achieve, Grow</p>
          <Link href="/" className="hover:text-foreground transition-colors">
            Visit Learnova
          </Link>
        </div>
      </footer>
    </div>
  );
}
