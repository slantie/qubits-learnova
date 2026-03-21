import prisma from '../../lib/prisma';
import { sendMail } from '../../lib/mailer';
import { AppError } from '../../config/AppError';
import { templates, renderCertificate, type CertificateData } from '../../templates/certificates';
import * as fs from 'fs';
import * as path from 'path';

const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:3000';
const API_BASE = process.env.API_BASE_URL ?? `http://localhost:${process.env.PORT ?? 4000}/api`;

// Embed logo as base64 so it renders in sandboxed iframes and cross-origin contexts
let LOGO_DATA_URI = '';
try {
  const logoPath = path.join(__dirname, '..', '..', '..', '..', 'client', 'public', 'learnova.png');
  const buf = fs.readFileSync(logoPath);
  LOGO_DATA_URI = `data:image/png;base64,${buf.toString('base64')}`;
} catch {
  // logo file not found — templates will render without it
}

function verifyUrl(uid: string) {
  return `${CLIENT_URL}/verify/${uid}`;
}

function apiVerifyUrl(uid: string) {
  return `${API_BASE}/certificates/verify/${uid}`;
}

export const listTemplates = () =>
  templates.map(t => ({ key: t.key, name: t.name }));

export const previewTemplate = (templateKey: string) => {
  const sampleData: CertificateData = {
    recipientName: 'Jane Doe',
    courseName: 'Introduction to Machine Learning',
    issueDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    certificateId: 'PREVIEW-000',
    points: 24,
    verifyUrl: verifyUrl('PREVIEW-000'),
    logoUrl: LOGO_DATA_URI,
  };
  return renderCertificate(templateKey, sampleData);
};

