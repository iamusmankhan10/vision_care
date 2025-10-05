// Vercel Serverless Function for Products API with Neon PostgreSQL
import { neon } from '@neondatabase/serverless';

// Initialize Neon database connection
const sql = neon(process.env.DATABASE_URL);

// CORS headers - Allow all origins for API access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Credentials': 'false'
};

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  // Add CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res);
      case 'PUT':
        return await handlePut(req, res);
      case 'DELETE':
        return await handleDelete(req, res);
      default:
        return res.status(405).json({ 
          success: false, 
          error: 'Method not allowed' 
        });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

// GET - Fetch all products
async function handleGet(req, res) {
  try {
    // Ensure products table exists with all required columns
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        original_price DECIMAL(10,2),
        category VARCHAR(100),
        brand VARCHAR(100),
        material VARCHAR(100),
        shape VARCHAR(100),
        color VARCHAR(100),
        size VARCHAR(50),
        image TEXT,
        gallery TEXT,
        description TEXT,
        features TEXT,
        specifications TEXT,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        framecolor VARCHAR(100),
        style VARCHAR(100),
        rim VARCHAR(100),
        gender VARCHAR(50),
        type VARCHAR(100),
        featured BOOLEAN DEFAULT false,
        bestseller BOOLEAN DEFAULT false,
        sizes TEXT,
        lenstypes TEXT,
        discount DECIMAL(5,2),
        colorimages TEXT
      )
    `;

    // Add missing columns if they don't exist (for existing tables)
    try {
      await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS framecolor VARCHAR(100)`;
      await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS style VARCHAR(100)`;
      await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS rim VARCHAR(100)`;
      await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS gender VARCHAR(50)`;
      await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS type VARCHAR(100)`;
      await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false`;
      await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS bestseller BOOLEAN DEFAULT false`;
      await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS sizes TEXT`;
      await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS lenstypes TEXT`;
      await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS discount DECIMAL(5,2)`;
      await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS colorimages TEXT`;
    } catch (alterError) {
      console.log('Note: Some columns may already exist:', alterError.message);
    }

    // Ensure comments table exists
    await sql`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        comment TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Check for specific product ID in query
    const { id, search, category } = req.query;
    
    if (id) {
      // Get single product
      const result = await sql`SELECT * FROM products WHERE id = ${id}`;
      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }
      return res.json({
        success: true,
        data: result[0]
      });
    }
    
    if (search) {
      // Search products
      const result = await sql`
        SELECT * FROM products 
        WHERE name ILIKE ${`%${search}%`} 
        OR category ILIKE ${`%${search}%`}
        OR brand ILIKE ${`%${search}%`}
        ORDER BY created_at DESC
      `;
      
      return res.json({
        success: true,
        data: result,
        count: result.length,
        query: search
      });
    }
    
    if (category) {
      // Get products by category
      const result = await sql`
        SELECT * FROM products 
        WHERE category ILIKE ${`%${category}%`}
        ORDER BY created_at DESC
      `;
      
      return res.json({
        success: true,
        data: result,
        count: result.length,
        category
      });
    }
    
    // Get all products
    const result = await sql`SELECT * FROM products ORDER BY created_at DESC`;
    
    return res.json({
      success: true,
      data: result,
      count: result.length,
      source: 'neon'
    });
    
  } catch (error) {
    throw error;
  }
}

// POST - Create new product
async function handlePost(req, res) {
  try {
    const {
      name,
      price,
      original_price,
      category,
      brand,
      material,
      shape,
      color,
      size,
      image,
      gallery,
      description,
      features,
      specifications,
      status = 'active',
      framecolor,
      style,
      rim,
      gender,
      type,
      featured = false,
      bestseller = false,
      sizes,
      lenstypes,
      discount,
      colorimages
    } = req.body;
    
    console.log('📦 Creating product:', name);
    console.log('💰 Price:', price);
    console.log('📂 Category:', category);
    
    // Insert new product with all fields
    const result = await sql`
      INSERT INTO products (
        name, price, original_price, category, brand, material, 
        shape, color, size, image, gallery, description, 
        features, specifications, status, framecolor, style, rim,
        gender, type, featured, bestseller, sizes, lenstypes,
        discount, colorimages
      ) VALUES (
        ${name}, ${price}, ${original_price}, ${category}, ${brand}, 
        ${material}, ${shape}, ${color}, ${size}, ${image}, 
        ${gallery}, ${description}, ${features}, ${specifications}, ${status},
        ${framecolor}, ${style}, ${rim}, ${gender}, ${type}, ${featured},
        ${bestseller}, ${sizes}, ${lenstypes}, ${discount}, ${colorimages}
      ) RETURNING *
    `;
    
    console.log('✅ Product created successfully:', result[0].name);
    
    return res.status(201).json({
      success: true,
      data: result[0],
      message: 'Product created successfully'
    });
    
  } catch (error) {
    console.error('❌ Error creating product:', error);
    throw error;
  }
}

// PUT - Update product
async function handlePut(req, res) {
  try {
    const { id } = req.query;
    const {
      name,
      price,
      original_price,
      category,
      brand,
      material,
      shape,
      color,
      size,
      image,
      gallery,
      description,
      features,
      specifications,
      status,
      framecolor,
      style,
      rim,
      gender,
      type,
      featured,
      bestseller,
      sizes,
      lenstypes,
      discount,
      colorimages
    } = req.body;
    
    // Update product with all fields
    const result = await sql`
      UPDATE products SET 
        name = ${name},
        price = ${price},
        original_price = ${original_price},
        category = ${category},
        brand = ${brand},
        material = ${material},
        shape = ${shape},
        color = ${color},
        size = ${size},
        image = ${image},
        gallery = ${gallery},
        description = ${description},
        features = ${features},
        specifications = ${specifications},
        status = ${status},
        framecolor = ${framecolor},
        style = ${style},
        rim = ${rim},
        gender = ${gender},
        type = ${type},
        featured = ${featured},
        bestseller = ${bestseller},
        sizes = ${sizes},
        lenstypes = ${lenstypes},
        discount = ${discount},
        colorimages = ${colorimages},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    
    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    return res.json({
      success: true,
      data: result[0],
      message: 'Product updated successfully'
    });
    
  } catch (error) {
    throw error;
  }
}

// DELETE - Delete product
async function handleDelete(req, res) {
  try {
    const { id } = req.query;
    
    console.log('🗑️ DELETE request received for product ID:', id);
    console.log('🗑️ ID type:', typeof id);
    console.log('🗑️ Full query params:', req.query);
    
    if (!id) {
      console.log('❌ No ID provided in DELETE request');
      return res.status(400).json({
        success: false,
        error: 'Product ID is required'
      });
    }
    
    // First check if product exists
    console.log('🔍 Checking if product exists...');
    const existingProduct = await sql`SELECT * FROM products WHERE id = ${id}`;
    
    if (existingProduct.length === 0) {
      console.log('❌ Product not found for deletion:', id);
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        message: 'Product not found'
      });
    }
    
    console.log('📦 Found product to delete:', existingProduct[0].name);
    
    // Delete product
    console.log('🗑️ Deleting product from database...');
    const result = await sql`
      DELETE FROM products 
      WHERE id = ${id} 
      RETURNING *
    `;
    
    console.log('✅ Product deleted successfully:', result[0].name);
    
    return res.json({
      success: true,
      message: 'Product deleted successfully',
      data: result[0]
    });
    
  } catch (error) {
    console.error('❌ Error in handleDelete:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    throw error;
  }
}
