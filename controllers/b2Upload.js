import AWS from 'aws-sdk';
import { User } from '../models/user.js';
import { Video } from '../models/b2Upload.js';
import { transporter } from '../utils/mailer.js';
import generateEmailTemplate from '../utils/emailTemplate.js';

const s3 = new AWS.S3({
  accessKeyId: process.env.B2_ACCESS_KEY_ID,
  secretAccessKey: process.env.B2_SECRET_ACCESS_KEY,
  endpoint: process.env.B2_ENDPOINT,
  region: process.env.B2_REGION,
  signatureVersion: 'v4',
});

export const getB2SignedUrl = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { fileName, fileType } = req.body;
    if (!fileName || !fileType) {
      return res.status(400).json({ error: 'Missing fileName or fileType' });
    }

    const key = `uploads/${Date.now()}_${fileName}`;

    const params = {
      Bucket: process.env.B2_BUCKET_NAME,
      Key: key,
      Expires: 600, // 10 mins
      ContentType: fileType,
    };

    const signedUrl = await s3.getSignedUrlPromise('putObject', params);

    res.status(200).json({ signedUrl, key });
  } catch (err) {
    console.error('❌ Signed URL Error:', err);
    res.status(500).json({ error: 'Failed to generate signed URL' });
  }
};
export const saveB2Metadata = async (req, res) => {
  try {
    const { originalFileName, key, quality, lengthInSeconds } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Generate signed URL
    const signedUrl = s3.getSignedUrl('getObject', {
      Bucket: process.env.B2_BUCKET_NAME,
      Key: key,
      Expires: 60 * 60 * 24 * 7, // 7 days
    });

    // Save video metadata to DB
    const savedVideo = await Video.create({
      user: user._id,
      originalFileName,
      b2Url: signedUrl,
      lengthInSeconds,
      quality,
    });

    // Email HTML
    const emailHtml = generateEmailTemplate({
      firstName: user.firstName || "there",
      subject: '🎉 Your Video Upload was Successful!',
      content: `
        <p style="color:#fff;">Hi ${user.firstName},</p>
        <p style="color:#fff;">Your video <strong>${originalFileName}</strong> has been successfully uploaded.</p>
        <p style="color:#fff;">We'll begin converting it to 3D shortly. You will receive another email once it's done.</p>
        <p style="color:#fff;">You can download/view the original file here:</p>
        <a href="${signedUrl}" style="color: #FF5722;">${signedUrl}</a>
      `,
    });

    await transporter.sendMail({
      from: `"Xclusive 3D" <${process.env.ADMIN_EMAIL}>`,
      to: user.email,
      subject: '✅ Your Video is Uploaded – Xclusive 3D',
      html: emailHtml,
    });

    console.log(`📩 Email sent to ${user.email} for video: ${originalFileName}`);

    return res.status(200).json({
      success: true,
      videoId: savedVideo._id,
      videoUrl: signedUrl,
    });
  } catch (err) {
    console.error("❌ Metadata error:", err);
    res.status(500).json({ error: 'Metadata save failed' });
  }
};
export const getAllUploads = async (req, res) => {
  try {
    const videos = await Video.find();

    return res.status(200).json({
      success: true,
      count: videos.length,
      videos,
    });
  } catch (error) {
    console.error("❌ Error fetching uploads:", error);
    return res.status(500).json({ error: 'Failed to fetch uploads' });
  }
};
export const deleteUpload = async (req, res) => {
  try {
    const videoId = req.params.id;

    const video = await Video.findOne({ _id: videoId });
    if (!video) return res.status(404).json({ error: 'Video not found' });

    const fullUrl = video.b2Url;
    const url = new URL(fullUrl);
    const key = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;

    console.log('🗝️ Deleting key from B2:', key);

    const deleteResult = await s3.deleteObject({
      Bucket: process.env.B2_BUCKET_NAME,
      Key: key,
    }).promise();

    console.log('🧹 S3 delete response:', deleteResult); // Usually empty if success

    await Video.deleteOne({ _id: videoId });

    return res.status(200).json({ success: true, message: 'Video deleted successfully' });
  } catch (error) {
    console.error("❌ Delete error:", error);
    return res.status(500).json({ error: 'Failed to delete video' });
  }
};
export const deleteAllUserVideos = async (req, res) => {
  try {
    const { id: userId } = req.params; // ✅ match route param name
    console.log("UserID:", userId);

    const videos = await Video.find({ user: userId });
    if (!videos.length) return res.status(404).json({ error: 'No videos found for this user' });

    for (const video of videos) {
      if (video.b2Url) {
        const url = new URL(video.b2Url);
        const key = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;

        console.log('🗝️ Deleting key from B2:', key);
        await s3.deleteObject({
          Bucket: process.env.B2_BUCKET_NAME,
          Key: key,
        }).promise();
      }
    }

    await Video.deleteMany({ user: userId });

    return res.status(200).json({ success: true, message: 'All videos deleted for user' });
  } catch (error) {
    console.error("❌ Bulk delete error:", error);
    return res.status(500).json({ error: 'Failed to delete videos for user' });
  }
};