export const issueCertificate = async (
  userId: number,
  courseId: number,
  templateKey: string,
) => {
  const existing = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (existing) return existing;

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment || enrollment.status !== 'COMPLETED') {
    throw new AppError(400, 'Course must be completed before a certificate can be issued', 'COURSE_NOT_COMPLETED');
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });
  if (!course) throw new AppError(404, 'Course not found', 'COURSE_NOT_FOUND');

  const quizzes = await prisma.quiz.findMany({
    where: { courseId },
    select: { id: true },
  });

  if (quizzes.length > 0) {
    const attemptCount = await prisma.quizAttempt.count({
      where: { userId, quizId: { in: quizzes.map(q => q.id) } },
    });
    if (attemptCount === 0) {
      throw new AppError(400, 'You must attempt at least one quiz before getting a certificate', 'QUIZ_NOT_ATTEMPTED');
    }
  }

  const totalPoints = await prisma.quizAttempt.aggregate({
    where: { userId, quizId: { in: quizzes.map(q => q.id) } },
    _sum: { pointsEarned: true },
  }).then(r => r._sum.pointsEarned ?? 0);

  const cert = await prisma.certificate.create({
    data: {
      userId,
      courseId,
      templateKey,
      scorePercent: 0,
      pointsEarned: totalPoints,
    },
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });

  const certData: CertificateData = {
    recipientName: user!.name,
    courseName: course.title,
    issueDate: cert.issuedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    certificateId: cert.uid,
    points: totalPoints,
    verifyUrl: verifyUrl(cert.uid),
    logoUrl: LOGO_DATA_URI,
  };

  renderCertificate(templateKey, certData);

  const emailVerifyLink = apiVerifyUrl(cert.uid);

  try {
    await sendMail({
      to: user!.email,
      subject: `Your Certificate for "${course.title}" — Learnova`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <h2>Congratulations, ${user!.name}!</h2>
          <p>You've earned a certificate for completing <strong>${course.title}</strong>.</p>
          <p><strong>Points earned:</strong> ${totalPoints}</p>
          <p>You can view and share your verified certificate using the link below:</p>
          <p style="margin:16px 0;"><a href="${emailVerifyLink}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">View & Verify Certificate</a></p>
          <p style="margin-top:12px;font-size:13px;color:#666;">Or copy this verification link:<br/><a href="${emailVerifyLink}" style="color:#2563eb;word-break:break-all;">${emailVerifyLink}</a></p>
          <p style="margin-top:20px;font-size:14px;color:#666;">Certificate ID: ${cert.uid}</p>
          <hr style="margin:20px 0;border:none;border-top:1px solid #eee;">
          <p style="font-size:12px;color:#999;">Learnova — Learn, Achieve, Grow</p>
        </div>
      `,
    });
  } catch {
    // Email failure is non-fatal
  }

  return cert;
};

export const getMyCertificate = async (userId: number, courseId: number) => {
  return prisma.certificate.findUnique({
    where: { userId_courseId: { userId, courseId } },
    include: {
      course: { select: { title: true } },
      user: { select: { name: true } },
    },
  });
};

export const getCertificateByUid = async (uid: string) => {
  const cert = await prisma.certificate.findUnique({
    where: { uid },
    include: {
      course: { select: { title: true, coverImage: true } },
      user: { select: { name: true, email: true } },
    },
  });
  if (!cert) throw new AppError(404, 'Certificate not found', 'CERT_NOT_FOUND');
  return cert;
};

export const renderCertificateHtml = async (uid: string) => {
  const cert = await getCertificateByUid(uid);
  const data: CertificateData = {
    recipientName: cert.user.name,
    courseName: cert.course.title,
    issueDate: cert.issuedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    certificateId: cert.uid,
    points: cert.pointsEarned,
    verifyUrl: verifyUrl(cert.uid),
    logoUrl: LOGO_DATA_URI,
  };
  return renderCertificate(cert.templateKey, data);
};

export const verifyCertificate = async (uid: string) => {
  const cert = await prisma.certificate.findUnique({
    where: { uid },
    include: {
      course: { select: { id: true, title: true, coverImage: true } },
      user: { select: { name: true } },
    },
  });

  if (!cert) {
    return { valid: false as const };
  }

  return {
    valid: true as const,
    certificate: {
      uid: cert.uid,
      recipientName: cert.user.name,
      courseName: cert.course.title,
      courseCoverImage: cert.course.coverImage,
      courseId: cert.course.id,
      pointsEarned: cert.pointsEarned,
      templateKey: cert.templateKey,
      issuedAt: cert.issuedAt.toISOString(),
    },
  };
};

export const renderVerifyPage = async (uid: string): Promise<string> => {
  const cert = await prisma.certificate.findUnique({
    where: { uid },
    include: {
      course: { select: { id: true, title: true, coverImage: true } },
      user: { select: { name: true } },
    },
  });

  if (!cert) {
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Certificate Not Found — Learnova</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;background:#fafafa;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}.card{max-width:480px;width:100%;background:#fff;border-radius:16px;border:1px solid #e5e7eb;padding:48px 40px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.06)}.icon{width:64px;height:64px;border-radius:50%;background:#fef2f2;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:32px}h1{font-size:22px;font-weight:700;color:#111;margin-bottom:8px}p{font-size:14px;color:#6b7280;line-height:1.6;margin-bottom:16px}code{font-size:11px;background:#f3f4f6;padding:4px 8px;border-radius:4px;color:#374151}a{color:#2563eb;text-decoration:none;font-weight:500;font-size:14px}a:hover{text-decoration:underline}</style>
</head><body>
<div class="card">
  <div class="icon">&#10060;</div>
  <h1>Certificate Not Found</h1>
  <p>The certificate ID <code>${uid}</code> could not be verified. It may have been revoked or the ID is incorrect.</p>
  <a href="${CLIENT_URL}">Go to Learnova &rarr;</a>
</div>
</body></html>`;
  }

  const issuedDate = cert.issuedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const certViewUrl = `${API_BASE}/certificates/view/${uid}`;
  const clientVerifyUrl = verifyUrl(uid);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Certificate Verification — ${cert.user.name} | Learnova</title>
<meta name="description" content="${cert.user.name} earned a certificate for completing ${cert.course.title} on Learnova">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f8fafc;min-height:100vh;color:#1e293b}
.header{background:#fff;border-bottom:1px solid #e2e8f0;padding:12px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10}
.logo{font-weight:700;font-size:15px;color:#1e293b;text-decoration:none;display:flex;align-items:center;gap:8px}
.logo svg{color:#2563eb}
.actions{display:flex;gap:8px}
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;cursor:pointer;border:none;transition:all 0.15s}
.btn-outline{background:#fff;color:#374151;border:1px solid #d1d5db}.btn-outline:hover{background:#f9fafb}
.btn-primary{background:#2563eb;color:#fff}.btn-primary:hover{background:#1d4ed8}
.badge{display:inline-flex;align-items:center;gap:10px;padding:12px 20px;border-radius:999px;background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;font-size:13px;font-weight:600;margin:0 auto}
.badge svg{flex-shrink:0}
.main{max-width:1100px;margin:0 auto;padding:32px 24px}
.badge-row{display:flex;justify-content:center;margin-bottom:32px}
.grid{display:grid;grid-template-columns:1fr 2fr;gap:24px}
@media(max-width:768px){.grid{grid-template-columns:1fr}}
.panel{background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04)}
.panel-head{padding:16px 20px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:#1e293b}
.panel-body{padding:24px 20px}
.avatar{width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#dbeafe,#e0e7ff);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#2563eb;flex-shrink:0}
.recipient{display:flex;align-items:center;gap:14px;margin-bottom:24px}
.recipient h2{font-size:18px;font-weight:700;line-height:1.2}.recipient p{font-size:12px;color:#6b7280;margin-top:2px}
.detail{display:flex;align-items:flex-start;gap:12px;margin-bottom:20px}
.detail-icon{width:16px;height:16px;color:#9ca3af;flex-shrink:0;margin-top:2px}
.detail-label{font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;font-weight:600}
.detail-value{font-size:13px;font-weight:500;color:#1e293b;margin-top:2px}
.detail-mono{font-family:'SF Mono','Fira Code',monospace;font-size:11px;color:#6b7280;word-break:break-all;margin-top:2px}
.about{padding:20px;background:#f8fafc;border-top:1px solid #f1f5f9}
.about h3{font-size:13px;font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:6px;color:#065f46}
.about p{font-size:12px;color:#6b7280;line-height:1.6}
.cert-frame{background:#f8fafc;padding:16px}
.cert-frame iframe{width:100%;height:580px;border:none;border-radius:12px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.06)}
.print-row{padding:16px 20px;border-top:1px solid #f1f5f9;display:flex;gap:8px;justify-content:flex-end}
.footer{border-top:1px solid #e2e8f0;margin-top:48px;padding:20px 24px;max-width:1100px;margin-left:auto;margin-right:auto;display:flex;justify-content:space-between;font-size:12px;color:#9ca3af}
.footer a{color:#6b7280;text-decoration:none}.footer a:hover{color:#1e293b}
</style>
</head><body>

<div class="header">
  <a href="${CLIENT_URL}" class="logo">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
    Learnova
  </a>
  <span style="font-size:12px;color:#6b7280">Certificate Verification</span>
</div>

<div class="main">
  <div class="badge-row">
    <div class="badge">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
      This certificate is verified and valid
    </div>
  </div>

  <div class="grid">
    <div>
      <div class="panel">
        <div class="panel-body">
          <div class="recipient">
            <div class="avatar">${cert.user.name.charAt(0).toUpperCase()}</div>
            <div>
              <h2>${cert.user.name}</h2>
              <p>Certificate Holder</p>
            </div>
          </div>

          <div class="detail">
            <svg class="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            <div>
              <div class="detail-label">Course</div>
              <div class="detail-value">${cert.course.title}</div>
            </div>
          </div>

          <div class="detail">
            <svg class="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            <div>
              <div class="detail-label">Issued On</div>
              <div class="detail-value">${issuedDate}</div>
            </div>
          </div>

          <div class="detail">
            <svg class="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <div>
              <div class="detail-label">Points Earned</div>
              <div class="detail-value">${cert.pointsEarned}</div>
            </div>
          </div>

          <div class="detail" style="margin-bottom:0">
            <svg class="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>
            <div>
              <div class="detail-label">Certificate ID</div>
              <div class="detail-mono">${cert.uid}</div>
            </div>
          </div>
        </div>

        <div class="about">
          <h3>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
            About Verification
          </h3>
          <p>This certificate was issued by Learnova upon completion of all course lessons and at least one quiz attempt. The certificate ID is unique and can be verified at any time using this page.</p>
        </div>
      </div>
    </div>

    <div>
      <div class="panel">
        <div class="panel-head">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
          Certificate Preview
        </div>
        <div class="cert-frame">
          <iframe src="${certViewUrl}" title="Certificate"></iframe>
        </div>
        <div class="print-row">
          <button class="btn btn-primary" onclick="var w=window.open('${certViewUrl}','_blank');w.addEventListener('load',function(){w.print()})">Print / Download PDF</button>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="footer">
  <span>Learnova — Learn, Achieve, Grow</span>
  <a href="${CLIENT_URL}">Visit Learnova</a>
</div>

<style>@media print{.header,.actions,.print-row,.footer,.badge-row{display:none!important}.main{padding:0}.grid{display:block}.grid>div:first-child{display:none}.panel{border:none;box-shadow:none}.cert-frame{padding:0}.cert-frame iframe{height:100vh;box-shadow:none;border-radius:0}}</style>
</body></html>`;
};

export const listMyCertificates = async (userId: number) => {
  return prisma.certificate.findMany({
    where: { userId },
    orderBy: { issuedAt: 'desc' },
    include: {
      course: { select: { id: true, title: true, coverImage: true } },
    },
  });
};
