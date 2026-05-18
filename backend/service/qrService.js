import QRCode from 'qrcode';

export const generateQRCode = async (certId) => {
  const url = `${process.env.CLIENT_URL}/verify/${certId}`;
  return await QRCode.toDataURL(url);
};