export const getAllUploadsAuthenticated = async (req, res) => {
  try {
    const { since, status } = req.query;
    const query = {};

    // Optional: filter by creation time
    if (since) {
      query.createdAt = { $gte: new Date(since) };
    }

    // Optional: filter by status
    if (status) {
      query.status = status;
    }

    const videos = await Video.find(query).sort({ createdAt: -1 });

    // No need to re-sign URLs — just return what's in DB
    const formattedVideos = videos.map((video) => ({
      _id: video._id,
      user: video.user,
      originalFileName: video.originalFileName,
      b2Url: video.b2Url,
      status: video.status,
      createdAt: video.createdAt,
    }));

    return res.status(200).json({
      success: true,
      count: videos.length,
      videos: videos,
    });
  } catch (error) {
    console.error("❌ Error fetching uploads:", error);
    return res.status(500).json({ success: false, message: 'Failed to fetch uploads' });
  }
};

export const uploadToB2 = async (req, res) => {
  try {
    const file = req.file;
       const { lengthInSeconds, quality } = req.body;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const uniqueFileName = `uploads/${Date.now()}_${file.originalname}`;

    const uploadParams = {
      Bucket: process.env.B2_BUCKET_NAME,
      Key: uniqueFileName,
      Body: file.buffer, // From memory storage
      ContentType: file.mimetype,
    };

    const result = await s3.upload(uploadParams).promise();

    const signedUrl = s3.getSignedUrl('getObject', {
      Bucket: process.env.B2_BUCKET_NAME,
      Key: uniqueFileName,
      Expires: 60 * 60 * 24 * 7, // 7 days
    });

    const savedVideo = await Video.create({
      user: user._id,
      originalFileName: file.originalname,
      b2Url: signedUrl,
       lengthInSeconds,
      quality,
    });

    const emailHtml = generateEmailTemplate({
      firstName: user.firstName || "there",
      subject: '🎉 Your Video Upload was Successful!',
      content: `
        <p style="color:#fff;">Hi ${user.firstName},</p>
        <p style="color:#fff;">Your video <strong>${file.originalname}</strong> has been successfully uploaded.</p>
        <p style="color:#fff;">We'll begin converting it to 3D shortly. You will receive another email once it's done.</p>
        <p style="color:#fff;">You can download/view the original file here:</p>
        <a href="${signedUrl}" style="color: #FF5722;">${signedUrl}</a>
      `,
    });

    await transporter.sendMail({
      from: `"Xclusive 3D" <${process.env.ADMIN_EMAIL}>`,
      to: user.email,
      subject: '✅ Your Video is Uploaded – Xclusive 3D',
      html: emailHtml,
    });

    console.log(`📩 Email sent to ${user.email} for video: ${file.originalname}`);

    return res.status(200).json({
      success: true,
      videoId: savedVideo._id,
      videoUrl: signedUrl,
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    return res.status(500).json({ error: 'Upload failed' });
  }
};
