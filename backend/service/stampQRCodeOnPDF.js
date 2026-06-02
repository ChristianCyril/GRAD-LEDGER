import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import fs from 'fs';

export const stampQRCodeOnPDF = async (filePath, certId, orgName) => {
  const qrUrl    = `${process.env.CLIENT_URL}/verify/${certId}`;
  const qrBuffer = await QRCode.toBuffer(qrUrl, {
    width:  200,
    margin: 1,
    color:  { dark: '#1a1a2e', light: '#ffffff' },
  });

  const pdfBytes = fs.readFileSync(filePath);
  const pdfDoc   = await PDFDocument.load(pdfBytes);

  const { width, height } = pdfDoc.getPages()[0].getSize();
  const isLandscape        = width > height;
  const cx                 = width / 2;
  const cy                 = height / 2;

  const fontBold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const NAVY = rgb(0.10, 0.10, 0.18);
  const GOLD = rgb(0.83, 0.68, 0.21);
  const GREY = rgb(0.45, 0.45, 0.45);
  const LIGHT_GREY = rgb(0.92, 0.92, 0.92);
  const WHITE = rgb(1, 1, 1);

  const page = pdfDoc.addPage([width, height]);

  // ── Full white background ──────────────────────────────────────────────────

  page.drawRectangle({
    x: 0, y: 0, width, height,
    color: WHITE,
  });

  // ── Top border bar ─────────────────────────────────────────────────────────

  page.drawRectangle({
    x: 0, y: height - (isLandscape ? 8 : 10),
    width, height: isLandscape ? 8 : 10,
    color: NAVY,
  });

  // Gold accent line below top bar
  page.drawRectangle({
    x: 0, y: height - (isLandscape ? 12 : 15),
    width, height: isLandscape ? 4 : 5,
    color: GOLD,
  });

  // ── Bottom border bar ──────────────────────────────────────────────────────

  page.drawRectangle({
    x: 0, y: 0,
    width, height: isLandscape ? 8 : 10,
    color: NAVY,
  });

  // Gold accent line above bottom bar
  page.drawRectangle({
    x: 0, y: isLandscape ? 8 : 10,
    width, height: isLandscape ? 4 : 5,
    color: GOLD,
  });

  // ── Platform name — top left ───────────────────────────────────────────────

  page.drawText('GRAD-LEDGER', {
    x:    isLandscape ? 30 : 24,
    y:    height - (isLandscape ? 38 : 46),
    size: isLandscape ? 11 : 10,
    font: fontBold,
    color: NAVY,
  });

  // ── "Certificate Verification" — top right ─────────────────────────────────

  const verLabel  = 'Certificate Verification';
  const verSize   = isLandscape ? 10 : 9;
  const verLabelW = fontRegular.widthOfTextAtSize(verLabel, verSize);

  page.drawText(verLabel, {
    x:    width - verLabelW - (isLandscape ? 30 : 24),
    y:    height - (isLandscape ? 38 : 46),
    size: verSize,
    font: fontRegular,
    color: GREY,
  });

  // ── Horizontal rule below header text ─────────────────────────────────────

  page.drawRectangle({
    x:      isLandscape ? 30 : 24,
    y:      height - (isLandscape ? 52 : 62),
    width:  width - (isLandscape ? 60 : 48),
    height: 0.75,
    color:  LIGHT_GREY,
  });

  // ── QR code ────────────────────────────────────────────────────────────────

  const qrImage = await pdfDoc.embedPng(qrBuffer);
  const qrSize  = isLandscape ? 150 : 170;

  if (isLandscape) {

    // ── LANDSCAPE layout: QR left | text right ─────────────────────────────

    const qrX = cx - qrSize - 50;
    const qrY = cy - qrSize / 2;

    // Subtle border around QR
    page.drawRectangle({
      x:           qrX - 12,
      y:           qrY - 12,
      width:       qrSize + 24,
      height:      qrSize + 24,
      color:       WHITE,
      borderColor: LIGHT_GREY,
      borderWidth: 1,
    });

    page.drawImage(qrImage, {
      x: qrX, y: qrY, width: qrSize, height: qrSize,
    });

    // Scan prompt below QR
    const scanText  = 'Scan to verify';
    const scanSize  = 8;
    const scanW     = fontRegular.widthOfTextAtSize(scanText, scanSize);
    page.drawText(scanText, {
      x:    qrX + (qrSize / 2) - (scanW / 2),
      y:    qrY - 26,
      size: scanSize,
      font: fontRegular,
      color: GREY,
    });

    // ── Right side text ───────────────────────────────────────────────────

    const textX    = cx + 30;
    const maxWidth = cx - 55;
    let   cursorY  = cy + 90;

    // Org name
    page.drawText(orgName, {
      x: textX, y: cursorY,
      size: 16,
      font: fontBold,
      color: NAVY,
      maxWidth,
    });
    cursorY -= 22;

    // Gold underline beneath org name
    page.drawRectangle({
      x: textX, y: cursorY,
      width: maxWidth * 0.6, height: 2,
      color: GOLD,
    });
    cursorY -= 22;

    // Description
    const descLines = [
      'This certificate has been officially issued',
      'and its authenticity is recorded and verifiable.',
      'Scan the QR code or use the details below.',
    ];
    descLines.forEach((line) => {
      page.drawText(line, {
        x: textX, y: cursorY,
        size: 9, font: fontRegular, color: GREY,
      });
      cursorY -= 15;
    });

    cursorY -= 12;

    // Certificate ID label
    page.drawText('CERTIFICATE ID', {
      x: textX, y: cursorY,
      size: 7, font: fontBold, color: GOLD,
    });
    cursorY -= 14;

    // Certificate ID value
    page.drawText(certId, {
      x: textX, y: cursorY,
      size: 7.5, font: fontRegular, color: NAVY,
      maxWidth,
    });
    cursorY -= 22;

    // Verify URL label
    page.drawText('VERIFY ONLINE', {
      x: textX, y: cursorY,
      size: 7, font: fontBold, color: GOLD,
    });
    cursorY -= 14;

    // Verify URL value
    page.drawText(qrUrl, {
      x: textX, y: cursorY,
      size: 7.5, font: fontRegular, color: NAVY,
      maxWidth,
    });

  } else {

    // ── PORTRAIT layout: everything centred, QR on top ─────────────────────

    let cursorY = cy + qrSize / 2 + 60;

    // Org name centred
    const orgNameSize = 18;
    const orgNameW    = fontBold.widthOfTextAtSize(orgName, orgNameSize);
    page.drawText(orgName, {
      x:    cx - orgNameW / 2,
      y:    cursorY,
      size: orgNameSize,
      font: fontBold,
      color: NAVY,
    });
    cursorY -= 18;

    // Gold underline centred
    const underlineW = Math.min(orgNameW, width * 0.5);
    page.drawRectangle({
      x:      cx - underlineW / 2,
      y:      cursorY,
      width:  underlineW,
      height: 2,
      color:  GOLD,
    });
    cursorY -= 30;

    // QR border card centred
    const qrX = cx - qrSize / 2;
    const qrY = cursorY - qrSize;

    page.drawRectangle({
      x:           qrX - 14,
      y:           qrY - 14,
      width:       qrSize + 28,
      height:      qrSize + 28,
      color:       WHITE,
      borderColor: LIGHT_GREY,
      borderWidth: 1,
    });

    page.drawImage(qrImage, {
      x: qrX, y: qrY, width: qrSize, height: qrSize,
    });
    cursorY = qrY - 32;

    // Scan prompt
    const scanText = 'Scan to verify this certificate';
    const scanW    = fontRegular.widthOfTextAtSize(scanText, 9);
    page.drawText(scanText, {
      x: cx - scanW / 2, y: cursorY,
      size: 9, font: fontRegular, color: GREY,
    });
    cursorY -= 30;

    // Divider
    page.drawRectangle({
      x: cx - 80, y: cursorY,
      width: 160, height: 0.75,
      color: LIGHT_GREY,
    });
    cursorY -= 20;

    // Certificate ID label
    const idLabel  = 'CERTIFICATE ID';
    const idLabelW = fontBold.widthOfTextAtSize(idLabel, 7);
    page.drawText(idLabel, {
      x: cx - idLabelW / 2, y: cursorY,
      size: 7, font: fontBold, color: GOLD,
    });
    cursorY -= 14;

    // Certificate ID value
    const idW = fontRegular.widthOfTextAtSize(certId, 7.5);
    page.drawText(certId, {
      x: cx - idW / 2, y: cursorY,
      size: 7.5, font: fontRegular, color: NAVY,
    });
    cursorY -= 24;

    // Verify URL label
    const urlLabel  = 'VERIFY ONLINE';
    const urlLabelW = fontBold.widthOfTextAtSize(urlLabel, 7);
    page.drawText(urlLabel, {
      x: cx - urlLabelW / 2, y: cursorY,
      size: 7, font: fontBold, color: GOLD,
    });
    cursorY -= 14;

    // Verify URL value
    const urlW = fontRegular.widthOfTextAtSize(qrUrl, 7.5);
    page.drawText(qrUrl, {
      x: cx - urlW / 2, y: cursorY,
      size: 7.5, font: fontRegular, color: NAVY,
    });
  }

  // ── Save and overwrite temp file ───────────────────────────────────────────

  const stampedBytes = await pdfDoc.save();
  fs.writeFileSync(filePath, stampedBytes);
};