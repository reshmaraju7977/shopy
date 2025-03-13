const cloudinary = require('cloudinary').v2;


cloudinary.config({
    cloud_name: process.env.cloudinary_Config_Cloud_Name,
    api_key: process.env.cloudinary_Config_api_key,
    api_secret: process.env.cloudinary_Config_api_secret
});

let pLimit;
(async () => {
    pLimit = (await import('p-limit')).default;
})();

module.exports = cloudinary;