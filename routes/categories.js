// const { Category } = require('../models/category');
// const express = require('express');
// const router = express.Router();
// const cloudinary = require('cloudinary').v2;
// const multer = require('multer');
// const fs = require('fs')

// var imagesArr=[];

// const storage = multer.diskStorage({

//     destination: function (req, file, cb) {
//         cb(null, "uploads");
//     },
//     filename: function (req,file, cb) {
//         cb(null,`${Date.now()}_${file.originalname}`);
//     },
// })

// const upload = multer({ storage: storage })

// router.post(`/upload`, upload.array("images"), async (req,res) =>{
//     imagesArr=[];
//     const files = req.files;

//     for(let i=0; i<files.length; i++){
//         imagesArr.push(files[i].filename);
//     }

//     res.send({images:imagesArr});
// });


// cloudinary.config({
//     cloud_name: process.env.cloudinary_Config_Cloud_Name,
//     api_key: process.env.cloudinary_Config_api_key,
//     api_secret: process.env.cloudinary_Config_api_secret
// });

// // Dynamic import of p-limit
// let pLimit;
// (async () => {
//     pLimit = (await import('p-limit')).default;
// })();

// router.get('/', async (req, res) => {
//     try {
//         const page = parseInt(req.query.page) || 1;
//         const perPage = 10;
//         const totalPosts = await Category.countDocuments();
//         const totalPages = Math.ceil(totalPosts / perPage);

//         if (page > totalPages) {
//             return res.status(404).json({ message: "Page not found" });
//         }

//         const categoryList = await Category.find()
//             .skip((page - 1) * perPage)
//             .limit(perPage)
//             .exec();

//         if (categoryList.length === 0) {
//             return res.status(500).json({ success: false, message: 'No categories found' });
//         }
        
//         return res.status(200).json({
//             categoryList,
//             totalPages,
//             page
//         });
//     } catch (error) {
//         res.status(500).json({ success: false, error });
//     }
// });


// router.get('/:id', async (req, res)=>{
//     const category = await Category.findById(req.params.id);

//     if (!category){
//         res.status(500).json({message: 'The category with the given ID was not found.'})
//     }
//     return res.status(200).send(category);
// });


// router.post('/create', async (req, res) => {
//     try {
//         // Ensure pLimit is available before processing images
//         if (!pLimit) {
//             return res.status(500).json({
//                 error: "pLimit not loaded yet",
//                 success: false
//             });
//         }

//         let imgurl = [];
//         if (req.body.images && req.body.images.length > 0) {
//             const limit = pLimit(2);  // Set concurrency limit

//             const imagesupload = req.body.images.map((image) => {
//                 return limit(async () => {
//                     const result = await cloudinary.uploader.upload(image);
//                     console.log(`Successfully uploaded ${image}`);
//                     return result;
//                 });
//             });

//             const uploadStatus = await Promise.all(imagesupload);
//             imgurl = uploadStatus.map((item) => item.secure_url);

//             if (!uploadStatus.length) {
//                 return res.status(500).json({
//                     error: "Images could not be uploaded",
//                     status: false
//                 });
//             }
//         }


//         let category = new Category({
//             name: req.body.name,
//             images: imagesArr,
//             color: req.body.color
//         });

//         category = await category.save();

//         res.status(201).json(category);

//     } catch (err) {
//         console.error(err.message);
//         res.status(500).json({
//             error: err.message,
//             success: false
//         });
//     }

    
// });

// router.delete('/:id', async (req, res) =>{

//     const category = await Category.findById(req.params.id);
//     const images = category.images

//     if(images.length!==0){
//         for(image of images){
//             fs.unlinkSync(`uploads/${image}`);
//         }
//     }

//     const deletedUser = await Category.findByIdAndDelete(req.params.id);

//     if (!deletedUser){
//         res.status(404).json({
//             message: 'Category not found!',
//             success: false
//         })
//     }

//     res.status(200).json({
//         success:true,
//         message:'Category Deleted!'
//     })
// });

// router.put('/:id', async(req, res) =>{

//     const limit = pLimit(2);  // Set concurrency limit

//         const imagesupload = req.body.images.map((image) => {
//             return limit(async () => {
//                 const result = await cloudinary.uploader.upload(image);
//                 console.log(`Successfully uploaded ${image}`);
//                 return result;
//             });
//         });

//         const uploadStatus = await Promise.all(imagesupload);

//         const imgurl = uploadStatus.map((item) => item.secure_url);

//         if (!uploadStatus.length) {
//             return res.status(500).json({
//                 error: "Images could not be uploaded",
//                 status: false
//             });
//         }

//     const category = await Category.findByIdAndUpdate(
//         req.params.id,
//         {
//             name: req.body.name,
//             images: imgurl,
//             color: req.body.color
//         },

//         {new:true}
//     )

//     if(!category){
//         return res.status(500).json({
//             message:'Category cannot be updated!',
//             success:false
//         })
//     } 

//     res.send(category)
// });

