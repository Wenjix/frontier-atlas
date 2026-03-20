export function buildOnboardingEmail(params: {
  memberName: string;
  floorName: string;
  floorNumber: string;
  floorDescription: string;
  atlasUrl: string;
}): string {
  const { memberName, floorName, floorNumber, floorDescription, atlasUrl } =
    params;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Frontier Atlas</title>
</head>
<body style="margin:0; padding:0; background-color:#f5f3f0; font-family:Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f3f0;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:8px;">
          <!-- Header -->
          <tr>
            <td style="padding:36px 40px 0 40px;">
              <p style="margin:0; font-size:14px; color:#6b6560; letter-spacing:0.5px;">FRONTIER ATLAS</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:28px 40px 0 40px;">
              <p style="margin:0; font-size:16px; line-height:24px; color:#2d2926;">Hi ${memberName},</p>
            </td>
          </tr>

          <!-- Welcome headline -->
          <tr>
            <td style="padding:20px 40px 0 40px;">
              <h1 style="margin:0; font-size:22px; line-height:30px; font-weight:bold; color:#2d2926;">You're on Floor ${floorNumber} &mdash; ${floorName}</h1>
            </td>
          </tr>

          <!-- Floor description -->
          <tr>
            <td style="padding:16px 40px 0 40px;">
              <p style="margin:0; font-size:16px; line-height:24px; color:#4a4541;">${floorDescription}</p>
            </td>
          </tr>

          <!-- CTA button -->
          <tr>
            <td style="padding:32px 40px 0 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="background-color:#8B6914; border-radius:6px;">
                    <a href="${atlasUrl}" target="_blank" style="display:inline-block; padding:14px 32px; font-size:16px; font-weight:bold; color:#ffffff; text-decoration:none; font-family:Arial, Helvetica, sans-serif;">Set up your profile</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Secondary link -->
          <tr>
            <td style="padding:20px 40px 0 40px;">
              <p style="margin:0; font-size:14px; line-height:22px; color:#6b6560;">
                Or <a href="https://ft0.sh/wiki" target="_blank" style="color:#8B6914; text-decoration:underline;">browse the community wiki</a> to see what your neighbors are working on.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:36px 40px 0 40px;">
              <hr style="border:none; border-top:1px solid #e8e5e1; margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 36px 40px;">
              <p style="margin:0; font-size:13px; line-height:20px; color:#9b9590;">Frontier Atlas &mdash; Navigate Your Building</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
