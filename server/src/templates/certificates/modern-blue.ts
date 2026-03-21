export const TEMPLATE_KEY = 'modern-blue';
export const TEMPLATE_NAME = 'Modern Blue';

export function render(data: {
  recipientName: string;
  courseName: string;
  issueDate: string;
  certificateId: string;
  points: number;
  verifyUrl: string;
  logoUrl: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:40px;background:#eef2f7;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
<div style="max-width:900px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(37,99,235,0.08);">

  <!-- Top accent bar -->
  <div style="height:6px;background:linear-gradient(90deg,#2563eb,#7c3aed,#2563eb);"></div>

  <!-- Header band -->
  <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);padding:40px 50px;position:relative;overflow:hidden;">
    <div style="position:absolute;top:-30px;right:-30px;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,0.05);"></div>
    <div style="position:absolute;bottom:-50px;left:50px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,0.03);"></div>
    <img src="${data.logoUrl}" alt="Learnova" style="height:32px;object-fit:contain;filter:brightness(0) invert(1);margin-bottom:12px;display:block;" />
    <h1 style="margin:0;font-size:32px;color:#ffffff;font-weight:300;letter-spacing:1px;">Certificate of Completion</h1>
  </div>

  <!-- Body -->
  <div style="padding:50px;">

    <p style="font-size:14px;color:#6b7280;margin:0 0 8px;text-transform:uppercase;letter-spacing:2px;font-weight:600;">Awarded to</p>
    <h2 style="font-size:38px;color:#1e3a5f;margin:0 0 30px;font-weight:700;line-height:1.2;">${data.recipientName}</h2>

    <p style="font-size:15px;color:#4b5563;margin:0 0 10px;line-height:1.8;">
      For successfully completing the course
    </p>
    <div style="background:#f0f4ff;border-left:4px solid #2563eb;border-radius:0 8px 8px 0;padding:16px 20px;margin:0 0 30px;">
      <p style="margin:0;font-size:20px;color:#1e3a5f;font-weight:600;">${data.courseName}</p>
    </div>

    <!-- Stats row -->
    <div style="display:flex;gap:20px;margin:0 0 40px;">
      <div style="flex:1;background:#f8fafc;border-radius:12px;padding:20px;text-align:center;border:1px solid #e5e7eb;">
        <p style="margin:0 0 4px;font-size:28px;font-weight:700;color:#7c3aed;">${data.points}</p>
        <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Points Earned</p>
      </div>
      <div style="flex:1;background:#f8fafc;border-radius:12px;padding:20px;text-align:center;border:1px solid #e5e7eb;">
        <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#1e3a5f;">${data.issueDate}</p>
        <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Issue Date</p>
      </div>
    </div>

    <!-- Verification -->
    <div style="background:#f0f4ff;border-radius:12px;padding:20px;display:flex;align-items:center;gap:16px;border:1px solid #dbeafe;">
      <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#2563eb,#7c3aed);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <span style="color:#fff;font-size:20px;">&#10003;</span>
      </div>
      <div style="flex:1;">
        <p style="margin:0 0 2px;font-size:13px;font-weight:600;color:#1e3a5f;">Verified Certificate</p>
        <p style="margin:0;font-size:11px;color:#6b7280;">ID: ${data.certificateId}</p>
      </div>
      <a href="${data.verifyUrl}" style="font-size:12px;color:#2563eb;font-weight:600;text-decoration:none;white-space:nowrap;" target="_blank">Verify &rarr;</a>
    </div>

  </div>

  <!-- Bottom accent -->
  <div style="height:4px;background:linear-gradient(90deg,#2563eb,#7c3aed,#2563eb);"></div>
</div>
</body>
</html>`;
}
