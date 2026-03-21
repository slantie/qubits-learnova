export const TEMPLATE_KEY = 'elegant-dark';
export const TEMPLATE_NAME = 'Elegant Dark';

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
<body style="margin:0;padding:40px;background:#0a0a0a;font-family:'Georgia','Times New Roman',serif;">
<div style="max-width:900px;margin:0 auto;background:linear-gradient(160deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);border-radius:12px;padding:60px 50px;position:relative;overflow:hidden;box-shadow:0 12px 48px rgba(0,0,0,0.4);">

  <!-- Subtle pattern overlay -->
  <div style="position:absolute;inset:0;opacity:0.03;background-image:repeating-linear-gradient(45deg,#fff 0px,#fff 1px,transparent 1px,transparent 20px);pointer-events:none;"></div>

  <!-- Glowing accent circles -->
  <div style="position:absolute;top:-60px;right:-60px;width:250px;height:250px;border-radius:50%;background:radial-gradient(circle,rgba(233,196,106,0.15),transparent 70%);pointer-events:none;"></div>
  <div style="position:absolute;bottom:-40px;left:-40px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(233,196,106,0.1),transparent 70%);pointer-events:none;"></div>

  <!-- Content -->
  <div style="position:relative;z-index:1;">

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:8px;">
      <span style="font-size:11px;letter-spacing:8px;text-transform:uppercase;color:#e9c46a;font-weight:bold;font-family:'Segoe UI',Arial,sans-serif;">&#9670; Learnova &#9670;</span>
    </div>

    <!-- Title -->
    <div style="text-align:center;margin:24px 0 40px;">
      <h1 style="font-size:14px;letter-spacing:6px;text-transform:uppercase;color:rgba(255,255,255,0.5);margin:0 0 12px;font-weight:normal;font-family:'Segoe UI',Arial,sans-serif;">Certificate of</h1>
      <h2 style="font-size:48px;color:#e9c46a;margin:0;font-weight:normal;font-style:italic;letter-spacing:3px;">Excellence</h2>
    </div>

    <!-- Divider -->
    <div style="width:120px;height:1px;background:linear-gradient(to right,transparent,#e9c46a,transparent);margin:0 auto 40px;"></div>

    <!-- Presented to -->
    <div style="text-align:center;">
      <p style="font-size:13px;color:rgba(255,255,255,0.45);margin:0 0 12px;letter-spacing:3px;text-transform:uppercase;font-family:'Segoe UI',Arial,sans-serif;">Presented to</p>
      <h3 style="font-size:40px;color:#ffffff;margin:0 0 8px;font-weight:normal;">${data.recipientName}</h3>
      <div style="width:260px;height:1px;background:#e9c46a;margin:0 auto;"></div>
    </div>

    <!-- Description -->
    <div style="text-align:center;margin:30px 0;">
      <p style="font-size:15px;color:rgba(255,255,255,0.65);margin:0 0 12px;line-height:1.8;">
        for outstanding completion of
      </p>
      <p style="font-size:24px;color:#ffffff;margin:0 0 20px;font-weight:bold;font-style:italic;">&ldquo;${data.courseName}&rdquo;</p>

      <!-- Stats -->
      <div style="display:inline-flex;gap:30px;padding:16px 32px;border:1px solid rgba(233,196,106,0.2);border-radius:8px;background:rgba(0,0,0,0.2);">
        <div style="text-align:center;">
          <p style="margin:0;font-size:22px;color:#e9c46a;font-weight:bold;">${data.points}</p>
          <p style="margin:2px 0 0;font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;font-family:'Segoe UI',Arial,sans-serif;">Points</p>
        </div>
        <div style="width:1px;background:rgba(233,196,106,0.2);"></div>
        <div style="text-align:center;">
          <p style="margin:0;font-size:14px;color:#ffffff;">${data.issueDate}</p>
          <p style="margin:2px 0 0;font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;font-family:'Segoe UI',Arial,sans-serif;">Issued</p>
        </div>
      </div>
    </div>

    <!-- Divider -->
    <div style="width:120px;height:1px;background:linear-gradient(to right,transparent,#e9c46a,transparent);margin:30px auto;"></div>

    <!-- Verification -->
    <div style="text-align:center;">
      <div style="display:inline-flex;align-items:center;gap:10px;padding:12px 24px;border:1px solid rgba(233,196,106,0.25);border-radius:8px;background:rgba(0,0,0,0.25);">
        <span style="font-size:16px;color:#e9c46a;">&#10003;</span>
        <span style="font-size:11px;color:rgba(255,255,255,0.5);letter-spacing:1px;">VERIFIED</span>
        <span style="font-size:11px;color:rgba(255,255,255,0.25);">|</span>
        <a href="${data.verifyUrl}" style="font-size:11px;color:#e9c46a;text-decoration:none;letter-spacing:1px;" target="_blank">Verify Certificate</a>
      </div>
      <p style="font-size:9px;color:rgba(255,255,255,0.2);letter-spacing:2px;margin:12px 0 0;">CERT-${data.certificateId}</p>
    </div>
  </div>

</div>
</body>
</html>`;
}
