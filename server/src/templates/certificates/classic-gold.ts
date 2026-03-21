export const TEMPLATE_KEY = 'classic-gold';
export const TEMPLATE_NAME = 'Classic Gold';

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
<body style="margin:0;padding:40px;background:#f5f0e8;font-family:'Georgia','Times New Roman',serif;">
<div style="max-width:900px;margin:0 auto;background:#fffef9;border:3px solid #c9a84c;border-radius:4px;padding:60px 50px;position:relative;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- Double border effect -->
  <div style="position:absolute;inset:8px;border:1px solid #c9a84c;border-radius:2px;pointer-events:none;"></div>

  <!-- Corner ornaments -->
  <div style="position:absolute;top:16px;left:16px;width:40px;height:40px;border-top:3px solid #c9a84c;border-left:3px solid #c9a84c;"></div>
  <div style="position:absolute;top:16px;right:16px;width:40px;height:40px;border-top:3px solid #c9a84c;border-right:3px solid #c9a84c;"></div>
  <div style="position:absolute;bottom:16px;left:16px;width:40px;height:40px;border-bottom:3px solid #c9a84c;border-left:3px solid #c9a84c;"></div>
  <div style="position:absolute;bottom:16px;right:16px;width:40px;height:40px;border-bottom:3px solid #c9a84c;border-right:3px solid #c9a84c;"></div>

  <!-- Header -->
  <div style="text-align:center;margin-bottom:10px;">
    <div style="font-size:11px;letter-spacing:6px;text-transform:uppercase;color:#c9a84c;font-weight:bold;">Learnova Academy</div>
  </div>

  <!-- Divider -->
  <div style="display:flex;align-items:center;gap:16px;margin:20px 0 30px;">
    <div style="flex:1;height:1px;background:linear-gradient(to right,transparent,#c9a84c);"></div>
    <div style="font-size:24px;color:#c9a84c;">&#9733;</div>
    <div style="flex:1;height:1px;background:linear-gradient(to left,transparent,#c9a84c);"></div>
  </div>

  <!-- Title -->
  <div style="text-align:center;">
    <h1 style="font-size:42px;color:#2c2418;margin:0 0 6px;font-weight:normal;letter-spacing:2px;">Certificate of Completion</h1>
    <p style="font-size:14px;color:#8a7a5e;margin:0;letter-spacing:3px;text-transform:uppercase;">This is to certify that</p>
  </div>

  <!-- Recipient -->
  <div style="text-align:center;margin:30px 0;">
    <p style="font-size:36px;color:#2c2418;margin:0;font-style:italic;border-bottom:2px solid #c9a84c;display:inline-block;padding:0 30px 8px;">${data.recipientName}</p>
  </div>

  <!-- Body -->
  <div style="text-align:center;margin:20px 0 30px;">
    <p style="font-size:15px;color:#5a4e3a;margin:0 0 8px;line-height:1.7;">
      has successfully completed the course
    </p>
    <p style="font-size:22px;color:#2c2418;margin:0 0 16px;font-weight:bold;">&ldquo;${data.courseName}&rdquo;</p>
    <p style="font-size:14px;color:#8a7a5e;margin:0;">
      with <strong style="color:#c9a84c;">${data.points} points</strong> earned
    </p>
  </div>

  <!-- Divider -->
  <div style="display:flex;align-items:center;gap:16px;margin:30px 0;">
    <div style="flex:1;height:1px;background:linear-gradient(to right,transparent,#c9a84c);"></div>
    <div style="font-size:24px;color:#c9a84c;">&#9733;</div>
    <div style="flex:1;height:1px;background:linear-gradient(to left,transparent,#c9a84c);"></div>
  </div>

  <!-- Footer -->
  <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:20px;">
    <div style="text-align:center;min-width:200px;">
      <div style="border-top:1px solid #c9a84c;padding-top:8px;">
        <p style="margin:0;font-size:14px;color:#2c2418;">${data.issueDate}</p>
        <p style="margin:2px 0 0;font-size:11px;color:#8a7a5e;text-transform:uppercase;letter-spacing:1px;">Date of Issue</p>
      </div>
    </div>
    <div style="text-align:center;">
      <div style="width:64px;height:64px;border:2px solid #c9a84c;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 6px;">
        <span style="font-size:18px;color:#c9a84c;">&#10003;</span>
      </div>
      <p style="font-size:9px;color:#b3a68a;margin:0;letter-spacing:1px;">VERIFIED</p>
    </div>
    <div style="text-align:center;min-width:200px;">
      <div style="border-top:1px solid #c9a84c;padding-top:8px;">
        <p style="margin:0;font-size:14px;color:#2c2418;">Learnova</p>
        <p style="margin:2px 0 0;font-size:11px;color:#8a7a5e;text-transform:uppercase;letter-spacing:1px;">Platform</p>
      </div>
    </div>
  </div>

  <!-- Verification -->
  <div style="text-align:center;margin-top:30px;padding-top:20px;border-top:1px solid rgba(201,168,76,0.3);">
    <p style="font-size:10px;color:#b3a68a;margin:0 0 6px;letter-spacing:2px;">Certificate ID: ${data.certificateId}</p>
    <a href="${data.verifyUrl}" style="font-size:11px;color:#c9a84c;text-decoration:none;letter-spacing:1px;" target="_blank">&#128279; Verify this certificate</a>
  </div>

</div>
</body>
</html>`;
}
