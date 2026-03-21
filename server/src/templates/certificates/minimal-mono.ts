export const TEMPLATE_KEY = 'minimal-mono';
export const TEMPLATE_NAME = 'Minimal Mono';

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
<body style="margin:0;padding:40px;background:#fafafa;font-family:'Helvetica Neue','Segoe UI',Arial,sans-serif;">
<div style="max-width:900px;margin:0 auto;background:#ffffff;border:1px solid #e5e5e5;border-radius:2px;padding:70px 60px;position:relative;">

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:60px;">
    <div>
      <h1 style="margin:0;font-size:11px;letter-spacing:6px;text-transform:uppercase;color:#171717;font-weight:700;">Learnova</h1>
    </div>
    <div style="text-align:right;">
      <p style="margin:0;font-size:10px;color:#a3a3a3;letter-spacing:2px;text-transform:uppercase;">${data.issueDate}</p>
    </div>
  </div>

  <!-- Title -->
  <div style="margin-bottom:50px;">
    <p style="margin:0 0 4px;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#a3a3a3;font-weight:600;">Certificate of</p>
    <h2 style="margin:0;font-size:48px;color:#171717;font-weight:200;letter-spacing:-1px;line-height:1.1;">Completion</h2>
  </div>

  <!-- Thin line -->
  <div style="height:1px;background:#171717;margin:0 0 40px;"></div>

  <!-- Recipient -->
  <div style="margin-bottom:40px;">
    <p style="margin:0 0 10px;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#a3a3a3;font-weight:600;">Recipient</p>
    <h3 style="margin:0;font-size:32px;color:#171717;font-weight:600;">${data.recipientName}</h3>
  </div>

  <!-- Course -->
  <div style="margin-bottom:40px;">
    <p style="margin:0 0 10px;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#a3a3a3;font-weight:600;">Course</p>
    <p style="margin:0;font-size:20px;color:#171717;font-weight:400;">${data.courseName}</p>
  </div>

  <!-- Metrics -->
  <div style="display:flex;gap:40px;margin-bottom:50px;padding:24px 0;border-top:1px solid #e5e5e5;border-bottom:1px solid #e5e5e5;">
    <div>
      <p style="margin:0 0 4px;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#a3a3a3;font-weight:600;">Points</p>
      <p style="margin:0;font-size:28px;color:#171717;font-weight:300;font-variant-numeric:tabular-nums;">${data.points}</p>
    </div>
    <div style="width:1px;background:#e5e5e5;"></div>
    <div>
      <p style="margin:0 0 4px;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#a3a3a3;font-weight:600;">Date</p>
      <p style="margin:0;font-size:16px;color:#171717;font-weight:400;">${data.issueDate}</p>
    </div>
  </div>

  <!-- Verification -->
  <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border:1px solid #e5e5e5;border-radius:4px;">
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="width:28px;height:28px;border-radius:50%;background:#171717;display:flex;align-items:center;justify-content:center;">
        <span style="color:#fff;font-size:14px;">&#10003;</span>
      </div>
      <div>
        <p style="margin:0;font-size:11px;font-weight:600;color:#171717;">Verified</p>
        <p style="margin:0;font-size:9px;color:#a3a3a3;letter-spacing:2px;font-variant-numeric:tabular-nums;">${data.certificateId}</p>
      </div>
    </div>
    <a href="${data.verifyUrl}" style="font-size:11px;color:#171717;font-weight:600;text-decoration:none;letter-spacing:1px;" target="_blank">VERIFY &rarr;</a>
  </div>

</div>
</body>
</html>`;
}
