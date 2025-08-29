// emailTemplate.js// emailTemplate.js
const generateEmailTemplate = ({
  firstName = '',
  subject = 'Xclusive 3D',
  content = '',
  logoUrl = 'https://res.cloudinary.com/daflot6fo/image/upload/v1752739979/Xclusive_3d_white_sj9d1l.png',
  siteUrl = 'https://frontend-3d-exclusive.vercel.app/'
}) => {
  return `
    <div style="font-family:Arial, sans-serif; max-width:600px; margin:auto;background: linear-gradient(135deg, #00005d 0%, #0700d3 50%, #a000ff 100%); color:#fff; border-radius:12px; overflow:hidden; box-shadow:0 0 15px rgba(0,0,0,0.1);">
      
      <div style="text-align:center; padding:30px 20px 10px;">
        <img src="${logoUrl}" alt="Xclusive 3D Logo" style="width:130px;" />
        <h1 style="margin:15px 0 0; font-size:24px; font-weight:600; letter-spacing:1px;color: #fff;">${subject}</h1>
      </div>

      <div style="padding:25px 30px; color:#fff; font-size:15px; line-height:1.6;">
        ${content}
      </div>

      <div style="text-align:center; margin-top:20px; padding-bottom:30px;">
      <a href="${siteUrl}">  <img src="${logoUrl}" alt="Logo" style="width:95px;  margin-top:20px;" /> </a>
        <p style="font-size:13px; color:#bbb; margin-top:10px;">Powered by Xclusive 3D</p>
      </div>
    </div>
  `;
};

export default generateEmailTemplate;
