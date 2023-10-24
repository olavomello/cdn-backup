const {
  fileUpload,
  fileDel,
  fileRead,
  fileList
} = require('./libs.js');

// List files
async function init(){
  
  // Get file tree from CDN
  const FILES = await fileList("/");

  console.log("Return : FILES", FILES);

  FILES.map((file, i) => {
    console.log("File : ", file);
  });
}

// init
init();