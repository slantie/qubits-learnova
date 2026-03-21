export const TEMPLATE_KEY = 'nature-green';
export const TEMPLATE_NAME = 'Nature Green';

export function render(data: {
  recipientName: string;
  courseName: string;
  issueDate: string;
  certificateId: string;
  points: number;
  verifyUrl: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:40px;background:#f0f7f0;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
<div style="max-width:900px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(22,101,52,0.08);">

  <!-- Top gradient banner -->
  <div style="height:120px;background:linear-gradient(135deg,#166534 0%,#15803d 40%,#22c55e 100%);position:relative;overflow:hidden;">
    <div style="position:absolute;top:-20px;left:60px;width:100px;height:100px;border-radius:50%;border:2px solid rgba(255,255,255,0.1);"></div>
    <div style="position:absolute;top:20px;left:120px;width:60px;height:60px;border-radius:50%;border:2px solid rgba(255,255,255,0.08);"></div>
    <div style="position:absolute;bottom:-30px;right:80px;width:140px;height:140px;border-radius:50%;border:2px solid rgba(255,255,255,0.07);"></div>
    <div style="position:absolute;top:30px;right:200px;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.05);"></div>

    <div style="position:relative;z-index:1;padding:30px 50px;">
      <p style="margin:0 0 4px;font-size:11px;letter-spacing:5px;text-transform:uppercase;color:rgba(255,255,255,0.7);font-weight:600;">Learnova</p>
      <h1 style="margin:0;font-size:28px;color:#ffffff;font-weight:300;letter-spacing:0.5px;">Certificate of Achievement</h1>
    </div>
  </div>

  <!-- Body -->
  <div style="padding:50px;">

    <!-- Recipient -->
    <div style="margin:0 0 35px;">
      <p style="font-size:12px;color:#6b7280;margin:0 0 8px;text-transform:uppercase;letter-spacing:3px;font-weight:600;">This certifies that</p>
      <h2 style="font-size:36px;color:#166534;margin:0;font-weight:700;">${data.recipientName}</h2>
      <div style="width:80px;height:3px;background:linear-gradient(to right,#22c55e,#86efac);border-radius:2px;margin-top:12px;"></div>
    </div>

    <!-- Course -->
    <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:12px;padding:24px;margin:0 0 30px;border:1px solid #bbf7d0;">
      <p style="font-size:13px;color:#4b5563;margin:0 0 6px;">has successfully completed the course</p>
      <p style="font-size:22px;color:#166534;margin:0;font-weight:700;">${data.courseName}</p>
    </div>

    <!-- Achievement cards -->
    <div style="display:flex;gap:16px;margin:0 0 40px;">
      <div style="flex:1;text-align:center;padding:20px 16px;border-radius:12px;border:1px solid #d1fae5;background:#f0fdf4;">
        <div style="width:40px;height:40px;border-radius:50%;background:#dcfce7;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;">
          <span style="font-size:18px;">&#11088;</span>
        </div>
        <p style="margin:0;font-size:24px;font-weight:700;color:#166534;">${data.points}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Points Earned</p>
      </div>
      <div style="flex:1;text-align:center;padding:20px 16px;border-radius:12px;border:1px solid #d1fae5;background:#f0fdf4;">
        <div style="width:40px;height:40px;border-radius:50%;background:#dcfce7;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;">
          <span style="font-size:18px;">&#128197;</span>
        </div>
        <p style="margin:0;font-size:14px;font-weight:700;color:#166534;">${data.issueDate}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Issue Date</p>
      </div>
    </div>

    <!-- Verification -->
    <div style="background:#f0fdf4;border-radius:12px;padding:20px;display:flex;align-items:center;gap:16px;border:1px solid #bbf7d0;">
      <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#166534,#22c55e);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <span style="color:#fff;font-size:20px;">&#10003;</span>
      </div>
      <div style="flex:1;">
        <p style="margin:0 0 2px;font-size:13px;font-weight:600;color:#166534;">Verified Certificate</p>
        <p style="margin:0;font-size:11px;color:#6b7280;">ID: ${data.certificateId}</p>
      </div>
      <a href="${data.verifyUrl}" style="font-size:12px;color:#166534;font-weight:600;text-decoration:none;white-space:nowrap;" target="_blank">Verify &rarr;</a>
    </div>

  </div>

  <!-- Bottom bar -->
  <div style="height:4px;background:linear-gradient(90deg,#166534,#22c55e,#166534);"></div>
</div>
</body>
</html>`;
}
