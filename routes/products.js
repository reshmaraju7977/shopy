const { Category } = require('../models/category.js');
const { Product } = require('../models/product.js');
const express = require('express');
const router = express.Router();

const cloudinary = require('cloudinary').v2;

const multer = require('multer');
const fs = require('fs')

var imagesArr=[];

const storage = multer.diskStorage({

    destination: function (req, file, cb) {
        cb(null, "uploads");
    },
    filename: function (req,file, cb) {
        cb(null,`${Date.now()}_${file.originalname}`);
    },
})

const upload = multer({ storage: storage })

router.post(`/upload`, upload.array("images"), async (req,res) =>{
    imagesArr=[];
    const files = req.files;

    for(let i=0; i<files.length; i++){
        imagesArr.push(files[i].filename);
    }

    res.send({images:imagesArr});
});

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.cloudinary_Config_Cloud_Name,
    api_key: process.env.cloudinary_Config_api_key,
    api_secret: process.env.cloudinary_Config_api_secret
});

// Dynamic import of p-limit
let pLimit;
(async () => {
    pLimit = (await import('p-limit')).default;
})();

router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const perPage = 5;
        const totalPosts = await Category.countDocuments();
        const totalPages = Math.ceil(totalPosts / perPage);

        if (page > totalPages) {
            return res.status(404).json({ message: 'Page not found' });
        }

        const productList = await Product.find().populate("category")
            .skip((page - 1) * perPage)
            .limit(perPage)
            .exec();

        if (productList.length === 0) {
            return res.status(500).json({ success: false, message: 'No products found' });
        }

        return res.status(200).json({
            "products":productList,
            "totalPages":totalPages,
            "page":page
        });

        res.status(200).json(productList);

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/create', async (req, res) => {
    try {
        const category = await Category.findById(req.body.category);
        if (!category) {
            return res.status(404).json({ message: "Invalid Category!" });
        }

        // Ensure pLimit is available before processing images
        if (!pLimit) {
            return res.status(500).json({
                error: "pLimit not loaded yet",
                success: false
            });
        }

        let imgurl = [];
        if (req.body.images && req.body.images.length > 0) {
            const limit = pLimit(2);  // Set concurrency limit

            const imagesupload = req.body.images.map((image) => {
                return limit(async () => {
                    const result = await cloudinary.uploader.upload(image);
                    console.log(`Successfully uploaded ${image}`);
                    return result;
                });
            });

            const uploadStatus = await Promise.all(imagesupload);
            imgurl = uploadStatus.map((item) => item.secure_url);

            if (!uploadStatus.length) {
                return res.status(500).json({
                    error: "Images could not be uploaded",
                    status: false
                });
            }
        }

        let product = new Product({
            name: req.body.name,
            description: req.body.description,
            images: imagesArr,
            brand: req.body.brand,
            price: req.body.price,
            oldPrice: req.body.oldPrice,
            category: req.body.category,
            countInStock: req.body.countInStock,
            rating: req.body.rating,
        //    numReviews: req.body.numReviews,
            isFeatured: req.body.isFeatured,
        });

        product = await product.save();

        res.status(201).json(product);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            error: err.message,
            success: false
        });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(200).json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.delete('/:id', async (req, res) => {

    const product = await Product.findById(req.params.id);
    const images = product.images

    if(images.length!==0){
        for(image of images){
            fs.unlinkSync(`uploads/${image}`);
        }
    }
    try {
        const deleteProduct = await Product.findByIdAndDelete(req.params.id);
        if (!deleteProduct) {
            return res.status(404).json({
                message: "Product not found",
                status: false
            });
        }
        res.status(200).json({
            message: "Product deleted successfully",
            status: true
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});



router.put('/:id', async (req, res) => {
    try {
        // Ensure pLimit is available before processing images
        if (!pLimit) {
            return res.status(500).json({
                error: "pLimit not loaded yet",
                success: false
            });
        }

        let imgurl = [];
        if (req.body.images && req.body.images.length > 0) {
            const limit = pLimit(2);  // Set concurrency limit

            const imagesupload = req.body.images.map((image) => {
                return limit(async () => {
                    const result = await cloudinary.uploader.upload(image);
                    console.log(`Successfully uploaded ${image}`);
                    return result;
                });
            });

            const uploadStatus = await Promise.all(imagesupload);
            imgurl = uploadStatus.map((item) => item.secure_url);

            if (!uploadStatus.length) {
                return res.status(500).json({
                    error: "Images could not be uploaded",
                    status: false
                });
            }
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            {
                name: req.body.name,
                description: req.body.description,
                images: imgurl,
                brand: req.body.brand,
                price: req.body.price,
                category: req.body.category,
                countInStock: req.body.countInStock,
                rating: req.body.rating,
                numReviews: req.body.numReviews,
                isFeatured: req.body.isFeatured,
            },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({
                message: 'Product cannot be updated',
                status: false
            });
        }

        res.status(200).json({
            message: 'Product updated successfully',
            status: true
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            error: err.message,
            success: false
        });
    }
});

module.exports = router;
