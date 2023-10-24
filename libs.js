require('dotenv').config();
const { S3Client, ListObjectsCommand, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const Jimp = require('jimp');

// List files in a directory
async function fileList(directoryPath, debug) {
  const CDN_ENDPOINT = process.env.CDN_ENDPOINT || '';
  const CDN_ACCESSKEY = process.env.CDN_ACCESSKEY || '';
  const CDN_SECRETKEY = process.env.CDN_SECRETKEY || '';
  const CDN_BUCKET = process.env.CDN_BUCKET || '';

  if (!CDN_ENDPOINT || !CDN_ACCESSKEY || !CDN_SECRETKEY) {
    if (debug) console.error('CDN > Config error. Parameter required not found.');
    return { error: true, message: 'Config error. Parameter required not found.' };
  }

  const s3Client = new S3Client({
    region: 'sa-east-1',
    credentials: {
      accessKeyId: CDN_ACCESSKEY,
      secretAccessKey: CDN_SECRETKEY,
    },
  });

  const params = {
    Bucket: CDN_BUCKET,
    Prefix: directoryPath,
  };

  try {
    const data = await s3Client.send(new ListObjectsCommand(params));
    if (debug) console.log('CDN > Files listed successfully !', data.Contents);
    const files = data.Contents.map((file) => file.Key);
    return { success: true, files };
  } catch (err) {
    if (debug) console.error('CDN > List files error: ' + err.message);
    return { error: true, message: 'List files error: ' + err.message };
  }
}

// File Upload to CDN
async function fileUpload(fileFullName, fileContent, fileExtRequired, fileContentType, debug) {
  const CDN_ENDPOINT = process.env.CDN_ENDPOINT || '';
  const CDN_ACCESSKEY = process.env.CDN_ACCESSKEY || '';
  const CDN_SECRETKEY = process.env.CDN_SECRETKEY || '';
  const CDN_BUCKET = process.env.CDN_BUCKET || '';
  const CDN_URL = process.env.CDN_URL || '';

  if (!CDN_ENDPOINT || !CDN_ACCESSKEY || !CDN_SECRETKEY) {
    if (debug) console.error('CDN > Config error. Parameter required not found.');
    return { error: true, message: 'Config error. Parameter required not found.' };
  }

  const s3Client = new S3Client({
    region: 'nyc3',
    credentials: {
      accessKeyId: CDN_ACCESSKEY,
      secretAccessKey: CDN_SECRETKEY,
    },
  });

  var fileExt = fileFullName.split('.').pop();
  if (debug) console.log('CDN > File extensions : ', fileExt);

  const fileExtArr = fileExtRequired.length
    ? fileExtRequired
    : ['jpg', 'gif', 'jpeg', 'bmp', 'doc', 'pdf', 'xml', 'docx', 'xlsx', 'txt'];

  if (debug) console.log('CDN > Extensions permitted', fileExtArr);

  const blnExtPermitted = fileExtArr.includes(fileExt);
  if (debug) console.log('CDN > Permitted : ', blnExtPermitted);

  if (!blnExtPermitted) {
    if (debug) console.error("CDN > File extension '" + fileExt + "' prohibited.");
    return { error: true, message: "File extension '" + fileExt + "' prohibited." };
  } else {
    if (debug) console.log("CDN > File extension '" + fileExt + "' permitted.");
  }

  try {
    const image = await Jimp.read(Buffer.from(fileContent, 'base64'));
    const buffer = await image.quality(50).getBuffer(Jimp.MIME_JPEG);
    fileContent = buffer;
  } catch (error) {
    console.error('An error occurred when rotating the file: ' + error.message);
  }

  const params = {
    Bucket: CDN_BUCKET,
    Body: fileContent,
    Key: fileFullName,
    ACL: 'public-read',
    ContentType: fileContentType || 'image/jpeg',
  };

  try {
    if (debug) console.log('CDN > Uploading file...');
    const data = await s3Client.send(new PutObjectCommand(params));
    if (debug) console.log('CDN > File uploaded successfully !', data);

    const url = CDN_URL + fileFullName;
    return { success: true, url };
  } catch (err) {
    if (debug) console.error('CDN > Upload error : ' + err.message);
    return { error: true, message: 'Upload error : ' + err.message };
  }
}

// File Delete from CDN
async function fileDel(fileFullName, debug) {
  const CDN_ENDPOINT = process.env.CDN_ENDPOINT || '';
  const CDN_ACCESSKEY = process.env.CDN_ACCESSKEY || '';
  const CDN_SECRETKEY = process.env.CDN_SECRETKEY || '';
  const CDN_BUCKET = process.env.CDN_BUCKET || '';

  if (!CDN_ENDPOINT || !CDN_ACCESSKEY || !CDN_SECRETKEY) {
    if (debug) console.error('CDN > Config error. Parameter required not found.');
    return { error: true, message: 'Config error. Parameter required not found.' };
  }

  const s3Client = new S3Client({
    region: 'sa-east-1',
    credentials: {
      accessKeyId: CDN_ACCESSKEY,
      secretAccessKey: CDN_SECRETKEY,
    },
  });

  const params = {
    Bucket: CDN_BUCKET,
    Key: fileFullName,
  };

  try {
    if (debug) console.log('CDN > Deleting file ' + fileFullName + '...');
    const data = await s3Client.send(new DeleteObjectCommand(params));
    if (debug) console.log('CDN > File deleted successfully !', data);
    return { success: true };
  } catch (err) {
    if (debug) console.error('CDN > Delete error : ' + err.message);
    return { error: true, message: 'Delete error : ' + err.message };
  }
}

// File read and return data
async function fileRead(file, type, compression, width, height) {
  var fileData = '';

  if (file) {
    let { buffer, size, path } = file;

    if (size > 0) {
      if (compression < 100) {
        try {
          const image = await Jimp.read(path);
          const buffer = await image
            .scaleToFit(width, height)
            .quality(compression)
            .getBuffer(
              type == 'jpg' ? Jimp.MIME_JPEG : type == 'png' ? Jimp.MIME_PNG : type == 'gif' ? Jimp.MIME_GIF : Jimp.MIME_JPEG
            );
          fileData = buffer;
        } catch (err) {
          console.error('Error during image processing: ' + err.message);
        }
      } else {
        fileData = buffer;
      }
    }
  }

  return fileData;
}

module.exports = {
  fileUpload,
  fileDel,
  fileRead,
  fileList,
};