// module.exports = router;


const { Category } = require('../models/category');
const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const fs = require('fs');
const pLimit = require('p-limit');
const dotenv = require('dotenv');


var imagesArr=[];
var categoryEditId;

dotenv.config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    },
});
const upload = multer({ storage });

// Utility function to delete images from Cloudinary
const deleteCloudinaryImages = async (images) => {
    if (images.length) {
        await Promise.all(
            images.map((image) =>
                cloudinary.uploader.destroy(image, (err, result) => {
                    if (err) console.error(`Failed to delete image: ${err}`);
                    return result;
                })
            )
        );
    }
};

// Routes

/**
 * Upload Images
 */
// router.post('/upload', upload.array('images'), async (req, res) => {
//     try {
//         const files = req.files;
//         const imagesArr = files.map((file) => file.filename);

//         res.status(200).json({ images: imagesArr });
//     } catch (error) {
//         res.status(500).json({ error: 'Image upload failed', success: false });
//     }
// });


router.post(`/upload`, upload.array("images"), async (req, res)=>{

    if(categoryEditId!==undefined){
        const category = await Category.findById(categoryEditId);
        const images = category.images;

        if (images.length !== 0){
            for (image of images){
                fs.unlinkSync(`uploads/${image}`);
            }
        }
    }

    imagesArr=[];
    const files = req.files;

    for(let i=0; i<files.length; i++){
        imagesArr.push(files[i].filename)
    }

    res.send(imagesArr);
});
/**
 * Get Paginated Categories
 */
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const perPage = 5;
        const totalPosts = await Category.countDocuments();
        const totalPages = Math.ceil(totalPosts / perPage);

        if (page > totalPages) {
            return res.status(404).json({ message: 'Page not found' });
        }

        const categoryList = await Category.find()
            .skip((page - 1) * perPage)
            .limit(perPage)
            .exec();

        if (categoryList.length === 0) {
            return res.status(404).json({ success: false, message: 'No categories found' });
        }

        res.status(200).json({ categoryList, totalPages, page });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get Single Category
 */
router.get('/:id', async (req, res) => {
    try {
        const categoryEditId = req.params.id; // Store locally
        const category = await Category.findById(categoryEditId);

        if (!category) {
            return res.status(404).json({ message: 'The category with the given ID was not found.' });
        }

        return res.status(200).json({ category, categoryEditId });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});


/**
 * Create Category
 */
router.post('/create', async (req, res) => {
    try {
        const { name, color, images } = req.body;

        let imgurl = [];
        if (images && images.length > 0) {
            const limit = pLimit(2); // Concurrency limit for Cloudinary uploads
            const imageUploadPromises = images.map((image) =>
                limit(async () => {
                    const result = await cloudinary.uploader.upload(image);
                    return result.secure_url;
                })
            );

            imgurl = await Promise.all(imageUploadPromises);
        }

        const category = new Category({
            name,
            color,
            images: imgurl,
        });

        const savedCategory = await category.save();
        res.status(201).json(savedCategory);
    } catch (error) {
        res.status(500).json({ error: error.message, success: false });
    }
});

/**
 * Update Category
 */
router.put('/:id', async (req, res) => {
    try {
        const { name, color, images } = req.body;

        const limit = pLimit(2); // Concurrency limit for Cloudinary uploads
        const imageUploadPromises = images.map((image) =>
            limit(async () => {
                const result = await cloudinary.uploader.upload(image);
                return result.secure_url;
            })
        );

        const imgurl = await Promise.all(imageUploadPromises);

        const updatedCategory = await Category.findByIdAndUpdate(
            req.params.id,
            { name, color, images: imgurl },
            { new: true }
        );

        if (!updatedCategory) {
            return res.status(404).json({ message: 'Category not found', success: false });
        }

        res.status(200).json(updatedCategory);
    } catch (error) {
        res.status(500).json({ error: error.message, success: false });
    }
});

/**
 * Delete Category
 */
// router.delete('/:id', async (req, res) => {
//     try {
//         const category = await Category.findById(req.params.id);

//         if (!category) {
//             return res.status(404).json({ message: 'Category not found', success: false });
//         }

//         // Delete images from Cloudinary
//         if (category.images.length > 0) {
//             await deleteCloudinaryImages(category.images);
//         }

//         await category.remove();
//         res.status(200).json({ success: true, message: 'Category deleted!' });
//     } catch (error) {
//         res.status(500).json({ error: error.message, success: false });
//     }
// });

router.delete('/:id', async (req, res) => {

    const category = await Category.findById(req.params.id);
    const images = category.images

    if(images.length!==0){
        for(image of images){
            fs.unlinkSync(`uploads/${image}`);
        }
    }
    try {
        const deleteCategory = await Category.findByIdAndDelete(req.params.id);
        if (!deleteCategory) {
            return res.status(404).json({
                message: "Category not found",
                status: false
            });
        }
        res.status(200).json({
            message: "Category deleted successfully",
            status: true
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


module.exports = router;
